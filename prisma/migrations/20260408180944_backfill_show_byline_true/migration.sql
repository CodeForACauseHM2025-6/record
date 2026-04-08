-- Backfill: existing slots were created when showByline defaulted to false.
-- The default was later flipped to true, but old rows were not updated.
-- This sets all existing slots to true so the byline shows by default everywhere.
UPDATE "BlockSlot" SET "showByline" = true WHERE "showByline" = false;
