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

type EncryptionContext = { recordType: string; recordId: string };

// Relation map per model — used to recursively decrypt nested rows that come back via `include`.
// Built manually from prisma/schema.prisma. Keep in sync if you add a relation.
const RELATIONS: Record<string, Record<string, string>> = {
  User: {
    articles: "Article",
    articleCredits: "ArticleCredit",
    approvals: "Approval",
    roundTableSides: "RoundTableSideAuthor",
  },
  Article: {
    createdBy: "User",
    credits: "ArticleCredit",
    images: "ArticleImage",
    group: "ArticleGroup",
    blockSlots: "BlockSlot",
    approvals: "Approval",
  },
  ArticleCredit: { article: "Article", user: "User" },
  ArticleImage: { article: "Article" },
  ArticleGroup: {
    blocks: "LayoutBlock",
    articles: "Article",
    approvals: "Approval",
    roundTables: "RoundTable",
  },
  RoundTable: {
    group: "ArticleGroup",
    sides: "RoundTableSide",
    turns: "RoundTableTurn",
  },
  RoundTableSide: {
    roundTable: "RoundTable",
    authors: "RoundTableSideAuthor",
    turns: "RoundTableTurn",
  },
  RoundTableTurn: { roundTable: "RoundTable", side: "RoundTableSide" },
  RoundTableSideAuthor: { side: "RoundTableSide", user: "User" },
  Approval: { user: "User", article: "Article", group: "ArticleGroup" },
  LayoutBlock: { group: "ArticleGroup", slots: "BlockSlot" },
  BlockSlot: { block: "LayoutBlock", article: "Article" },
};

// Phase 4: when a returned row carries a populated `encryptedDek`, decrypt the *Ciphertext
// columns and override the legacy plaintext fields with the envelope-decrypted values.
// Recursively walks `include`d relations so nested encrypted models (e.g., Article.createdBy)
// also get decrypted, not just the top-level model. Without this, Phase 5's drop of legacy
// columns would surface ciphertext on related records that the legacy decryptResult fallback
// no longer covers.
async function applyEnvelopeRead(
  modelName: string,
  result: unknown,
): Promise<void> {
  if (!isKmsConfigured() || result == null) return;
  if (Array.isArray(result)) {
    for (const item of result) await applyEnvelopeRead(modelName, item);
    return;
  }
  if (typeof result !== "object") return;
  const r = result as Record<string, unknown>;

  const fields = ENCRYPTED_FIELDS[modelName];
  if (fields) {
    const wrapped = r.encryptedDek;
    if (wrapped instanceof Buffer && wrapped.length > 0) {
      const id = r.id;
      if (typeof id === "string") {
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
          // Note: dek is cached in lib/kms — don't fill(0), the cache hands out the same buffer.
        } catch (err) {
          console.error(
            `[prisma envelope-read] ${modelName}/${id} unwrap failed: ${(err as Error).message}`,
          );
        }
      }
    }
  }

  const relations = RELATIONS[modelName];
  if (relations) {
    for (const [relName, relModel] of Object.entries(relations)) {
      if (!(relName in r)) continue;
      await applyEnvelopeRead(relModel, r[relName]);
    }
  }
}

// Phase 4: rewrite where clauses on deterministic-encrypted fields to hit the blind-index hash
// column instead of the legacy column. Hash-only — Phase 4 deployment requires the Phase 3
// backfill to be complete in production so every row has a populated *Hash. Using only the hash
// keeps `findUnique` semantics intact (Prisma rejects `OR` in UniqueWhereInput).
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

    if (typeof value === "string") {
      delete result[key];
      result[`${key}Hash`] = blindIndex(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // operator object: { email: { equals: "x" } } / { in: [...] } / { not: "y" }
      const ops = value as Record<string, unknown>;
      const hashOps: Record<string, unknown> = {};
      if (typeof ops.equals === "string") hashOps.equals = blindIndex(ops.equals);
      if (Array.isArray(ops.in)) {
        hashOps.in = ops.in.map((v: unknown) =>
          typeof v === "string" ? blindIndex(v) : v,
        );
      }
      if (typeof ops.not === "string") hashOps.not = blindIndex(ops.not);
      if (Object.keys(hashOps).length > 0) {
        delete result[key];
        result[`${key}Hash`] = hashOps;
      }
    }
  }
  // Recurse into AND/OR/NOT clauses so nested deterministic predicates are rewritten too.
  if (Array.isArray(result.AND)) {
    result.AND = (result.AND as Record<string, unknown>[]).map((c) =>
      applyEnvelopeWhere(modelName, c) ?? c,
    );
  }
  if (Array.isArray(result.OR)) {
    result.OR = (result.OR as Record<string, unknown>[]).map((c) =>
      applyEnvelopeWhere(modelName, c) ?? c,
    );
  }
  if (result.NOT && typeof result.NOT === "object") {
    if (Array.isArray(result.NOT)) {
      result.NOT = (result.NOT as Record<string, unknown>[]).map((c) =>
        applyEnvelopeWhere(modelName, c) ?? c,
      );
    } else {
      result.NOT = applyEnvelopeWhere(
        modelName,
        result.NOT as Record<string, unknown>,
      );
    }
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
        // Phase 5: legacy plaintext columns are dropped; remove the field so Prisma doesn't try
        // to write to a column that no longer exists. Safe in earlier phases too — the legacy
        // column write happened upstream via encryptFields().
        delete data[field];
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
