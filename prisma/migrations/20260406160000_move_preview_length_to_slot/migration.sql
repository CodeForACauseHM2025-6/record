-- AlterTable
ALTER TABLE "ArticleGroup" DROP COLUMN IF EXISTS "previewLength";

-- AlterTable
ALTER TABLE "BlockSlot" ADD COLUMN "previewLength" INTEGER NOT NULL DEFAULT 200;
