-- Issue PDF — per-issue attached PDF, served via streaming proxy at /api/issues/[id]/pdf.
-- Stored in private S3 prefix issue-pdfs/<groupId>/<uuid>.pdf.

ALTER TABLE "ArticleGroup"
  ADD COLUMN "pdfKey"        TEXT,
  ADD COLUMN "pdfFilename"   TEXT,
  ADD COLUMN "pdfByteSize"   INTEGER,
  ADD COLUMN "pdfUploadedAt" TIMESTAMP(3);

-- Append-only audit log. No FKs so rows survive user/group deletion (intentional for forensics).
CREATE TABLE "IssuePdfAccess" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "groupId"   TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssuePdfAccess_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IssuePdfAccess_groupId_fetchedAt_idx" ON "IssuePdfAccess" ("groupId", "fetchedAt");
CREATE INDEX "IssuePdfAccess_userId_fetchedAt_idx"  ON "IssuePdfAccess" ("userId",  "fetchedAt");
