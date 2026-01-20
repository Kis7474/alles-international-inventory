/*
  Warnings:

  - Added the required column `purchaseVendorId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create a default purchase vendor if none exists
INSERT OR IGNORE INTO "Vendor" ("id", "code", "name", "type", "createdAt", "updatedAt")
VALUES (999999, 'DEFAULT_PURCHASE', '기본 매입처', 'DOMESTIC_PURCHASE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 2: CreateTable ProductSalesVendor
CREATE TABLE "ProductSalesVendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductSalesVendor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductSalesVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 3: RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "categoryId" INTEGER,
    "description" TEXT,
    "purchaseVendorId" INTEGER NOT NULL,
    "defaultPurchasePrice" REAL,
    "defaultSalesPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_purchaseVendorId_fkey" FOREIGN KEY ("purchaseVendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 4: Migrate existing products with default vendor
INSERT INTO "new_Product" ("categoryId", "code", "createdAt", "defaultPurchasePrice", "defaultSalesPrice", "description", "id", "name", "unit", "updatedAt", "purchaseVendorId") 
SELECT "categoryId", "code", "createdAt", "defaultPurchasePrice", "defaultSalesPrice", "description", "id", "name", "unit", "updatedAt", 
  COALESCE(
    (SELECT "vendorId" FROM "SalesRecord" WHERE "SalesRecord"."productId" = "Product"."id" AND "SalesRecord"."type" = 'PURCHASE' LIMIT 1),
    999999
  ) as purchaseVendorId
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Step 5: Populate ProductSalesVendor from existing sales records
INSERT INTO "ProductSalesVendor" ("productId", "vendorId")
SELECT DISTINCT "productId", "vendorId"
FROM "SalesRecord"
WHERE "type" = 'SALES' 
  AND "productId" IS NOT NULL 
  AND "vendorId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductSalesVendor_productId_vendorId_key" ON "ProductSalesVendor"("productId", "vendorId");
