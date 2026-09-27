CREATE TABLE "CatalogCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogCategory_name_key" ON "CatalogCategory"("name");
