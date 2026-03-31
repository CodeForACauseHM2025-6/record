/*
  Warnings:

  - You are about to drop the `_ArticleToArticleGroup` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `groupId` to the `Article` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ArticleToArticleGroup" DROP CONSTRAINT "_ArticleToArticleGroup_A_fkey";

-- DropForeignKey
ALTER TABLE "_ArticleToArticleGroup" DROP CONSTRAINT "_ArticleToArticleGroup_B_fkey";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "groupId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_ArticleToArticleGroup";

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ArticleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
