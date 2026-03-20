import { PrismaClient } from "@prisma/client";
import { initEncryption, encrypt, ENCRYPTED_FIELDS } from "../lib/encryption";

const rawPrisma = new PrismaClient();

async function main() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.error("ENCRYPTION_KEY environment variable is required");
    process.exit(1);
  }

  initEncryption(key);
  console.log("Encryption initialized");

  for (const [modelName, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    console.log(`\nProcessing ${modelName}...`);

    const model = (rawPrisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
    const records = await model.findMany();
    let updated = 0;

    for (const record of records) {
      const updates: Record<string, string> = {};

      for (const [field, mode] of Object.entries(fields)) {
        const value = record[field];
        if (typeof value === "string" && !value.startsWith("enc:v1:")) {
          updates[field] = encrypt(value, mode);
        }
      }

      if (Object.keys(updates).length > 0) {
        await model.update({
          where: { id: record.id },
          data: updates,
        });
        updated++;
      }
    }

    console.log(`  ${updated}/${records.length} records encrypted`);
  }

  console.log("\nMigration complete!");
}

main()
  .then(async () => {
    await rawPrisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Migration failed:", e);
    await rawPrisma.$disconnect();
    process.exit(1);
  });
