-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "homeOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "homeSize" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "scheduledAt" TIMESTAMP(3);
