-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "bodyCiphertext" BYTEA,
ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "encryptedDek" BYTEA,
ADD COLUMN     "featuredImageCiphertext" BYTEA;

-- AlterTable
ALTER TABLE "ArticleCredit" ADD COLUMN     "creditRoleCiphertext" BYTEA,
ADD COLUMN     "creditRoleHash" BYTEA,
ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "encryptedDek" BYTEA;

-- AlterTable
ALTER TABLE "ArticleImage" ADD COLUMN     "altTextCiphertext" BYTEA,
ADD COLUMN     "captionCiphertext" BYTEA,
ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "encryptedDek" BYTEA,
ADD COLUMN     "urlCiphertext" BYTEA;

-- AlterTable
ALTER TABLE "RoundTable" ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "encryptedDek" BYTEA,
ADD COLUMN     "promptCiphertext" BYTEA;

-- AlterTable
ALTER TABLE "RoundTableSide" ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "encryptedDek" BYTEA,
ADD COLUMN     "labelCiphertext" BYTEA;

-- AlterTable
ALTER TABLE "RoundTableTurn" ADD COLUMN     "bodyCiphertext" BYTEA,
ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "encryptedDek" BYTEA;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dekKekVersion" INTEGER,
ADD COLUMN     "emailCiphertext" BYTEA,
ADD COLUMN     "emailHash" BYTEA,
ADD COLUMN     "encryptedDek" BYTEA,
ADD COLUMN     "imageCiphertext" BYTEA,
ADD COLUMN     "nameCiphertext" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "User_emailHash_key" ON "User"("emailHash");

