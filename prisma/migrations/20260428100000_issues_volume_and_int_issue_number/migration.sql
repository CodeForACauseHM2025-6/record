-- ArticleGroup is now an "issue": vol# is captured per-row from SiteSetting,
-- issue # is numeric for proper sort order, and name is nullable (legacy).

-- 1. Make name nullable (it's no longer required by the dashboard).
ALTER TABLE "ArticleGroup" ALTER COLUMN "name" DROP NOT NULL;

-- 2. Add volumeNumber column. Backfill from current SiteSetting where possible.
ALTER TABLE "ArticleGroup" ADD COLUMN "volumeNumber" VARCHAR(50);
UPDATE "ArticleGroup"
SET "volumeNumber" = (SELECT value FROM "SiteSetting" WHERE key = 'volumeNumber')
WHERE "volumeNumber" IS NULL;

-- 3. Convert issueNumber from VARCHAR to INTEGER. Non-numeric strings become NULL.
ALTER TABLE "ArticleGroup"
  ALTER COLUMN "issueNumber" TYPE INTEGER
  USING (
    CASE
      WHEN "issueNumber" ~ '^[0-9]+$' THEN "issueNumber"::INTEGER
      ELSE NULL
    END
  );
