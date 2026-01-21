-- CreateTable
CREATE TABLE "ImportExportItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "importExportId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "krwAmount" REAL NOT NULL,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportExportItem_importExportId_fkey" FOREIGN KEY ("importExportId") REFERENCES "ImportExport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportExportItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
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
    CONSTRAINT "Material_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Material_purchaseVendorId_fkey" FOREIGN KEY ("purchaseVendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Part" (
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
    CONSTRAINT "Part_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Part_purchaseVendorId_fkey" FOREIGN KEY ("purchaseVendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hourlyRate" REAL,
    "defaultHours" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "customer" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "exchangeRate" REAL NOT NULL DEFAULT 1,
    "partsCost" REAL NOT NULL DEFAULT 0,
    "laborCost" REAL NOT NULL DEFAULT 0,
    "customsCost" REAL NOT NULL DEFAULT 0,
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "otherCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "salesPrice" REAL NOT NULL DEFAULT 0,
    "margin" REAL NOT NULL DEFAULT 0,
    "marginRate" REAL NOT NULL DEFAULT 0,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "materialId" INTEGER,
    "partId" INTEGER,
    "serviceId" INTEGER,
    "itemName" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "workDate" DATETIME,
    "workHours" REAL,
    "engineer" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportExport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "productId" INTEGER,
    "vendorId" INTEGER NOT NULL,
    "salespersonId" INTEGER,
    "categoryId" INTEGER,
    "quantity" REAL,
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
    CONSTRAINT "ImportExport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportExport_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImportExport_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportExport_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ImportExport" ("categoryId", "createdAt", "currency", "date", "dutyAmount", "exchangeRate", "foreignAmount", "goodsAmount", "id", "krwAmount", "memo", "otherCost", "productId", "quantity", "salespersonId", "shippingCost", "storageType", "supplyAmount", "totalAmount", "totalCost", "type", "unitCost", "updatedAt", "vatAmount", "vatIncluded", "vendorId") SELECT "categoryId", "createdAt", "currency", "date", "dutyAmount", "exchangeRate", "foreignAmount", "goodsAmount", "id", "krwAmount", "memo", "otherCost", "productId", "quantity", "salespersonId", "shippingCost", "storageType", "supplyAmount", "totalAmount", "totalCost", "type", "unitCost", "updatedAt", "vatAmount", "vatIncluded", "vendorId" FROM "ImportExport";
DROP TABLE "ImportExport";
ALTER TABLE "new_ImportExport" RENAME TO "ImportExport";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ImportExportItem_importExportId_idx" ON "ImportExportItem"("importExportId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Part_code_key" ON "Part"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");
