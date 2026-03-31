/*
  Warnings:

  - You are about to drop the `GroupRow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupSlot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GroupRow" DROP CONSTRAINT "GroupRow_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupSlot" DROP CONSTRAINT "GroupSlot_articleId_fkey";

-- DropForeignKey
ALTER TABLE "GroupSlot" DROP CONSTRAINT "GroupSlot_rowId_fkey";

-- DropTable
DROP TABLE "GroupRow";

-- DropTable
DROP TABLE "GroupSlot";

-- CreateTable
CREATE TABLE "LayoutBlock" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "dividerStyle" TEXT NOT NULL DEFAULT 'light',

    CONSTRAINT "LayoutBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockSlot" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "slotRole" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "articleId" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "mediaAlt" TEXT,
    "mediaCredit" TEXT,

    CONSTRAINT "BlockSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LayoutBlock" ADD CONSTRAINT "LayoutBlock_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ArticleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockSlot" ADD CONSTRAINT "BlockSlot_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "LayoutBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockSlot" ADD CONSTRAINT "BlockSlot_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
