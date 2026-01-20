/*
  Warnings:

  - You are about to drop the column `warehouseLotId` on the `ImportExport` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportExport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "salespersonId" INTEGER,
    "categoryId" INTEGER,
    "quantity" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" REAL NOT NULL,
    "foreignAmount" REAL NOT NULL,
    "krwAmount" REAL NOT NULL,
    "goodsAmount" REAL,
    "dutyAmount" REAL,
    "shippingCost" REAL,
    "otherCost" REAL,
    "totalCost" REAL,
    "unitCost" REAL,
    "storageType" TEXT,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT false,
    "supplyAmount" REAL,
    "vatAmount" REAL,
    "totalAmount" REAL,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportExport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImportExport_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImportExport_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportExport_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ImportExport" ("categoryId", "createdAt", "currency", "date", "dutyAmount", "exchangeRate", "foreignAmount", "goodsAmount", "id", "krwAmount", "memo", "otherCost", "productId", "quantity", "salespersonId", "shippingCost", "storageType", "supplyAmount", "totalAmount", "totalCost", "type", "unitCost", "updatedAt", "vatAmount", "vatIncluded", "vendorId") SELECT "categoryId", "createdAt", "currency", "date", "dutyAmount", "exchangeRate", "foreignAmount", "goodsAmount", "id", "krwAmount", "memo", "otherCost", "productId", "quantity", "salespersonId", "shippingCost", "storageType", "supplyAmount", "totalAmount", "totalCost", "type", "unitCost", "updatedAt", "vatAmount", "vatIncluded", "vendorId" FROM "ImportExport";
DROP TABLE "ImportExport";
ALTER TABLE "new_ImportExport" RENAME TO "ImportExport";
CREATE TABLE "new_InventoryLot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER,
    "productId" INTEGER,
    "vendorId" INTEGER,
    "salespersonId" INTEGER,
    "lotCode" TEXT,
    "receivedDate" DATETIME NOT NULL,
    "quantityReceived" REAL NOT NULL,
    "quantityRemaining" REAL NOT NULL,
    "goodsAmount" REAL NOT NULL,
    "dutyAmount" REAL NOT NULL,
    "domesticFreight" REAL NOT NULL,
    "otherCost" REAL NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL,
    "storageLocation" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "importExportId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_importExportId_fkey" FOREIGN KEY ("importExportId") REFERENCES "ImportExport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryLot" ("createdAt", "domesticFreight", "dutyAmount", "goodsAmount", "id", "itemId", "lotCode", "otherCost", "productId", "quantityReceived", "quantityRemaining", "receivedDate", "salespersonId", "unitCost", "updatedAt", "vendorId") SELECT "createdAt", "domesticFreight", "dutyAmount", "goodsAmount", "id", "itemId", "lotCode", "otherCost", "productId", "quantityReceived", "quantityRemaining", "receivedDate", "salespersonId", "unitCost", "updatedAt", "vendorId" FROM "InventoryLot";
DROP TABLE "InventoryLot";
ALTER TABLE "new_InventoryLot" RENAME TO "InventoryLot";
CREATE UNIQUE INDEX "InventoryLot_importExportId_key" ON "InventoryLot"("importExportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
