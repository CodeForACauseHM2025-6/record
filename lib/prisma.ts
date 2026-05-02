import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";
import {
  encrypt,
  decrypt,
  isEncryptionEnabled,
  ENCRYPTED_FIELDS,
  encryptWithKey,
  decryptWithKey,
  blindIndex,
} from "@/lib/encryption";
import { generateDek, unwrapDek, isKmsConfigured } from "@/lib/kms";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const basePrisma = new PrismaClient({ adapter });

export function encryptFields(
  model: string,
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!data || !isEncryptionEnabled()) return data as Record<string, unknown>;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  for (const [field, mode] of Object.entries(fields)) {
    if (field in result && typeof result[field] === "string") {
      result[field] = encrypt(result[field] as string, mode);
    }
  }
  return result;
}

export function encryptWhereClause(
  model: string,
  where: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!where || !isEncryptionEnabled()) return where as Record<string, unknown>;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return where;

  const result = { ...where };

  for (const [key, value] of Object.entries(result)) {
    // Handle deterministic fields directly: { email: "value" }
    if (fields[key] === "deterministic" && typeof value === "string") {
      result[key] = encrypt(value, "deterministic");
    }
    // Handle operator objects: { email: { equals: "value" } }
    else if (fields[key] === "deterministic" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      const encOps = { ...ops };
      if (typeof encOps.equals === "string") encOps.equals = encrypt(encOps.equals, "deterministic");
      if (Array.isArray(encOps.in)) encOps.in = encOps.in.map((v: unknown) => typeof v === "string" ? encrypt(v, "deterministic") : v);
      if (typeof encOps.not === "string") encOps.not = encrypt(encOps.not, "deterministic");
      result[key] = encOps;
    }
    // Handle AND/OR/NOT arrays: { OR: [{ email: "a" }, { email: "b" }] }
    else if ((key === "AND" || key === "OR") && Array.isArray(value)) {
      result[key] = (value as Record<string, unknown>[]).map((clause) =>
        encryptWhereClause(model, clause)
      );
    }
    else if (key === "NOT" && typeof value === "object" && value !== null) {
      result[key] = Array.isArray(value)
        ? (value as Record<string, unknown>[]).map((clause) => encryptWhereClause(model, clause))
        : encryptWhereClause(model, value as Record<string, unknown>);
    }
    // Handle compound unique keys: { articleId_userId_creditRole: { articleId: "...", creditRole: "Writer" } }
    else if (typeof value === "object" && value !== null && !Array.isArray(value) && key.includes("_")) {
      const compound = value as Record<string, unknown>;
      const encCompound = { ...compound };
      for (const [subField, subValue] of Object.entries(encCompound)) {
        if (fields[subField] === "deterministic" && typeof subValue === "string") {
          encCompound[subField] = encrypt(subValue, "deterministic");
        }
      }
      result[key] = encCompound;
    }
  }

  return result;
}

export function decryptResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (typeof result === "string") return decrypt(result);
  if (Array.isArray(result)) return result.map(decryptResult);
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    const decrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        decrypted[key] = decrypt(value);
      } else if (Array.isArray(value)) {
        decrypted[key] = value.map(decryptResult);
      } else if (typeof value === "object" && value !== null) {
        decrypted[key] = decryptResult(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
  return result;
}

function getModelName(model: string | undefined): string | undefined {
  if (!model) return undefined;
  return model.charAt(0).toUpperCase() + model.slice(1);
}

// Phase 4: when a returned row carries a populated `encryptedDek`, decrypt the *Ciphertext
// columns and override the legacy plaintext fields with the envelope-decrypted values. This
// makes the envelope columns the source of truth for any row that has been backfilled (Phase 3)
// or written under dual-write (Phase 2). Rows without `encryptedDek` keep their legacy
// plaintext (which the legacy decryptResult path handles).
async function applyEnvelopeRead(
  modelName: string,
  result: unknown,
): Promise<void> {
  if (!isKmsConfigured() || result == null) return;
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields) return;

  const rows = Array.isArray(result) ? result : [result];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const wrapped = r.encryptedDek;
    if (!(wrapped instanceof Buffer) || wrapped.length === 0) continue;
    const id = r.id;
    if (typeof id !== "string") continue;

    try {
      const ctx: EncryptionContext = { recordType: modelName, recordId: id };
      const dek = await unwrapDek(wrapped, ctx);
      for (const field of Object.keys(fields)) {
        const ct = r[`${field}Ciphertext`];
        if (!(ct instanceof Buffer) || ct.length === 0) continue;
        try {
          r[field] = decryptWithKey(ct, dek);
        } catch (err) {
          console.error(
            `[prisma envelope-read] ${modelName}.${field}/${id} decrypt failed: ${(err as Error).message}`,
          );
        }
      }
      // Note: dek is cached in lib/kms — don't fill(0) here, the cache hands out the same buffer.
    } catch (err) {
      console.error(
        `[prisma envelope-read] ${modelName}/${id} unwrap failed: ${(err as Error).message}`,
      );
    }
  }
}

// Imported here to avoid a forward reference; unused-var lint is satisfied because we reference
// the type below in EncryptionContext.
type EncryptionContext = { recordType: string; recordId: string };

// Phase 4: rewrite where clauses on deterministic-encrypted fields so they match either the
// blind-index hash (new path, populated by dual-write + backfill) OR the legacy deterministic
// ciphertext (rows that pre-date the migration and haven't been backfilled yet). Single query;
// both branches are unique-indexed.
function applyEnvelopeWhere(
  modelName: string,
  where: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!where || !isKmsConfigured()) return where;
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields) return where;

  const result = { ...where };
  for (const [key, value] of Object.entries(result)) {
    if (fields[key] !== "deterministic") continue;
    if (typeof value !== "string") continue;
    // Replace `{ email: "x" }` with `{ OR: [{ emailHash: hash }, { email: "x" }] }`. The legacy
    // branch's value will be encrypted to the deterministic ciphertext by encryptWhereClause()
    // downstream when isEncryptionEnabled() is true.
    const hash = blindIndex(value);
    delete result[key];
    const existingOr = Array.isArray(result.OR) ? (result.OR as Record<string, unknown>[]) : [];
    result.OR = [
      ...existingOr,
      { [`${key}Hash`]: hash },
      { [key]: value },
    ];
  }
  return result;
}

// Phase 2 dual-write: populate the *Ciphertext / *Hash / encryptedDek / dekKekVersion
// columns added in the kms_envelope_phase1 migration. Legacy columns are still written by
// the encryptFields() path below. Reads still come from legacy columns until Phase 4.
//
// Guarantees:
//   - On create: a fresh DEK is generated; ciphertext columns populated for every plaintext
//     present in args.data; encryption context is { recordType, recordId } where recordId is
//     the UUID we explicitly assign so it matches what the row will end up with.
//   - On update/upsert: if the row already has an encryptedDek, we unwrap it and reuse it for
//     consistency with previously-written ciphertext on the same row. If not (row pre-dates
//     this code), we generate a fresh DEK.
//   - Failure path: if KMS is configured but a call fails, we log and skip envelope writes.
//     Legacy writes still succeed; the Phase 3 backfill resolves any inconsistency.
async function applyEnvelopeWrite(
  modelName: string,
  operation: string,
  args: Record<string, unknown>,
): Promise<void> {
  if (!isKmsConfigured()) return;
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields) return;

  if (operation !== "create" && operation !== "update" && operation !== "upsert") return;

  // Locate the data block we need to mutate. For upsert there are separate create/update keys.
  const dataBlocks: Record<string, unknown>[] = [];
  if (operation === "upsert") {
    if (args.create && typeof args.create === "object") dataBlocks.push(args.create as Record<string, unknown>);
    if (args.update && typeof args.update === "object") dataBlocks.push(args.update as Record<string, unknown>);
  } else if (args.data && typeof args.data === "object") {
    dataBlocks.push(args.data as Record<string, unknown>);
  }
  if (dataBlocks.length === 0) return;

  for (const data of dataBlocks) {
    try {
      // Resolve the row id we'll bind the encryption context to.
      let recordId: string | undefined;
      if (typeof data.id === "string") {
        recordId = data.id;
      } else if (operation === "create" || (operation === "upsert" && data === (args.create as unknown))) {
        // Generate up-front so the encryption context matches what Prisma stores.
        recordId = randomUUID();
        data.id = recordId;
      } else {
        // Update path: pull id off the where clause (only direct id targeting supported).
        const where = args.where as Record<string, unknown> | undefined;
        if (where && typeof where.id === "string") recordId = where.id;
      }
      if (!recordId) {
        // Without a stable record id we can't bind encryption context safely. Skip envelope for
        // this write — legacy will still cover it, backfill will sweep it later.
        continue;
      }

      const ctx = { recordType: modelName, recordId };

      // Decide whether to reuse an existing DEK or mint a new one. Update path may have an
      // existing wrapped DEK in the row; reuse it so previously-written ciphertext on the same
      // row stays decryptable.
      let dek: Buffer;
      let wrappedDek: Buffer | null = null;
      let kekVersion: number | null = null;

      if (operation === "update" && args.where) {
        try {
          const existing = (await (basePrisma as unknown as Record<string, { findUnique: (a: unknown) => Promise<unknown> }>)[
            modelName.charAt(0).toLowerCase() + modelName.slice(1)
          ].findUnique({
            where: args.where,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)) as Record<string, unknown> | null;
          if (
            existing &&
            existing.encryptedDek instanceof Buffer &&
            existing.encryptedDek.length > 0
          ) {
            dek = await unwrapDek(existing.encryptedDek as Buffer, ctx);
            wrappedDek = existing.encryptedDek as Buffer;
            kekVersion = (existing.dekKekVersion as number | null) ?? 1;
          } else {
            const fresh = await generateDek(ctx);
            dek = fresh.dek;
            wrappedDek = fresh.wrappedDek;
            kekVersion = fresh.kekVersion;
          }
        } catch {
          const fresh = await generateDek(ctx);
          dek = fresh.dek;
          wrappedDek = fresh.wrappedDek;
          kekVersion = fresh.kekVersion;
        }
      } else {
        const fresh = await generateDek(ctx);
        dek = fresh.dek;
        wrappedDek = fresh.wrappedDek;
        kekVersion = fresh.kekVersion;
      }

      // Encrypt every plaintext field present in this data block.
      for (const [field, mode] of Object.entries(fields)) {
        const plaintext = data[field];
        if (typeof plaintext !== "string") continue;
        data[`${field}Ciphertext`] = encryptWithKey(plaintext, dek);
        if (mode === "deterministic") {
          data[`${field}Hash`] = blindIndex(plaintext);
        }
      }

      if (wrappedDek && kekVersion !== null) {
        // For update we only set encryptedDek if it wasn't already populated; on create we always set it.
        const isFreshDek = !(data.encryptedDek);
        if (isFreshDek) {
          data.encryptedDek = wrappedDek;
          data.dekKekVersion = kekVersion;
        }
      }

      // Wipe the plaintext DEK from memory before this iteration ends.
      dek.fill(0);
    } catch (err) {
      // Soft-fail: legacy write proceeds, backfill resolves inconsistency.
      console.error(
        `[prisma envelope-write] ${modelName}.${operation} skipped envelope path: ${(err as Error).message}`,
      );
    }
  }
}

const encryptedPrisma = basePrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      if (!model) return query(args);

      const modelName = getModelName(model);
      if (!modelName || !ENCRYPTED_FIELDS[modelName]) return query(args);

      const mutableArgs = { ...args } as Record<string, unknown>;

      // Phase 4: rewrite where clauses on deterministic fields to also match the blind-index
      // hash column. Runs BEFORE the legacy where-encryption so both paths are valid.
      if (mutableArgs.where && typeof mutableArgs.where === "object") {
        mutableArgs.where = applyEnvelopeWhere(
          modelName,
          mutableArgs.where as Record<string, unknown>,
        );
      }

      // Phase 2 dual-write: populate envelope-encrypted columns BEFORE the legacy step
      // mutates plaintext into legacy ciphertext. No-op when KMS is not configured.
      await applyEnvelopeWrite(modelName, operation, mutableArgs);

      if (!isEncryptionEnabled()) {
        const result = await query(mutableArgs);
        await applyEnvelopeRead(modelName, result);
        return result;
      }

      // Encrypt where clauses (deterministic fields only)
      if (mutableArgs.where) {
        mutableArgs.where = encryptWhereClause(
          modelName,
          mutableArgs.where as Record<string, unknown>
        );
      }

      // Encrypt data on writes (handle arrays for createMany/updateMany)
      if (mutableArgs.data) {
        if (Array.isArray(mutableArgs.data)) {
          mutableArgs.data = (mutableArgs.data as Record<string, unknown>[]).map(
            (item) => encryptFields(modelName, item)
          );
        } else {
          mutableArgs.data = encryptFields(
            modelName,
            mutableArgs.data as Record<string, unknown>
          );
        }
      }

      // Encrypt create/update in upsert
      if (mutableArgs.create) {
        mutableArgs.create = encryptFields(
          modelName,
          mutableArgs.create as Record<string, unknown>
        );
      }
      if (mutableArgs.update) {
        mutableArgs.update = encryptFields(
          modelName,
          mutableArgs.update as Record<string, unknown>
        );
      }

      const result = await query(mutableArgs);
      // Envelope decryption first (overrides legacy fields when encryptedDek present),
      // then legacy decryptResult() walks any remaining `enc:v1:` strings.
      await applyEnvelopeRead(modelName, result);
      return decryptResult(result);
    },
  },
});

const globalForPrisma = globalThis as unknown as { prisma: typeof encryptedPrisma };

export const prisma = globalForPrisma.prisma || encryptedPrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
