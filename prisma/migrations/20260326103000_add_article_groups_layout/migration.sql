-- AlterTable: remove old layout columns
ALTER TABLE "Article" DROP COLUMN IF EXISTS "homeOrder";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "homeSize";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "isFeatured";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "scheduledAt";

-- CreateTable
CREATE TABLE "ArticleGroup" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ArticleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupRow" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GroupRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSlot" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "articleId" TEXT,
    CONSTRAINT "GroupSlot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GroupRow" ADD CONSTRAINT "GroupRow_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ArticleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSlot" ADD CONSTRAINT "GroupSlot_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "GroupRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSlot" ADD CONSTRAINT "GroupSlot_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
