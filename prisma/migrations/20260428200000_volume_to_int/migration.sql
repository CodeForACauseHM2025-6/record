-- Volume is now a regular integer (not a Roman numeral). Convert existing
-- VARCHAR values to INTEGER, with non-numeric values (e.g. "CXXIII") becoming NULL.
ALTER TABLE "ArticleGroup"
  ALTER COLUMN "volumeNumber" TYPE INTEGER
  USING (
    CASE
      WHEN "volumeNumber" ~ '^[0-9]+$' THEN "volumeNumber"::INTEGER
      ELSE NULL
    END
  );
