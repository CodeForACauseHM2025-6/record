/*
  Warnings:

  - The `status` column on the `ArticleGroup` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ArticleGroup" DROP COLUMN "status",
ADD COLUMN     "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "GroupRow" ADD COLUMN     "isSeparator" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GroupSlot" ADD COLUMN     "autoplay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lockToRow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mediaAlt" TEXT,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "rowSpan" INTEGER;
