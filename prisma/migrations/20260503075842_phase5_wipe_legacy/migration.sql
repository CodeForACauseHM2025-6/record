-- Phase 5 (wipe-legacy): the envelope columns are populated for every row already (Phase 3
-- backfill). This migration:
--   1. Drops NOT NULL on legacy plaintext columns.
--   2. Wipes existing legacy data to NULL.
--   3. Tightens envelope columns to NOT NULL.
--   4. Swaps the ArticleCredit unique constraint from creditRole to creditRoleHash.

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "name"  DROP NOT NULL;
UPDATE "User" SET "email" = NULL, "name" = NULL, "image" = NULL;
ALTER TABLE "User"
  ALTER COLUMN "emailCiphertext" SET NOT NULL,
  ALTER COLUMN "emailHash"       SET NOT NULL,
  ALTER COLUMN "nameCiphertext"  SET NOT NULL,
  ALTER COLUMN "encryptedDek"    SET NOT NULL,
  ALTER COLUMN "dekKekVersion"   SET NOT NULL;

ALTER TABLE "Article" ALTER COLUMN "body" DROP NOT NULL;
UPDATE "Article" SET "body" = NULL, "featuredImage" = NULL;
ALTER TABLE "Article"
  ALTER COLUMN "bodyCiphertext" SET NOT NULL,
  ALTER COLUMN "encryptedDek"   SET NOT NULL,
  ALTER COLUMN "dekKekVersion"  SET NOT NULL;

ALTER TABLE "ArticleCredit" ALTER COLUMN "creditRole" DROP NOT NULL;
UPDATE "ArticleCredit" SET "creditRole" = NULL;
ALTER TABLE "ArticleCredit"
  ALTER COLUMN "creditRoleCiphertext" SET NOT NULL,
  ALTER COLUMN "creditRoleHash"       SET NOT NULL,
  ALTER COLUMN "encryptedDek"         SET NOT NULL,
  ALTER COLUMN "dekKekVersion"        SET NOT NULL;
DROP INDEX IF EXISTS "ArticleCredit_articleId_userId_creditRole_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleCredit_articleId_userId_creditRoleHash_key"
  ON "ArticleCredit"("articleId", "userId", "creditRoleHash");

ALTER TABLE "ArticleImage" ALTER COLUMN "url"     DROP NOT NULL;
ALTER TABLE "ArticleImage" ALTER COLUMN "altText" DROP NOT NULL;
UPDATE "ArticleImage" SET "url" = NULL, "caption" = NULL, "altText" = NULL;
ALTER TABLE "ArticleImage"
  ALTER COLUMN "urlCiphertext"     SET NOT NULL,
  ALTER COLUMN "altTextCiphertext" SET NOT NULL,
  ALTER COLUMN "encryptedDek"      SET NOT NULL,
  ALTER COLUMN "dekKekVersion"     SET NOT NULL;

ALTER TABLE "RoundTable"     ALTER COLUMN "prompt" DROP NOT NULL;
ALTER TABLE "RoundTableSide" ALTER COLUMN "label"  DROP NOT NULL;
ALTER TABLE "RoundTableTurn" ALTER COLUMN "body"   DROP NOT NULL;
UPDATE "RoundTable"     SET "prompt" = NULL;
UPDATE "RoundTableSide" SET "label"  = NULL;
UPDATE "RoundTableTurn" SET "body"   = NULL;

ALTER TABLE "RoundTable"
  ALTER COLUMN "promptCiphertext" SET NOT NULL,
  ALTER COLUMN "encryptedDek"     SET NOT NULL,
  ALTER COLUMN "dekKekVersion"    SET NOT NULL;
ALTER TABLE "RoundTableSide"
  ALTER COLUMN "labelCiphertext" SET NOT NULL,
  ALTER COLUMN "encryptedDek"    SET NOT NULL,
  ALTER COLUMN "dekKekVersion"   SET NOT NULL;
ALTER TABLE "RoundTableTurn"
  ALTER COLUMN "bodyCiphertext" SET NOT NULL,
  ALTER COLUMN "encryptedDek"   SET NOT NULL,
  ALTER COLUMN "dekKekVersion"  SET NOT NULL;
