-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "categoryId" INTEGER,
    "description" TEXT,
    "defaultPurchasePrice" REAL,
    "defaultSalesPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "purchasePrice" REAL,
    "salesPrice" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DOMESTIC',
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VendorProductPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendorId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "purchasePrice" REAL,
    "salesPrice" REAL,
    "effectiveDate" DATETIME NOT NULL,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorProductPrice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportExport" (
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
    "warehouseLotId" INTEGER,
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

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "currency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SalesProduct" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesProductPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "purchasePrice" REAL NOT NULL DEFAULT 0,
    "salesPrice" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SalesProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryLot_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryLot" ("createdAt", "domesticFreight", "dutyAmount", "goodsAmount", "id", "itemId", "lotCode", "otherCost", "quantityReceived", "quantityRemaining", "receivedDate", "unitCost", "updatedAt") SELECT "createdAt", "domesticFreight", "dutyAmount", "goodsAmount", "id", "itemId", "lotCode", "otherCost", "quantityReceived", "quantityRemaining", "receivedDate", "unitCost", "updatedAt" FROM "InventoryLot";
DROP TABLE "InventoryLot";
ALTER TABLE "new_InventoryLot" RENAME TO "InventoryLot";
CREATE TABLE "new_SalesRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "salespersonId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "productId" INTEGER,
    "salesProductId" INTEGER,
    "vendorId" INTEGER,
    "itemName" TEXT NOT NULL,
    "customer" TEXT,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "margin" REAL NOT NULL DEFAULT 0,
    "marginRate" REAL NOT NULL DEFAULT 0,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT false,
    "supplyAmount" REAL,
    "vatAmount" REAL,
    "totalAmount" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesRecord_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesRecord_salesProductId_fkey" FOREIGN KEY ("salesProductId") REFERENCES "SalesProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalesRecord_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesRecord" ("amount", "categoryId", "cost", "createdAt", "customer", "date", "id", "itemName", "margin", "marginRate", "notes", "quantity", "salespersonId", "type", "unitPrice", "updatedAt") SELECT "amount", "categoryId", "cost", "createdAt", "customer", "date", "id", "itemName", "margin", "marginRate", "notes", "quantity", "salespersonId", "type", "unitPrice", "updatedAt" FROM "SalesRecord";
DROP TABLE "SalesRecord";
ALTER TABLE "new_SalesRecord" RENAME TO "SalesRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_effectiveDate_idx" ON "ProductPriceHistory"("productId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProductPrice_vendorId_productId_effectiveDate_key" ON "VendorProductPrice"("vendorId", "productId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_date_currency_key" ON "ExchangeRate"("date", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "SalesProduct_name_key" ON "SalesProduct"("name");

-- CreateIndex
CREATE INDEX "SalesProductPrice_productId_effectiveDate_idx" ON "SalesProductPrice"("productId", "effectiveDate");
