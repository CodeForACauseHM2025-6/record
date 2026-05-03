// @ts-nocheck — diagnostic; uses extension's runtime envelope-fill which TS can't see.
// Tests the dashboard's nested-create patterns end-to-end against the Phase 5 schema.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

const raw = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

let pass = true;
function fail(msg: string) {
  console.error(`   FAIL: ${msg}`);
  pass = false;
}

async function main() {
  if (!process.env.KMS_KEY_ARN) throw new Error("KMS_KEY_ARN required");

  console.log("=== nested-create test ===\n");

  // 1. Create users (the editor + writer)
  const editor = await prisma.user.create({
    data: { email: `editor-${randomUUID().slice(0, 8)}@horacemann.org`, name: "Editor", role: "EDITOR" } as never,
  });
  const writer = await prisma.user.create({
    data: { email: `writer-${randomUUID().slice(0, 8)}@horacemann.org`, name: "Writer", role: "WRITER" } as never,
  });
  console.log(`  created users: editor=${editor.id}, writer=${writer.id}`);

  // 2. Create ArticleGroup
  const group = await prisma.articleGroup.create({ data: { name: "Test Issue" } });
  console.log(`  created group: ${group.id}`);

  // 3. Create Article with nested credits + images (dashboard pattern)
  const article = await prisma.article.create({
    data: {
      title: "Nested Create Test",
      slug: `nested-test-${randomUUID().slice(0, 8)}`,
      body: "<p>Body content for nested test.</p>",
      section: "NEWS",
      groupId: group.id,
      createdById: editor.id,
      credits: {
        create: [{ userId: writer.id, creditRole: "Writer" }],
      },
      images: {
        create: [{ url: "https://example.com/img.jpg", altText: "alt", order: 0 }],
      },
    } as never,
    include: {
      credits: { include: { user: true } },
      images: true,
    },
  });
  console.log(`  created article: ${article.id}`);
  console.log(`    body returned: "${article.body?.slice(0, 40) ?? "(null!)"}..."`);
  if (!article.body) fail("article.body should be plaintext on return");
  if (article.credits.length !== 1) fail(`expected 1 credit, got ${article.credits.length}`);
  if (article.credits[0]?.creditRole !== "Writer") fail(`credit.creditRole should be "Writer", got ${JSON.stringify(article.credits[0]?.creditRole)}`);
  if (article.images.length !== 1) fail(`expected 1 image, got ${article.images.length}`);
  if (article.images[0]?.url !== "https://example.com/img.jpg") fail(`image.url should decrypt`);

  // 4. Inspect raw rows — every encrypted row should have envelope columns + NULL legacy
  const rawArticle = (await raw.$queryRaw<any[]>`SELECT id, body, "bodyCiphertext", "encryptedDek" FROM "Article" WHERE id = ${article.id}`)[0];
  console.log(`    raw article.body = ${rawArticle.body ?? "NULL"}, ciphertext = ${rawArticle.bodyCiphertext?.length ?? 0} bytes`);
  if (rawArticle.body !== null) fail(`article.body legacy should be NULL on disk, got ${rawArticle.body}`);
  if (!rawArticle.bodyCiphertext || rawArticle.bodyCiphertext.length === 0) fail("article.bodyCiphertext should be populated");

  const rawCredit = (await raw.$queryRaw<any[]>`SELECT id, "creditRole", "creditRoleCiphertext", "creditRoleHash" FROM "ArticleCredit" WHERE "articleId" = ${article.id}`)[0];
  console.log(`    raw credit.creditRole = ${rawCredit.creditRole ?? "NULL"}, ciphertext = ${rawCredit.creditRoleCiphertext?.length ?? 0} bytes, hash = ${rawCredit.creditRoleHash?.length ?? 0} bytes`);
  if (rawCredit.creditRole !== null) fail(`credit.creditRole legacy should be NULL`);
  if (!rawCredit.creditRoleCiphertext) fail("creditRoleCiphertext missing");
  if (!rawCredit.creditRoleHash) fail("creditRoleHash missing");

  const rawImage = (await raw.$queryRaw<any[]>`SELECT id, url, "altText", "urlCiphertext" FROM "ArticleImage" WHERE "articleId" = ${article.id}`)[0];
  console.log(`    raw image.url = ${rawImage.url ?? "NULL"}, ciphertext = ${rawImage.urlCiphertext?.length ?? 0} bytes`);
  if (rawImage.url !== null) fail("image.url legacy should be NULL");
  if (rawImage.altText !== null) fail("image.altText legacy should be NULL");
  if (!rawImage.urlCiphertext) fail("urlCiphertext missing");

  // 5. RoundTable with nested sides + turns
  const rt = await prisma.roundTable.create({
    data: {
      slug: `rt-${randomUUID().slice(0, 8)}`,
      prompt: "What's the best lunch option?",
      groupId: group.id,
      sides: {
        create: [
          { label: "Side A", order: 0 },
          { label: "Side B", order: 1 },
        ],
      },
    } as never,
    include: { sides: true },
  });
  console.log(`  created round-table: ${rt.id}, prompt="${rt.prompt}"`);
  if (rt.prompt !== "What's the best lunch option?") fail(`rt.prompt didn't decrypt: ${JSON.stringify(rt.prompt)}`);
  if (rt.sides.length !== 2) fail(`expected 2 sides, got ${rt.sides.length}`);
  if (rt.sides[0]?.label !== "Side A") fail(`side[0].label should be "Side A", got ${JSON.stringify(rt.sides[0]?.label)}`);

  // 6. createMany via roundTable.turn
  const sideAId = rt.sides[0]!.id;
  const sideBId = rt.sides[1]!.id;
  await prisma.roundTableTurn.createMany({
    data: [
      { roundTableId: rt.id, sideId: sideAId, body: "First turn from A", order: 0 },
      { roundTableId: rt.id, sideId: sideBId, body: "Second turn from B", order: 1 },
    ] as never,
  });
  const fetchedTurns = await prisma.roundTableTurn.findMany({ where: { roundTableId: rt.id }, orderBy: { order: "asc" } });
  console.log(`  created ${fetchedTurns.length} turns via createMany`);
  console.log(`    turn 0 body: "${fetchedTurns[0]?.body}"`);
  console.log(`    turn 1 body: "${fetchedTurns[1]?.body}"`);
  if (fetchedTurns[0]?.body !== "First turn from A") fail("turn[0].body should decrypt");
  if (fetchedTurns[1]?.body !== "Second turn from B") fail("turn[1].body should decrypt");

  // 7. cleanup
  console.log("\n  cleanup...");
  await raw.roundTableTurn.deleteMany({ where: { roundTableId: rt.id } });
  await raw.roundTableSide.deleteMany({ where: { roundTableId: rt.id } });
  await raw.roundTable.delete({ where: { id: rt.id } });
  await raw.articleImage.deleteMany({ where: { articleId: article.id } });
  await raw.articleCredit.deleteMany({ where: { articleId: article.id } });
  await raw.article.delete({ where: { id: article.id } });
  await raw.articleGroup.delete({ where: { id: group.id } });
  await raw.user.delete({ where: { id: editor.id } });
  await raw.user.delete({ where: { id: writer.id } });

  await raw.$disconnect();
  console.log("");
  if (pass) console.log("✅ Nested-create tests passed.");
  else { console.error("❌ Some tests failed."); process.exit(1); }
}

main().catch(async (e) => { console.error("Test error:", e); await raw.$disconnect(); process.exit(1); });
