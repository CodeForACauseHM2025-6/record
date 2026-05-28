-- Placeholder authors: a directory-added User who hasn't logged in yet. Flag is cleared on
-- first Google login (claim). Existing users default false; no backfill needed.

ALTER TABLE "User" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;
