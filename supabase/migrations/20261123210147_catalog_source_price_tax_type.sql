ALTER TABLE "CatalogItem"
  ADD COLUMN IF NOT EXISTS "sourcePriceTaxType" TEXT NOT NULL DEFAULT 'UNKNOWN';

ALTER TABLE "CatalogItem"
  ADD CONSTRAINT "CatalogItem_sourcePriceTaxType_check"
  CHECK ("sourcePriceTaxType" IN ('UNKNOWN', 'NET', 'GROSS'));
