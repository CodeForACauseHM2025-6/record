/**
 * Export articles from THIS Record DB into a portable plaintext JSON file.
 *
 * Reads via @/lib/prisma so every encrypted field comes back as plaintext
 * (legacy `enc:v1:` strings and KMS envelope columns both handled by the
 * extension). The output is meant to be fed to scripts/import-articles.ts on
 * the target VM. Treat the file as sensitive — it contains decrypted bodies,
 * emails, and credits.
 *
 * Usage:
 *
 *   DATABASE_URL=<source-db-url> \
 *   ENCRYPTION_KEY=<source-legacy-key>  \
 *   KMS_KEY_ARN=<source-kek-arn>        \
 *   AWS_REGION=us-east-1                \
 *   AWS_ACCESS_KEY_ID=...               \
 *   AWS_SECRET_ACCESS_KEY=...           \
 *     npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *       scripts/export-articles.ts --slug my-article --out export.json
 *
 *   ... --slugs a,b,c --out export.json
 *   ... --all --out export.json
 *
 * S3 caveat: image URLs, `featuredImage`, and the per-issue PDF key are
 * exported as-is. If the target VM uses a different S3 bucket, copy the
 * underlying objects across (e.g. `aws s3 sync`) or rewrite the URLs/keys in
 * the JSON before importing. (`featuredImage` is usually an inline data URL,
 * so it needs no S3 copy; inline images and issue PDFs do.)
 */

import { writeFileSync } from "fs";
import { prisma } from "../lib/prisma";

type ExportArticle = {
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
    // Per-issue PDF lives in S3 at issue-pdfs/<sourceGroupId>/<uuid>.pdf; only the
    // key + metadata travel in the JSON. The bytes must be synced to the target
    // bucket separately (same caveat as inline image URLs).
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

type ExportFile = {
  exportedAt: string;
  schemaVersion: 1;
  articles: ExportArticle[];
};

function parseArgs() {
  const args = process.argv.slice(2);
  let slug: string | undefined;
  let slugs: string[] | undefined;
  let all = false;
  let out = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) slug = args[++i];
    else if (args[i] === "--slugs" && args[i + 1]) {
      slugs = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (args[i] === "--all") all = true;
    else if (args[i] === "--out" && args[i + 1]) out = args[++i];
  }
  if (!out) {
    console.error("Missing --out <file>");
    process.exit(1);
  }
  const selectors = [slug, slugs, all].filter(Boolean).length;
  if (selectors !== 1) {
    console.error("Specify exactly one of --slug <slug>, --slugs <a,b,c>, --all");
    process.exit(1);
  }
  return { slug, slugs, all, out };
}

async function main() {
  const { slug, slugs, all, out } = parseArgs();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.KMS_KEY_ARN) {
    console.error(
      "KMS_KEY_ARN is required — envelope-encrypted columns are the canonical store post-phase-5"
    );
    process.exit(1);
  }

  const where = all
    ? {}
    : slug
      ? { slug }
      : { slug: { in: slugs! } };

  const articles = await prisma.article.findMany({
    where,
    include: {
      createdBy: {
        select: { email: true, name: true, role: true, displayTitle: true },
      },
      credits: {
        include: { user: { select: { email: true, name: true } } },
      },
      images: { orderBy: { order: "asc" } },
      group: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (articles.length === 0) {
    console.error("No articles matched the selector.");
    process.exit(1);
  }

  const exportArticles: ExportArticle[] = [];
  for (const a of articles) {
    if (!a.createdBy.email) {
      console.error(
        `Skipping ${a.slug}: createdBy has no email — cannot match on import.`
      );
      continue;
    }
    if (a.body == null) {
      console.error(`Skipping ${a.slug}: body decrypted as null.`);
      continue;
    }
    exportArticles.push({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      section: a.section,
      body: a.body,
      featuredImage: a.featuredImage,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      createdBy: {
        email: a.createdBy.email,
        name: a.createdBy.name,
        role: a.createdBy.role,
        displayTitle: a.createdBy.displayTitle,
      },
      group: {
        name: a.group.name,
        volumeNumber: a.group.volumeNumber,
        issueNumber: a.group.issueNumber,
        status: a.group.status,
        publishedAt: a.group.publishedAt?.toISOString() ?? null,
        pdfKey: a.group.pdfKey,
        pdfFilename: a.group.pdfFilename,
        pdfByteSize: a.group.pdfByteSize,
        pdfUploadedAt: a.group.pdfUploadedAt?.toISOString() ?? null,
      },
      credits: a.credits
        .filter((c) => c.creditRole && c.user.email)
        .map((c) => ({
          creditRole: c.creditRole!,
          user: { email: c.user.email!, name: c.user.name },
        })),
      images: a.images
        .filter((img) => img.url && img.altText != null)
        .map((img) => ({
          url: img.url!,
          caption: img.caption,
          altText: img.altText!,
          order: img.order,
        })),
    });
  }

  const payload: ExportFile = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    articles: exportArticles,
  };

  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${exportArticles.length} article(s) to ${out}`);
  console.log(
    "This file contains decrypted plaintext (bodies, emails, credits). Delete it once the import finishes."
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
