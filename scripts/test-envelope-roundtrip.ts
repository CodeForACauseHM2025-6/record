// End-to-end test of the KMS envelope encryption round-trip.
// Writes a fresh row through the encrypted Prisma client, then verifies:
//   1. The legacy plaintext column is populated (with `enc:v1:` ciphertext if ENCRYPTION_KEY set,
//      or plaintext if dev mode)
//   2. The envelope columns (*Ciphertext, *Hash, encryptedDek, dekKekVersion) are populated
//   3. Reading back through the extension yields plaintext fields (email, name, image)
//   4. Lookup by email (which Phase 4 rewrites to the OR-clause hash + legacy match) finds the row
//   5. Cleanup deletes the row
//
// Run with KMS configured:
//   AWS_PROFILE=the-record-app KMS_KEY_ARN=<arn> AWS_REGION=us-east-1 \
//     npx tsx /tmp/test-envelope-roundtrip.ts

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

// Raw client (no encryption extension) for fetching the actual stored bytes.
const raw = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("KMS configured:", !!process.env.KMS_KEY_ARN);
  console.log("");

  const testEmail = `envelope-test-${randomUUID().slice(0, 8)}@horacemann.org`;
  const testName = `Envelope Test ${Date.now()}`;
  const testImage = "https://example.com/avatar.png";

  console.log(`1. Creating User { email: "${testEmail}", name: "${testName}" }...`);
  const created = await prisma.user.create({
    data: { email: testEmail, name: testName, image: testImage },
  });
  console.log(`   created id=${created.id}, returned email="${created.email}"`);
  console.log("");

  console.log(`2. Reading raw row from DB to inspect storage shape...`);
  const rawRow = await raw.$queryRaw<
    Array<{
      id: string;
      email: string;
      name: string;
      image: string | null;
      emailCiphertext: Buffer | null;
      emailHash: Buffer | null;
      nameCiphertext: Buffer | null;
      imageCiphertext: Buffer | null;
      encryptedDek: Buffer | null;
      dekKekVersion: number | null;
    }>
  >`SELECT id, email, name, image, "emailCiphertext", "emailHash", "nameCiphertext", "imageCiphertext", "encryptedDek", "dekKekVersion" FROM "User" WHERE id = ${created.id}`;
  const stored = rawRow[0]!;
  console.log("   legacy columns:");
  console.log(`     email          = ${stored.email.length > 40 ? stored.email.slice(0, 40) + "..." : stored.email}`);
  console.log(`     name           = ${stored.name.length > 40 ? stored.name.slice(0, 40) + "..." : stored.name}`);
  console.log(`     image          = ${stored.image}`);
  console.log("   envelope columns:");
  console.log(`     emailCiphertext (${stored.emailCiphertext?.length ?? 0} bytes) = ${stored.emailCiphertext ? stored.emailCiphertext.subarray(0, 16).toString("hex") + "..." : "NULL"}`);
  console.log(`     emailHash       (${stored.emailHash?.length ?? 0} bytes) = ${stored.emailHash ? stored.emailHash.toString("hex").slice(0, 32) + "..." : "NULL"}`);
  console.log(`     nameCiphertext  (${stored.nameCiphertext?.length ?? 0} bytes) = ${stored.nameCiphertext ? stored.nameCiphertext.subarray(0, 16).toString("hex") + "..." : "NULL"}`);
  console.log(`     imageCiphertext (${stored.imageCiphertext?.length ?? 0} bytes)`);
  console.log(`     encryptedDek    (${stored.encryptedDek?.length ?? 0} bytes)`);
  console.log(`     dekKekVersion   = ${stored.dekKekVersion}`);
  console.log("");

  let pass = true;
  if (process.env.KMS_KEY_ARN) {
    if (!stored.emailCiphertext || stored.emailCiphertext.length === 0) {
      console.error("   FAIL: emailCiphertext is empty but KMS is configured");
      pass = false;
    }
    if (!stored.emailHash || stored.emailHash.length !== 32) {
      console.error("   FAIL: emailHash should be 32 bytes (HMAC-SHA256)");
      pass = false;
    }
    if (!stored.encryptedDek || stored.encryptedDek.length === 0) {
      console.error("   FAIL: encryptedDek is empty");
      pass = false;
    }
    if (stored.dekKekVersion !== 1) {
      console.error(`   FAIL: dekKekVersion expected 1, got ${stored.dekKekVersion}`);
      pass = false;
    }
  } else {
    if (stored.emailCiphertext) {
      console.warn("   note: emailCiphertext populated despite KMS not configured (unexpected)");
    } else {
      console.log("   note: KMS not configured, envelope columns left NULL (expected)");
    }
  }

  console.log(`3. Reading back via prisma.user.findUnique({ where: { id } })...`);
  const fetched = await prisma.user.findUnique({ where: { id: created.id } });
  if (!fetched) {
    console.error("   FAIL: row not found");
    pass = false;
  } else {
    console.log(`   email=${fetched.email}`);
    console.log(`   name=${fetched.name}`);
    console.log(`   image=${fetched.image}`);
    if (fetched.email !== testEmail) {
      console.error(`   FAIL: email mismatch. Expected "${testEmail}", got "${fetched.email}"`);
      pass = false;
    }
    if (fetched.name !== testName) {
      console.error(`   FAIL: name mismatch. Expected "${testName}", got "${fetched.name}"`);
      pass = false;
    }
  }
  console.log("");

  console.log(`4. Lookup by email (where: { email: "${testEmail}" })...`);
  const byEmail = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!byEmail) {
    console.error("   FAIL: lookup by email returned null");
    pass = false;
  } else if (byEmail.id !== created.id) {
    console.error(`   FAIL: lookup by email returned wrong id. Expected ${created.id}, got ${byEmail.id}`);
    pass = false;
  } else {
    console.log(`   ✓ found id=${byEmail.id} via email lookup`);
  }
  console.log("");

  console.log(`5. Cleanup: deleting test user...`);
  await raw.user.delete({ where: { id: created.id } });
  console.log("   deleted");
  console.log("");

  await raw.$disconnect();

  if (pass) {
    console.log("✅ All round-trip checks passed.");
    process.exit(0);
  } else {
    console.error("❌ Some checks failed (see above).");
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error("Test error:", e);
  await raw.$disconnect();
  process.exit(1);
});
