-- Round tables are now owned by an ArticleGroup (1:1) and have no separate status.

-- Delete any orphaned round tables (no group attached) since groupId becomes required.
DELETE FROM "RoundTable" WHERE "groupId" IS NULL;

-- Drop the old foreign key (ON DELETE SET NULL) so we can re-add with CASCADE.
ALTER TABLE "RoundTable" DROP CONSTRAINT "RoundTable_groupId_fkey";

-- Drop status + publishedAt; visibility is derived from the group.
ALTER TABLE "RoundTable" DROP COLUMN "status";
ALTER TABLE "RoundTable" DROP COLUMN "publishedAt";

-- Drop the now-unused enum type.
DROP TYPE "RoundTableStatus";

-- Make groupId required.
ALTER TABLE "RoundTable" ALTER COLUMN "groupId" SET NOT NULL;

-- One round table per group.
CREATE UNIQUE INDEX "RoundTable_groupId_key" ON "RoundTable"("groupId");

-- Re-add the FK with ON DELETE CASCADE so deleting a group deletes its round table.
ALTER TABLE "RoundTable" ADD CONSTRAINT "RoundTable_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ArticleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
