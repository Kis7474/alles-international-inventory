-- CreateTable
CREATE TABLE "CustomsClearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blNumber" TEXT NOT NULL,
    "blYear" TEXT NOT NULL,
    "cargoNumber" TEXT,
    "status" TEXT NOT NULL,
    "declareNumber" TEXT,
    "productName" TEXT,
    "quantity" REAL,
    "weight" REAL,
    "arrivalDate" DATETIME,
    "declareDate" DATETIME,
    "clearanceDate" DATETIME,
    "customsDuty" REAL,
    "vat" REAL,
    "totalTax" REAL,
    "shippingCost" REAL,
    "importId" INTEGER,
    "syncedAt" DATETIME,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomsClearance_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportExport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomsClearance_blNumber_blYear_key" ON "CustomsClearance"("blNumber", "blYear");
