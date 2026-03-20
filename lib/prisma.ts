import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, isEncryptionEnabled, ENCRYPTED_FIELDS } from "@/lib/encryption";

const basePrisma = new PrismaClient();

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

const encryptedPrisma = basePrisma.$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      if (!isEncryptionEnabled() || !model) return query(args);

      const modelName = getModelName(model);
      if (!modelName || !ENCRYPTED_FIELDS[modelName]) return query(args);

      const mutableArgs = { ...args } as Record<string, unknown>;

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

      return query(mutableArgs).then((result: unknown) => decryptResult(result));
    },
  },
});

const globalForPrisma = globalThis as unknown as { prisma: typeof encryptedPrisma };

export const prisma = globalForPrisma.prisma || encryptedPrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
