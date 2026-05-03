// Read-only encryption diagnostic. Run against any DATABASE_URL (dev or prod):
//
//   DATABASE_URL=<url> ENCRYPTION_KEY=<key> npx tsx scripts/diagnose-encryption.ts
//
// Reports per encrypted field:
//   - count of rows whose stored value still looks like plaintext (no `enc:v1:` prefix)
//   - count of rows whose stored value is properly encrypted
//   - createdAt (or updatedAt) of the most recent plaintext row, if the model has one —
//     this is the load-bearing number, because if the newest plaintext row was written
//     AFTER the encryption library shipped (2026-03-20), encryption isn't actually running
//     in that environment.
//
// Bypasses the Prisma encryption extension on purpose so we read raw stored values.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ENCRYPTED_FIELDS } from "../lib/encryption";

const rawPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ENCRYPTION_LIVE_AT = new Date("2026-03-20T00:00:00Z");
const ROUNDTABLE_LIVE_AT = new Date("2026-04-15T00:00:00Z"); // approx; adjust if you remember exact date

const TIMESTAMP_FIELD: Record<string, string | null> = {
  User: "createdAt",
  Article: "createdAt",
  ArticleCredit: null,
  ArticleImage: null,
  RoundTable: "createdAt",
  RoundTableSide: null,
  RoundTableTurn: null,
};

const PREFIX = "enc:v1:";

type FieldStats = {
  model: string;
  field: string;
  mode: string;
  total: number;
  plaintext: number;
  encrypted: number;
  newestPlaintextAt: Date | null;
  newestPlaintextId: string | null;
};

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const masked = dbUrl.replace(/:\/\/[^@]+@/, "://***:***@");
  console.log(`DATABASE_URL: ${masked}`);
  console.log(
    `ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? "set (length " + process.env.ENCRYPTION_KEY.length + ")" : "NOT SET"}`
  );
  console.log(
    `AWS_SECRETS_MANAGER_KEY_ARN: ${process.env.AWS_SECRETS_MANAGER_KEY_ARN ? "set" : "NOT SET"}`
  );
  console.log("");

  const allStats: FieldStats[] = [];

  for (const [modelName, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    const model = (rawPrisma as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown[]> }>)[
      modelName.charAt(0).toLowerCase() + modelName.slice(1)
    ];
    if (!model) {
      console.warn(`(skipping ${modelName} — not on Prisma client)`);
      continue;
    }
    const tsField = TIMESTAMP_FIELD[modelName] ?? null;
    const rows = (await model.findMany({
      select: {
        id: true,
        ...(tsField ? { [tsField]: true } : {}),
        ...Object.fromEntries(Object.keys(fields).map((f) => [f, true])),
      },
    })) as Record<string, unknown>[];

    for (const [field, mode] of Object.entries(fields)) {
      let plaintext = 0;
      let encrypted = 0;
      let newestPlaintextAt: Date | null = null;
      let newestPlaintextId: string | null = null;
      for (const row of rows) {
        const v = row[field];
        if (typeof v !== "string" || v.length === 0) continue;
        if (v.startsWith(PREFIX)) {
          encrypted++;
        } else {
          plaintext++;
          const ts = tsField ? (row[tsField] as Date | null) : null;
          if (ts && (!newestPlaintextAt || ts > newestPlaintextAt)) {
            newestPlaintextAt = ts;
            newestPlaintextId = row.id as string;
          }
        }
      }
      allStats.push({
        model: modelName,
        field,
        mode,
        total: rows.length,
        plaintext,
        encrypted,
        newestPlaintextAt,
        newestPlaintextId,
      });
    }
  }

  console.log("Per-field results:");
  console.log("");
  console.log(
    [
      "model".padEnd(18),
      "field".padEnd(15),
      "mode".padEnd(14),
      "rows".padStart(7),
      "plaintext".padStart(11),
      "encrypted".padStart(11),
      "newest plaintext",
    ].join(" | ")
  );
  console.log("-".repeat(110));
  for (const s of allStats) {
    console.log(
      [
        s.model.padEnd(18),
        s.field.padEnd(15),
        s.mode.padEnd(14),
        String(s.total).padStart(7),
        String(s.plaintext).padStart(11),
        String(s.encrypted).padStart(11),
        s.newestPlaintextAt
          ? `${s.newestPlaintextAt.toISOString()} (id ${s.newestPlaintextId})`
          : s.plaintext > 0
            ? "(no timestamp on model)"
            : "—",
      ].join(" | ")
    );
  }

  // Verdict
  console.log("");
  const anyPlaintext = allStats.some((s) => s.plaintext > 0);
  const recentPlaintext = allStats.filter(
    (s) => s.newestPlaintextAt && s.newestPlaintextAt > ENCRYPTION_LIVE_AT
  );
  const roundTablePlaintext = allStats.filter(
    (s) => s.model.startsWith("RoundTable") && s.plaintext > 0
  );
  const noKey = !process.env.ENCRYPTION_KEY && !process.env.AWS_SECRETS_MANAGER_KEY_ARN;

  if (noKey) {
    console.log(
      "ℹ️  No ENCRYPTION_KEY or AWS_SECRETS_MANAGER_KEY_ARN set in this environment, so encryption is disabled (passthrough). Plaintext rows are expected."
    );
    console.log(
      "   To diagnose prod, re-run with the prod DATABASE_URL and the prod ENCRYPTION_KEY (or KEY_ARN) set."
    );
  } else if (!anyPlaintext) {
    console.log("✅ No plaintext rows in any encrypted field. Encryption is fully backfilled.");
  } else if (recentPlaintext.length === 0 && roundTablePlaintext.length === 0) {
    console.log(
      "ℹ️  All plaintext rows predate the encryption library (2026-03-20). Run scripts/encrypt-existing-data.ts to backfill."
    );
    console.log(
      "   Command: DATABASE_URL=<url> ENCRYPTION_KEY=<key> npx tsx scripts/encrypt-existing-data.ts"
    );
  } else {
    console.log(
      "⚠️  Plaintext rows exist that were written AFTER the encryption library shipped."
    );
    console.log(
      "   This means the encryption middleware is NOT running in this environment. Backfilling now would only re-plaintext those rows on subsequent edits."
    );
    console.log("   Likely causes:");
    console.log(
      "     - ENCRYPTION_KEY env var not present at runtime (typo, wrong env file, hosting strips it)"
    );
    console.log(
      "     - AWS_SECRETS_MANAGER_KEY_ARN set but the secret fetch fails silently (pre-patch behavior;"
    );
    console.log(
      "       after the lockdown patch this throws on every DB op instead)"
    );
    console.log(
      "     - instrumentation.ts didn't run (Edge runtime path, or app started before instrumentation fired)"
    );
    console.log("   Fix the runtime first, verify by writing one new row, then backfill.");
    console.log("");
    console.log("   Recent plaintext samples:");
    for (const s of recentPlaintext.concat(roundTablePlaintext)) {
      if (s.newestPlaintextAt) {
        console.log(
          `     ${s.model}.${s.field} → newest plaintext row ${s.newestPlaintextId} at ${s.newestPlaintextAt.toISOString()}`
        );
      }
    }
  }
}

main()
  .then(() => rawPrisma.$disconnect())
  .catch(async (e) => {
    console.error("Diagnostic failed:", e);
    await rawPrisma.$disconnect();
    process.exit(1);
  });
