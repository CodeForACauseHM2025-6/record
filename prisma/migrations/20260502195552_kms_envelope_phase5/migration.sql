-- DropIndex
DROP INDEX "ArticleCredit_articleId_userId_creditRole_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Article" DROP COLUMN "body",
DROP COLUMN "featuredImage",
ALTER COLUMN "bodyCiphertext" SET NOT NULL,
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL;

-- AlterTable
ALTER TABLE "ArticleCredit" DROP COLUMN "creditRole",
ALTER COLUMN "creditRoleCiphertext" SET NOT NULL,
ALTER COLUMN "creditRoleHash" SET NOT NULL,
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL;

-- AlterTable
ALTER TABLE "ArticleImage" DROP COLUMN "altText",
DROP COLUMN "caption",
DROP COLUMN "url",
ALTER COLUMN "altTextCiphertext" SET NOT NULL,
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL,
ALTER COLUMN "urlCiphertext" SET NOT NULL;

-- AlterTable
ALTER TABLE "RoundTable" DROP COLUMN "prompt",
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL,
ALTER COLUMN "promptCiphertext" SET NOT NULL;

-- AlterTable
ALTER TABLE "RoundTableSide" DROP COLUMN "label",
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL,
ALTER COLUMN "labelCiphertext" SET NOT NULL;

-- AlterTable
ALTER TABLE "RoundTableTurn" DROP COLUMN "body",
ALTER COLUMN "bodyCiphertext" SET NOT NULL,
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
DROP COLUMN "image",
DROP COLUMN "name",
ALTER COLUMN "dekKekVersion" SET NOT NULL,
ALTER COLUMN "emailCiphertext" SET NOT NULL,
ALTER COLUMN "emailHash" SET NOT NULL,
ALTER COLUMN "encryptedDek" SET NOT NULL,
ALTER COLUMN "nameCiphertext" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCredit_articleId_userId_creditRoleHash_key" ON "ArticleCredit"("articleId", "userId", "creditRoleHash");

