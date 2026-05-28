/**
 * Import articles produced by scripts/export-articles.ts into THIS Record DB.
 *
 * Writes via @/lib/prisma so every encrypted field is re-encrypted under
 * THIS VM's ENCRYPTION_KEY + KMS KEK, and blind-index hashes are re-derived
 * for deterministic fields (User.email, ArticleCredit.creditRole). The source
 * and target keys do NOT need to match — that's the whole point of the
 * plaintext-JSON intermediate.
 *
 * Resolution rules:
 *   - createdBy / credit users: matched by email. Missing users are created
 *     as READER (bump them later in the admin panel). Roles are NOT carried
 *     across — never auto-promote on import.
 *   - ArticleGroup: matched by (volumeNumber, issueNumber) when both present,
 *     then by name. If nothing matches, a fresh DRAFT group is created.
 *   - Article id is regenerated. Slug is preserved when possible, with a
 *     numeric suffix on conflict.
 *
 * S3 caveat: image URLs and the per-issue PDF key are written verbatim. If the
 * target uses a different bucket, copy the underlying objects across (e.g.
 * `aws s3 sync`) or rewrite the URLs/keys in the JSON before running this
 * script — there is no S3 logic here. The PDF metadata is only applied to
 * NEWLY-created groups; a matched existing group is never clobbered.
 *
 * Usage:
 *
 *   DATABASE_URL=<target-db-url>        \
 *   ENCRYPTION_KEY=<target-legacy-key>  \
 *   KMS_KEY_ARN=<target-kek-arn>        \
 *   AWS_REGION=us-east-1                \
 *   AWS_ACCESS_KEY_ID=...               \
 *   AWS_SECRET_ACCESS_KEY=...           \
 *     npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *       scripts/import-articles.ts --in export.json [--dry-run]
 */

import { readFileSync } from "fs";
import { prisma } from "../lib/prisma";

type Section =
  | "NEWS"
  | "OPINIONS"
  | "LIONS_DEN"
  | "A_AND_E"
  | "FEATURES"
  | "THE_ROUNDTABLE"
  | "MD_ALUMNI";
type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type ImportArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  section: string;
  body: string;
  featuredImage: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    email: string;
    name: string | null;
    role: string;
    displayTitle: string | null;
  };
  group: {
    name: string | null;
    volumeNumber: number | null;
    issueNumber: number | null;
    status: string;
    publishedAt: string | null;
    pdfKey: string | null;
    pdfFilename: string | null;
    pdfByteSize: number | null;
    pdfUploadedAt: string | null;
  };
  credits: Array<{
    creditRole: string;
    user: { email: string; name: string | null };
  }>;
  images: Array<{
    url: string;
    caption: string | null;
    altText: string;
    order: number;
  }>;
};

type ImportFile = {
  exportedAt: string;
  schemaVersion: 1;
  articles: ImportArticle[];
};

function parseArgs() {
  const args = process.argv.slice(2);
  let inPath = "";
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--in" && args[i + 1]) inPath = args[++i];
    else if (args[i] === "--dry-run") dryRun = true;
  }
  if (!inPath) {
    console.error("Missing --in <file>");
    process.exit(1);
  }
  return { inPath, dryRun };
}

async function findOrCreateUser(email: string, name: string | null) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email,
      name,
      role: "READER",
      isAdmin: false,
    } as never,
  });
}

async function findOrCreateGroup(g: ImportArticle["group"]) {
  if (g.volumeNumber != null && g.issueNumber != null) {
    const byIssue = await prisma.articleGroup.findFirst({
      where: { volumeNumber: g.volumeNumber, issueNumber: g.issueNumber },
    });
    if (byIssue) {
      if (g.pdfKey && !byIssue.pdfKey) {
        console.log(
          `  note: matched existing group ${byIssue.id} has no PDF; source carried '${g.pdfKey}'. Leaving the existing group untouched — upload the PDF via the dashboard if you want it here.`
        );
      }
      return byIssue;
    }
  }
  if (g.name) {
    const byName = await prisma.articleGroup.findFirst({ where: { name: g.name } });
    if (byName) {
      if (g.pdfKey && !byName.pdfKey) {
        console.log(
          `  note: matched existing group ${byName.id} has no PDF; source carried '${g.pdfKey}'. Leaving the existing group untouched — upload the PDF via the dashboard if you want it here.`
        );
      }
      return byName;
    }
  }
  // Fresh group — carry the PDF metadata across. The pdfKey still embeds the SOURCE
  // groupId in its S3 path; that's fine because the streaming proxy fetches the key
  // verbatim and never re-derives it from the group id. The PDF bytes must already
  // exist at that key in the target bucket (sync them with `aws s3 sync`).
  return prisma.articleGroup.create({
    data: {
      name: g.name,
      volumeNumber: g.volumeNumber,
      issueNumber: g.issueNumber,
      status: "DRAFT",
      pdfKey: g.pdfKey,
      pdfFilename: g.pdfFilename,
      pdfByteSize: g.pdfByteSize,
      pdfUploadedAt: g.pdfUploadedAt ? new Date(g.pdfUploadedAt) : null,
    },
  });
}

async function resolveUniqueSlug(desired: string): Promise<string> {
  let slug = desired;
  let suffix = 2;
  while (await prisma.article.findFirst({ where: { slug } })) {
    slug = `${desired}-${suffix}`;
    suffix++;
  }
  return slug;
}

async function importArticle(a: ImportArticle, dryRun: boolean) {
  if (dryRun) {
    console.log(`[dry-run] would import: ${a.slug} (createdBy ${a.createdBy.email})`);
    return;
  }

  const author = await findOrCreateUser(a.createdBy.email, a.createdBy.name);
  const group = await findOrCreateGroup(a.group);
  const finalSlug = await resolveUniqueSlug(a.slug);
  if (finalSlug !== a.slug) {
    console.log(`  slug conflict on '${a.slug}' → using '${finalSlug}'`);
  }

  const credits: Array<{ userId: string; creditRole: string }> = [];
  for (const c of a.credits) {
    const u = await findOrCreateUser(c.user.email, c.user.name);
    credits.push({ userId: u.id, creditRole: c.creditRole });
  }

  await prisma.article.create({
    data: {
      title: a.title,
      slug: finalSlug,
      body: a.body,
      excerpt: a.excerpt,
      featuredImage: a.featuredImage,
      section: a.section as Section,
      createdById: author.id,
      groupId: group.id,
      credits: credits.length > 0 ? { create: credits } : undefined,
      images:
        a.images.length > 0
          ? {
              create: a.images.map((img) => ({
                url: img.url,
                caption: img.caption,
                altText: img.altText,
                order: img.order,
              })),
            }
          : undefined,
    } as never,
  });

  console.log(`  ✓ ${finalSlug} → group ${group.id}`);
}

async function main() {
  const { inPath, dryRun } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.KMS_KEY_ARN) {
    console.error(
      "KMS_KEY_ARN is required — Article.bodyCiphertext etc. are NOT NULL columns populated only when KMS is configured"
    );
    process.exit(1);
  }

  const raw = readFileSync(inPath, "utf8");
  const file = JSON.parse(raw) as ImportFile;

  if (file.schemaVersion !== 1) {
    console.error(`Unsupported schemaVersion: ${file.schemaVersion}`);
    process.exit(1);
  }

  console.log(
    `Importing ${file.articles.length} article(s) from ${inPath} (exported ${file.exportedAt})${dryRun ? " [dry-run]" : ""}`
  );

  // Pre-check: warn on roles that won't be preserved.
  const elevatedAuthors = new Set<string>();
  for (const a of file.articles) {
    if (a.createdBy.role !== "READER" && a.createdBy.role !== "WRITER") {
      elevatedAuthors.add(`${a.createdBy.email} (${a.createdBy.role})`);
    }
    for (const c of a.credits) {
      // creditRole is unrelated to the user's User.role, no warning needed.
      void c;
    }
  }
  if (elevatedAuthors.size > 0) {
    console.log(
      `Note: ${elevatedAuthors.size} author(s) have elevated roles on source; on the target they will be created as READER if missing. Bump them in /admin/users afterwards:`
    );
    for (const a of elevatedAuthors) console.log(`  - ${a}`);
  }

  let imported = 0;
  for (const a of file.articles) {
    try {
      await importArticle(a, dryRun);
      imported++;
    } catch (err) {
      console.error(`  ✗ ${a.slug} failed: ${(err as Error).message}`);
    }
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Done. ${imported}/${file.articles.length} article(s) ${dryRun ? "would be " : ""}imported.`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
