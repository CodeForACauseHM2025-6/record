/**
 * Migrate articles from an old Record DB to a new one.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-articles.ts \
 *     --from "postgresql://user:pass@old-host:5432/record" \
 *     --to   "postgresql://user:pass@new-host:5432/record"
 *
 * Copies: Users, Accounts, ArticleGroups, Articles, ArticleCredits,
 *         ArticleImages, Approvals, SiteSettings.
 * Skips:  Sessions, LayoutBlocks, BlockSlots (layout not needed).
 * Uses upsert so it's safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

function parseArgs(): { from: string; to: string } {
  const args = process.argv.slice(2);
  let from = "";
  let to = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) from = args[++i];
    if (args[i] === "--to" && args[i + 1]) to = args[++i];
  }
  if (!from || !to) {
    console.error("Usage: migrate-articles --from <old-db-url> --to <new-db-url>");
    process.exit(1);
  }
  return { from, to };
}

async function main() {
  const { from, to } = parseArgs();

  const oldDb = new PrismaClient({ datasources: { db: { url: from } } });
  const newDb = new PrismaClient({ datasources: { db: { url: to } } });

  try {
    await oldDb.$connect();
    await newDb.$connect();
    console.log("Connected to both databases.\n");

    // 1. Users
    const users = await oldDb.user.findMany();
    console.log(`Migrating ${users.length} users...`);
    for (const u of users) {
      await newDb.user.upsert({
        where: { id: u.id },
        update: {
          email: u.email,
          name: u.name,
          image: u.image,
          googleImage: u.googleImage,
          emailVerified: u.emailVerified,
          role: u.role,
          displayTitle: u.displayTitle,
          isAdmin: u.isAdmin,
        },
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
          googleImage: u.googleImage,
          emailVerified: u.emailVerified,
          role: u.role,
          displayTitle: u.displayTitle,
          isAdmin: u.isAdmin,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
      });
    }
    console.log("  ✓ Users done");

    // 2. Accounts
    const accounts = await oldDb.account.findMany();
    console.log(`Migrating ${accounts.length} accounts...`);
    for (const a of accounts) {
      await newDb.account.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          userId: a.userId,
          type: a.type,
          provider: a.provider,
          providerAccountId: a.providerAccountId,
          refresh_token: a.refresh_token,
          access_token: a.access_token,
          expires_at: a.expires_at,
          token_type: a.token_type,
          scope: a.scope,
          id_token: a.id_token,
          session_state: a.session_state,
        },
      });
    }
    console.log("  ✓ Accounts done");

    // 3. SiteSettings
    const settings = await oldDb.siteSetting.findMany();
    console.log(`Migrating ${settings.length} site settings...`);
    for (const s of settings) {
      await newDb.siteSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      });
    }
    console.log("  ✓ SiteSettings done");

    // 4. ArticleGroups
    const groups = await oldDb.articleGroup.findMany();
    console.log(`Migrating ${groups.length} article groups...`);
    for (const g of groups) {
      await newDb.articleGroup.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          issueNumber: g.issueNumber,
          status: g.status,
          scheduledAt: g.scheduledAt,
          publishedAt: g.publishedAt,
        },
        create: {
          id: g.id,
          name: g.name,
          issueNumber: g.issueNumber,
          status: g.status,
          scheduledAt: g.scheduledAt,
          publishedAt: g.publishedAt,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        },
      });
    }
    console.log("  ✓ ArticleGroups done");

    // 5. Articles
    const articles = await oldDb.article.findMany();
    console.log(`Migrating ${articles.length} articles...`);
    for (const a of articles) {
      await newDb.article.upsert({
        where: { id: a.id },
        update: {
          title: a.title,
          slug: a.slug,
          body: a.body,
          excerpt: a.excerpt,
          featuredImage: a.featuredImage,
          section: a.section,
          status: a.status,
          publishedAt: a.publishedAt,
          groupId: a.groupId,
        },
        create: {
          id: a.id,
          title: a.title,
          slug: a.slug,
          body: a.body,
          excerpt: a.excerpt,
          featuredImage: a.featuredImage,
          section: a.section,
          status: a.status,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          createdById: a.createdById,
          groupId: a.groupId,
        },
      });
    }
    console.log("  ✓ Articles done");

    // 6. ArticleCredits
    const credits = await oldDb.articleCredit.findMany();
    console.log(`Migrating ${credits.length} article credits...`);
    for (const c of credits) {
      await newDb.articleCredit.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          articleId: c.articleId,
          userId: c.userId,
          creditRole: c.creditRole,
        },
      });
    }
    console.log("  ✓ ArticleCredits done");

    // 7. ArticleImages
    const images = await oldDb.articleImage.findMany();
    console.log(`Migrating ${images.length} article images...`);
    for (const img of images) {
      await newDb.articleImage.upsert({
        where: { id: img.id },
        update: {},
        create: {
          id: img.id,
          articleId: img.articleId,
          url: img.url,
          caption: img.caption,
          altText: img.altText,
          order: img.order,
        },
      });
    }
    console.log("  ✓ ArticleImages done");

    // 8. Approvals
    const approvals = await oldDb.approval.findMany();
    console.log(`Migrating ${approvals.length} approvals...`);
    for (const ap of approvals) {
      await newDb.approval.upsert({
        where: { id: ap.id },
        update: {},
        create: {
          id: ap.id,
          userId: ap.userId,
          articleId: ap.articleId,
          groupId: ap.groupId,
          createdAt: ap.createdAt,
        },
      });
    }
    console.log("  ✓ Approvals done");

    console.log("\n✓ Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

main();
