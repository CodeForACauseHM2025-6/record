-- CreateEnum
CREATE TYPE "RoundTableStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "RoundTable" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prompt" VARCHAR(500) NOT NULL,
    "status" "RoundTableStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundTableSide" (
    "id" TEXT NOT NULL,
    "roundTableId" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RoundTableSide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundTableSideAuthor" (
    "id" TEXT NOT NULL,
    "sideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RoundTableSideAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundTableTurn" (
    "id" TEXT NOT NULL,
    "roundTableId" TEXT NOT NULL,
    "sideId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RoundTableTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoundTable_slug_key" ON "RoundTable"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoundTableSideAuthor_sideId_userId_key" ON "RoundTableSideAuthor"("sideId", "userId");

-- AddForeignKey
ALTER TABLE "RoundTable" ADD CONSTRAINT "RoundTable_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ArticleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundTableSide" ADD CONSTRAINT "RoundTableSide_roundTableId_fkey" FOREIGN KEY ("roundTableId") REFERENCES "RoundTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundTableSideAuthor" ADD CONSTRAINT "RoundTableSideAuthor_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "RoundTableSide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundTableSideAuthor" ADD CONSTRAINT "RoundTableSideAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundTableTurn" ADD CONSTRAINT "RoundTableTurn_roundTableId_fkey" FOREIGN KEY ("roundTableId") REFERENCES "RoundTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundTableTurn" ADD CONSTRAINT "RoundTableTurn_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "RoundTableSide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
