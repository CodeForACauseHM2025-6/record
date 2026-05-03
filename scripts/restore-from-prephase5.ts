// Wipe a target DB and re-insert every row from a source DB, routing writes through the prisma
// extension so each row gets a fresh, correctly-paired DEK + ciphertext. Recovers from the
// inconsistent envelope-encryption state where stored encryptedDek and stored *Ciphertext were
// written under different DEKs and no longer pair up.
//
// SOURCE must have legacy plaintext columns populated (i.e. a pre-Phase-5 backup restored to a
// separate DB). TARGET uses the current Phase-5 schema.
//
// Usage:
//   SOURCE_DATABASE_URL=postgresql://localhost/record_pre_phase5 \
//   DATABASE_URL=postgresql://localhost/record_local_prod \
//   KMS_KEY_ARN=arn:aws:kms:us-east-1:...:key/... \
//   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1 \
//   ENCRYPTION_KEY=<64 hex chars> \
//   CONFIRM_DESTRUCTIVE=yes \
//   npx tsx scripts/restore-from-prephase5.ts
//
// What it does NOT do: commit, push, deploy. Run it locally first and verify before pointing
// DATABASE_URL at prod.

// Auto-load .env so the script picks up KMS_KEY_ARN / AWS creds / ENCRYPTION_KEY without
// requiring callers to manually `source` them. Override DATABASE_URL / SOURCE_DATABASE_URL on
// the command line — those should NEVER come from the project's .env (which targets prod).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { initEncryption } from "../lib/encryption";

// ---- env validation ----
const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!SOURCE_URL) throw new Error("SOURCE_DATABASE_URL required");
if (!TARGET_URL) throw new Error("DATABASE_URL required (target)");
if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY required for blind-index hashing");
if (!process.env.KMS_KEY_ARN) throw new Error("KMS_KEY_ARN required");
if (SOURCE_URL === TARGET_URL) {
  throw new Error("SOURCE and TARGET URLs are identical — refusing to wipe the same DB you read from");
}
if (process.env.CONFIRM_DESTRUCTIVE !== "yes") {
  console.error("Refusing to run: this script TRUNCATEs the target DB.");
  console.error(`  Source: ${SOURCE_URL}`);
  console.error(`  Target: ${TARGET_URL}`);
  console.error("Set CONFIRM_DESTRUCTIVE=yes to proceed.");
  process.exit(1);
}

initEncryption(ENCRYPTION_KEY);

// Import prisma AFTER encryption init so the extension's blind-index path works.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require("../lib/prisma") as typeof import("../lib/prisma");

const source = new Pool({ connectionString: SOURCE_URL });

async function selectAll<T>(sql: string): Promise<T[]> {
  const r = await source.query(sql);
  return r.rows as T[];
}

async function wipeTarget(): Promise<void> {
  console.log("• Wiping target DB...");
  // Phase 5 schema: ciphertext columns are NOT NULL, so we can't leave the tables in a partial
  // state. TRUNCATE CASCADE clears every row + every dependent FK in one statement.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "RoundTableTurn",
      "RoundTableSideAuthor",
      "RoundTableSide",
      "RoundTable",
      "Approval",
      "BlockSlot",
      "LayoutBlock",
      "ArticleImage",
      "ArticleCredit",
      "Article",
      "ArticleGroup",
      "Session",
      "Account",
      "User",
      "SiteSetting"
    RESTART IDENTITY CASCADE
  `);
  console.log("  ✓ done");
}

// ---- per-model copy functions. Order matters — FK dependencies determine insert sequence. ----

async function copyUsers(): Promise<void> {
  type R = {
    id: string; email: string | null; name: string | null; image: string | null;
    googleImage: string | null; emailVerified: Date | null; role: string;
    displayTitle: string | null; priority: number; isAdmin: boolean;
    createdAt: Date; updatedAt: Date;
  };
  const rows = await selectAll<R>(`
    SELECT id, email, name, image, "googleImage", "emailVerified", role,
           "displayTitle", priority, "isAdmin", "createdAt", "updatedAt"
    FROM "User" ORDER BY "createdAt"
  `);
  for (const r of rows) {
    if (!r.email) {
      console.warn(`  ⚠ User ${r.id} has NULL email in source; skipping`);
      continue;
    }
    await prisma.user.create({
      data: {
        id: r.id,
        email: r.email,
        name: r.name ?? "",
        image: r.image,
        googleImage: r.googleImage,
        emailVerified: r.emailVerified,
        role: r.role as never,
        displayTitle: r.displayTitle,
        priority: r.priority,
        isAdmin: r.isAdmin,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      } as never,
    });
  }
  console.log(`  ✓ User: ${rows.length}`);
}

async function copySiteSettings(): Promise<void> {
  type R = { key: string; value: string };
  const rows = await selectAll<R>(`SELECT key, value FROM "SiteSetting"`);
  for (const r of rows) {
    await prisma.siteSetting.create({ data: { key: r.key, value: r.value } });
  }
  console.log(`  ✓ SiteSetting: ${rows.length}`);
}

async function copyAccounts(): Promise<void> {
  type R = {
    id: string; userId: string; type: string; provider: string; providerAccountId: string;
    refresh_token: string | null; access_token: string | null; expires_at: number | null;
    token_type: string | null; scope: string | null; id_token: string | null;
    session_state: string | null;
  };
  const rows = await selectAll<R>(`SELECT * FROM "Account"`);
  for (const r of rows) {
    await prisma.account.create({
      data: {
        id: r.id, userId: r.userId, type: r.type, provider: r.provider,
        providerAccountId: r.providerAccountId,
        refresh_token: r.refresh_token, access_token: r.access_token,
        expires_at: r.expires_at, token_type: r.token_type, scope: r.scope,
        id_token: r.id_token, session_state: r.session_state,
      },
    });
  }
  console.log(`  ✓ Account: ${rows.length}`);
}

async function copySessions(): Promise<void> {
  type R = { id: string; sessionToken: string; userId: string; expires: Date };
  const rows = await selectAll<R>(`SELECT id, "sessionToken", "userId", expires FROM "Session"`);
  for (const r of rows) {
    await prisma.session.create({
      data: { id: r.id, sessionToken: r.sessionToken, userId: r.userId, expires: r.expires },
    });
  }
  console.log(`  ✓ Session: ${rows.length}`);
}

async function copyArticleGroups(): Promise<void> {
  type R = {
    id: string; name: string | null; volumeNumber: number | null; issueNumber: number | null;
    status: string; scheduledAt: Date | null; publishedAt: Date | null;
    createdAt: Date; updatedAt: Date;
  };
  const rows = await selectAll<R>(`
    SELECT id, name, "volumeNumber", "issueNumber", status, "scheduledAt", "publishedAt",
           "createdAt", "updatedAt"
    FROM "ArticleGroup" ORDER BY "createdAt"
  `);
  for (const r of rows) {
    await prisma.articleGroup.create({
      data: {
        id: r.id, name: r.name, volumeNumber: r.volumeNumber, issueNumber: r.issueNumber,
        status: r.status as never, scheduledAt: r.scheduledAt, publishedAt: r.publishedAt,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      },
    });
  }
  console.log(`  ✓ ArticleGroup: ${rows.length}`);
}

async function copyArticles(): Promise<void> {
  type R = {
    id: string; title: string; slug: string; body: string | null; excerpt: string | null;
    featuredImage: string | null; section: string; createdAt: Date; updatedAt: Date;
    createdById: string; groupId: string;
  };
  const rows = await selectAll<R>(`
    SELECT id, title, slug, body, excerpt, "featuredImage", section, "createdAt", "updatedAt",
           "createdById", "groupId"
    FROM "Article" ORDER BY "createdAt"
  `);
  for (const r of rows) {
    if (r.body == null) {
      console.warn(`  ⚠ Article ${r.id} has NULL body in source; storing empty string`);
    }
    await prisma.article.create({
      data: {
        id: r.id, title: r.title, slug: r.slug,
        body: r.body ?? "",
        excerpt: r.excerpt, featuredImage: r.featuredImage,
        section: r.section as never, createdAt: r.createdAt, updatedAt: r.updatedAt,
        createdById: r.createdById, groupId: r.groupId,
      } as never,
    });
  }
  console.log(`  ✓ Article: ${rows.length}`);
}

async function copyArticleCredits(): Promise<void> {
  type R = { id: string; articleId: string; userId: string; creditRole: string | null };
  const rows = await selectAll<R>(`
    SELECT id, "articleId", "userId", "creditRole" FROM "ArticleCredit"
  `);
  for (const r of rows) {
    await prisma.articleCredit.create({
      data: {
        id: r.id, articleId: r.articleId, userId: r.userId,
        creditRole: r.creditRole ?? "",
      } as never,
    });
  }
  console.log(`  ✓ ArticleCredit: ${rows.length}`);
}

async function copyArticleImages(): Promise<void> {
  type R = {
    id: string; articleId: string; url: string | null; caption: string | null;
    altText: string | null; order: number;
  };
  const rows = await selectAll<R>(`
    SELECT id, "articleId", url, caption, "altText", "order" FROM "ArticleImage" ORDER BY "order"
  `);
  for (const r of rows) {
    await prisma.articleImage.create({
      data: {
        id: r.id, articleId: r.articleId,
        url: r.url ?? "", caption: r.caption,
        altText: r.altText ?? "", order: r.order,
      } as never,
    });
  }
  console.log(`  ✓ ArticleImage: ${rows.length}`);
}

async function copyLayoutBlocks(): Promise<void> {
  type R = {
    id: string; groupId: string; column: string; pattern: string;
    order: number; dividerStyle: string;
  };
  const rows = await selectAll<R>(`
    SELECT id, "groupId", "column", pattern, "order", "dividerStyle"
    FROM "LayoutBlock" ORDER BY "order"
  `);
  for (const r of rows) {
    await prisma.layoutBlock.create({
      data: {
        id: r.id, groupId: r.groupId, column: r.column, pattern: r.pattern,
        order: r.order, dividerStyle: r.dividerStyle,
      },
    });
  }
  console.log(`  ✓ LayoutBlock: ${rows.length}`);
}

async function copyBlockSlots(): Promise<void> {
  type R = {
    id: string; blockId: string; slotRole: string; order: number;
    articleId: string | null; mediaUrl: string | null; mediaType: string | null;
    mediaAlt: string | null; mediaCredit: string | null;
    scale: string; imageScale: string; previewLength: number;
    featured: boolean; showByline: boolean; imageFloat: string;
    imageWidth: number; imageCrop: string; imageCropCustom: string | null;
  };
  const rows = await selectAll<R>(`SELECT * FROM "BlockSlot" ORDER BY "order"`);
  for (const r of rows) {
    await prisma.blockSlot.create({
      data: {
        id: r.id, blockId: r.blockId, slotRole: r.slotRole, order: r.order,
        articleId: r.articleId,
        mediaUrl: r.mediaUrl, mediaType: r.mediaType,
        mediaAlt: r.mediaAlt, mediaCredit: r.mediaCredit,
        scale: r.scale, imageScale: r.imageScale, previewLength: r.previewLength,
        featured: r.featured, showByline: r.showByline,
        imageFloat: r.imageFloat, imageWidth: r.imageWidth,
        imageCrop: r.imageCrop, imageCropCustom: r.imageCropCustom,
      },
    });
  }
  console.log(`  ✓ BlockSlot: ${rows.length}`);
}

async function copyApprovals(): Promise<void> {
  type R = {
    id: string; userId: string; createdAt: Date;
    articleId: string | null; groupId: string | null;
  };
  const rows = await selectAll<R>(`
    SELECT id, "userId", "createdAt", "articleId", "groupId" FROM "Approval"
  `);
  for (const r of rows) {
    await prisma.approval.create({
      data: {
        id: r.id, userId: r.userId, createdAt: r.createdAt,
        articleId: r.articleId, groupId: r.groupId,
      },
    });
  }
  console.log(`  ✓ Approval: ${rows.length}`);
}

async function copyRoundTables(): Promise<void> {
  type R = {
    id: string; slug: string; prompt: string | null; groupId: string;
    createdAt: Date; updatedAt: Date;
  };
  const rows = await selectAll<R>(`
    SELECT id, slug, prompt, "groupId", "createdAt", "updatedAt" FROM "RoundTable"
  `);
  for (const r of rows) {
    await prisma.roundTable.create({
      data: {
        id: r.id, slug: r.slug, prompt: r.prompt ?? "",
        groupId: r.groupId, createdAt: r.createdAt, updatedAt: r.updatedAt,
      } as never,
    });
  }
  console.log(`  ✓ RoundTable: ${rows.length}`);
}

async function copyRoundTableSides(): Promise<void> {
  type R = { id: string; roundTableId: string; label: string | null; order: number };
  const rows = await selectAll<R>(`
    SELECT id, "roundTableId", label, "order" FROM "RoundTableSide" ORDER BY "order"
  `);
  for (const r of rows) {
    await prisma.roundTableSide.create({
      data: {
        id: r.id, roundTableId: r.roundTableId,
        label: r.label ?? "", order: r.order,
      } as never,
    });
  }
  console.log(`  ✓ RoundTableSide: ${rows.length}`);
}

async function copyRoundTableSideAuthors(): Promise<void> {
  type R = { id: string; sideId: string; userId: string };
  const rows = await selectAll<R>(`SELECT id, "sideId", "userId" FROM "RoundTableSideAuthor"`);
  for (const r of rows) {
    await prisma.roundTableSideAuthor.create({
      data: { id: r.id, sideId: r.sideId, userId: r.userId },
    });
  }
  console.log(`  ✓ RoundTableSideAuthor: ${rows.length}`);
}

async function copyRoundTableTurns(): Promise<void> {
  type R = {
    id: string; roundTableId: string; sideId: string;
    body: string | null; order: number;
  };
  const rows = await selectAll<R>(`
    SELECT id, "roundTableId", "sideId", body, "order" FROM "RoundTableTurn" ORDER BY "order"
  `);
  for (const r of rows) {
    await prisma.roundTableTurn.create({
      data: {
        id: r.id, roundTableId: r.roundTableId, sideId: r.sideId,
        body: r.body ?? "", order: r.order,
      } as never,
    });
  }
  console.log(`  ✓ RoundTableTurn: ${rows.length}`);
}

// ---- main ----
async function main() {
  console.log("Restore-from-pre-Phase-5");
  console.log(`  Source: ${SOURCE_URL}`);
  console.log(`  Target: ${TARGET_URL}`);
  console.log();

  await wipeTarget();

  console.log("• Re-inserting (FK order)...");
  await copyUsers();
  await copySiteSettings();
  await copyAccounts();
  await copySessions();
  await copyArticleGroups();
  await copyArticles();
  await copyArticleCredits();
  await copyArticleImages();
  await copyLayoutBlocks();
  await copyBlockSlots();
  await copyApprovals();
  await copyRoundTables();
  await copyRoundTableSides();
  await copyRoundTableSideAuthors();
  await copyRoundTableTurns();

  console.log();
  console.log("✓ All rows re-inserted. Encryption is fresh; DEK and ciphertext now pair up.");
  console.log();
  console.log("Next: load the homepage on this DB and confirm zero decrypt-failed errors in logs.");
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.end();
    await prisma.$disconnect();
  });
