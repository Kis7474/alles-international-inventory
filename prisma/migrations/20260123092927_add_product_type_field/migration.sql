-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "categoryId" INTEGER,
    "description" TEXT,
    "purchaseVendorId" INTEGER,
    "defaultPurchasePrice" REAL,
    "defaultSalesPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_purchaseVendorId_fkey" FOREIGN KEY ("purchaseVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "code", "createdAt", "defaultPurchasePrice", "defaultSalesPrice", "description", "id", "name", "purchaseVendorId", "unit", "updatedAt") SELECT "categoryId", "code", "createdAt", "defaultPurchasePrice", "defaultSalesPrice", "description", "id", "name", "purchaseVendorId", "unit", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE TABLE "new_ProjectItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "productId" INTEGER,
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
    CONSTRAINT "ProjectItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjectItem" ("amount", "createdAt", "engineer", "id", "itemName", "itemType", "materialId", "memo", "partId", "projectId", "quantity", "serviceId", "unitPrice", "updatedAt", "workDate", "workHours") SELECT "amount", "createdAt", "engineer", "id", "itemName", "itemType", "materialId", "memo", "partId", "projectId", "quantity", "serviceId", "unitPrice", "updatedAt", "workDate", "workHours" FROM "ProjectItem";
DROP TABLE "ProjectItem";
ALTER TABLE "new_ProjectItem" RENAME TO "ProjectItem";
CREATE INDEX "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
