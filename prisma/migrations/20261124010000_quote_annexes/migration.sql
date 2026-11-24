CREATE TABLE "QuoteAnnex" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Anexo técnico explicativo',
  "projectBrief" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteAnnex_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuoteAnnexItem" (
  "id" TEXT NOT NULL, "annexId" TEXT NOT NULL, "quoteItemId" TEXT,
  "name" TEXT NOT NULL, "imageUrl" TEXT NOT NULL DEFAULT '', "description" TEXT NOT NULL DEFAULT '', "specs" TEXT NOT NULL DEFAULT '', "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuoteAnnexItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuoteAnnexAsset" (
  "id" TEXT NOT NULL, "annexId" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'REFERENCE', "title" TEXT NOT NULL, "url" TEXT NOT NULL DEFAULT '', "caption" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteAnnexAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuoteAnnex_quoteId_idx" ON "QuoteAnnex"("quoteId");
CREATE INDEX "QuoteAnnexItem_annexId_idx" ON "QuoteAnnexItem"("annexId");
CREATE INDEX "QuoteAnnexAsset_annexId_idx" ON "QuoteAnnexAsset"("annexId");
ALTER TABLE "QuoteAnnex" ADD CONSTRAINT "QuoteAnnex_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteAnnexItem" ADD CONSTRAINT "QuoteAnnexItem_annexId_fkey" FOREIGN KEY ("annexId") REFERENCES "QuoteAnnex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteAnnexAsset" ADD CONSTRAINT "QuoteAnnexAsset_annexId_fkey" FOREIGN KEY ("annexId") REFERENCES "QuoteAnnex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
