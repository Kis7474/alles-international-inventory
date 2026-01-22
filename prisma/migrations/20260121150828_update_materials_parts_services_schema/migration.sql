/*
  Warnings:

  - You are about to drop the column `defaultSalesPrice` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `defaultSalesPrice` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `defaultHours` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRate` on the `Service` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "categoryId" INTEGER,
    "description" TEXT,
    "purchaseVendorId" INTEGER NOT NULL,
    "salesVendorId" INTEGER,
    "defaultPurchasePrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Material_purchaseVendorId_fkey" FOREIGN KEY ("purchaseVendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Material_salesVendorId_fkey" FOREIGN KEY ("salesVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Material" ("categoryId", "code", "createdAt", "defaultPurchasePrice", "description", "id", "name", "purchaseVendorId", "unit", "updatedAt") SELECT "categoryId", "code", "createdAt", "defaultPurchasePrice", "description", "id", "name", "purchaseVendorId", "unit", "updatedAt" FROM "Material";
DROP TABLE "Material";
ALTER TABLE "new_Material" RENAME TO "Material";
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");
CREATE TABLE "new_Part" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "categoryId" INTEGER,
    "description" TEXT,
    "purchaseVendorId" INTEGER NOT NULL,
    "salesVendorId" INTEGER,
    "defaultPurchasePrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Part_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Part_purchaseVendorId_fkey" FOREIGN KEY ("purchaseVendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Part_salesVendorId_fkey" FOREIGN KEY ("salesVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Part" ("categoryId", "code", "createdAt", "defaultPurchasePrice", "description", "id", "name", "purchaseVendorId", "unit", "updatedAt") SELECT "categoryId", "code", "createdAt", "defaultPurchasePrice", "description", "id", "name", "purchaseVendorId", "unit", "updatedAt" FROM "Part";
DROP TABLE "Part";
ALTER TABLE "new_Part" RENAME TO "Part";
CREATE UNIQUE INDEX "Part_code_key" ON "Part"("code");
CREATE TABLE "new_Service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceHours" REAL,
    "salesVendorId" INTEGER,
    "categoryId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_salesVendorId_fkey" FOREIGN KEY ("salesVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("code", "createdAt", "description", "id", "name", "updatedAt") SELECT "code", "createdAt", "description", "id", "name", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
