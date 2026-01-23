/*
  Warnings:

  - You are about to drop the `CustomsClearance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomsClearance";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CustomsTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationType" TEXT NOT NULL,
    "blType" TEXT,
    "blNumber" TEXT,
    "blYear" TEXT,
    "declarationNumber" TEXT,
    "cargoNumber" TEXT,
    "status" TEXT,
    "statusCode" TEXT,
    "productName" TEXT,
    "quantity" REAL,
    "weight" REAL,
    "packageCount" INTEGER,
    "packageUnit" TEXT,
    "shipName" TEXT,
    "carrier" TEXT,
    "loadingPort" TEXT,
    "dischargePort" TEXT,
    "arrivalDate" DATETIME,
    "declarationDate" DATETIME,
    "clearanceDate" DATETIME,
    "customsDuty" REAL,
    "vat" REAL,
    "totalTax" REAL,
    "importId" INTEGER,
    "linkedAt" DATETIME,
    "rawData" TEXT,
    "lastSyncAt" DATETIME,
    "syncCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomsTracking_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportExport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomsTracking_blNumber_blYear_key" ON "CustomsTracking"("blNumber", "blYear");

-- CreateIndex
CREATE UNIQUE INDEX "CustomsTracking_declarationNumber_key" ON "CustomsTracking"("declarationNumber");
