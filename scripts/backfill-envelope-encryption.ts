// Backfill the KMS envelope-encrypted columns for every existing row across all encrypted models.
// Walks each model, generates a fresh DEK via KMS, encrypts the row's plaintext fields, and writes
// the *Ciphertext / *Hash / encryptedDek / dekKekVersion columns. Does NOT touch the legacy columns.
//
// Run AFTER kms phase 2 is deployed and verified. Idempotent: rows that already have an
// encryptedDek are skipped unless --force is passed.
//
// Usage (against staging or prod):
//
//   DATABASE_URL=<url> \
//   ENCRYPTION_KEY=<legacy 64-hex key> \
//   AWS_ACCESS_KEY_ID=<the-record-app id> \
//   AWS_SECRET_ACCESS_KEY=<the-record-app secret> \
//   AWS_REGION=us-east-1 \
//   KMS_KEY_ARN=<key arn> \
//     npx tsx scripts/backfill-envelope-encryption.ts [--dry-run] [--force] [--model User,Article,...]
//
// --dry-run    : count what would be backfilled without writing.
// --force      : re-encrypt rows that already have an encryptedDek (e.g., after a hard rotation).
// --model X,Y  : limit to specific models. Default: all encrypted models.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { initEncryption, ENCRYPTED_FIELDS, encryptWithKey, blindIndex } from "../lib/encryption";
import { generateDek, isKmsConfigured } from "../lib/kms";

type Args = { dryRun: boolean; force: boolean; only: Set<string> | null };

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, force: false, only: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--model" && argv[i + 1]) {
      args.only = new Set(argv[i + 1]!.split(","));
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.error("ENCRYPTION_KEY is required (legacy key — used to read existing plaintext via the Prisma extension)");
    process.exit(1);
  }
  if (!isKmsConfigured()) {
    console.error("KMS_KEY_ARN is required; AWS credentials must let it call kms:GenerateDataKey");
    process.exit(1);
  }

  initEncryption(process.env.ENCRYPTION_KEY);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const masked = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, "://***:***@");
  console.log(`DATABASE_URL: ${masked}`);
  console.log(`KMS key:      ${process.env.KMS_KEY_ARN}`);
  console.log(`Mode:         ${args.dryRun ? "DRY RUN (no writes)" : "APPLY"}${args.force ? " + force" : ""}`);
  console.log("");

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [modelName, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    if (args.only && !args.only.has(modelName)) continue;

    console.log(`=== ${modelName} ===`);
    const accessor = (prisma as unknown as Record<string, {
      findMany: (a?: unknown) => Promise<unknown[]>;
      update: (a: unknown) => Promise<unknown>;
    }>)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
    if (!accessor) {
      console.warn(`  (skipping — not on Prisma client)`);
      continue;
    }

    const rows = (await accessor.findMany()) as Record<string, unknown>[];
    console.log(`  ${rows.length} row(s) found`);
    totalScanned += rows.length;

    for (const row of rows) {
      const id = row.id as string;
      if (!id) {
        totalSkipped++;
        continue;
      }
      const hasDek = row.encryptedDek instanceof Buffer && (row.encryptedDek as Buffer).length > 0;
      if (hasDek && !args.force) {
        totalSkipped++;
        continue;
      }

      const ctx = { recordType: modelName, recordId: id };
      try {
        const { dek, wrappedDek, kekVersion } = await generateDek(ctx);
        const update: Record<string, unknown> = {
          encryptedDek: wrappedDek,
          dekKekVersion: kekVersion,
        };
        for (const [field, mode] of Object.entries(fields)) {
          const plaintext = row[field];
          if (typeof plaintext !== "string" || plaintext.length === 0) continue;
          update[`${field}Ciphertext`] = encryptWithKey(plaintext, dek);
          if (mode === "deterministic") {
            update[`${field}Hash`] = blindIndex(plaintext);
          }
        }
        dek.fill(0);

        if (!args.dryRun) {
          await accessor.update({ where: { id }, data: update });
        }
        totalUpdated++;
        if (totalUpdated % 50 === 0) {
          console.log(`  ${totalUpdated} updated...`);
        }
      } catch (err) {
        totalErrors++;
        console.error(`  ${modelName}/${id} error: ${(err as Error).message}`);
      }
    }
    console.log("");
  }

  console.log("Backfill complete:");
  console.log(`  scanned:  ${totalScanned}`);
  console.log(`  updated:  ${totalUpdated}${args.dryRun ? " (would be — dry run)" : ""}`);
  console.log(`  skipped:  ${totalSkipped} (already had encryptedDek)`);
  console.log(`  errors:   ${totalErrors}`);

  await prisma.$disconnect();
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
