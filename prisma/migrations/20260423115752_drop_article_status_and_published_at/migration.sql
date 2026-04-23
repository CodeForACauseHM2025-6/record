-- Drop per-article status and publishedAt. Article visibility is now derived
-- entirely from the owning ArticleGroup's status.
ALTER TABLE "Article" DROP COLUMN "status";
ALTER TABLE "Article" DROP COLUMN "publishedAt";
