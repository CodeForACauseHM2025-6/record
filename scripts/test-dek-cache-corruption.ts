// Regression test for the DEK cache corruption bug:
//   1. Create a User (extension generates DEK, encrypts fields)
//   2. Read the user back — must decrypt cleanly
//   3. Update the user with a non-encrypted field (triggers the unwrap+wipe path)
//   4. Read the user again — MUST still decrypt cleanly
//
// Before the fix, step 4 fails because step 3's `dek.fill(0)` zeros the cached DEK.
//
// Usage:
//   DATABASE_URL=postgresql://localhost:5432/record_local_prod \
//   npx tsx scripts/test-dek-cache-corruption.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require("../lib/prisma") as typeof import("../lib/prisma");
import { randomUUID } from "crypto";

const TEST_EMAIL = `test-${randomUUID()}@horacemann.org`;

async function main() {
  console.log(`Target: ${process.env.DATABASE_URL}`);
  console.log(`Test email: ${TEST_EMAIL}\n`);

  console.log("Step 1: create user");
  const created = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: "DEK Cache Test User",
      image: "https://example.com/avatar.png",
    } as never,
  });
  console.log(`  ✓ id=${created.id} name="${created.name}" image="${created.image}"`);

  console.log("\nStep 2: read after create");
  const read1 = await prisma.user.findUnique({ where: { id: created.id } });
  console.log(`  name="${read1?.name}" email="${read1?.email}" image="${read1?.image}"`);
  if (!read1?.name || !read1?.email) throw new Error("read after create failed");

  console.log("\nStep 3: update (non-encrypted field — googleImage)");
  await prisma.user.update({
    where: { id: created.id },
    data: { googleImage: "https://lh3.googleusercontent.com/test" },
  });
  console.log("  ✓ updated");

  console.log("\nStep 4: read after update — THIS is where the bug surfaces");
  const read2 = await prisma.user.findUnique({ where: { id: created.id } });
  console.log(`  name="${read2?.name}" email="${read2?.email}" image="${read2?.image}"`);
  if (!read2?.name || !read2?.email) {
    console.log("\n✗ BUG: post-update decrypt returned null/empty for encrypted fields");
    process.exitCode = 1;
  } else {
    console.log("\n✓ Post-update decrypt works. Bug fixed.");
  }

  console.log("\nCleanup: deleting test user");
  await prisma.user.delete({ where: { id: created.id } });
  console.log("  ✓ deleted");
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
