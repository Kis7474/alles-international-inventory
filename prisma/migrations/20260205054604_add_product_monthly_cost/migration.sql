-- CreateTable
CREATE TABLE "ProductMonthlyCost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "baseCost" REAL NOT NULL,
    "storageCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductMonthlyCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable - Add currentCost and lastCostUpdatedAt to Product
-- SQLite doesn't support ALTER TABLE ADD COLUMN with constraints easily
-- These fields are nullable so we can add them directly
ALTER TABLE "Product" ADD COLUMN "currentCost" REAL;
ALTER TABLE "Product" ADD COLUMN "lastCostUpdatedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "ProductMonthlyCost_productId_yearMonth_key" ON "ProductMonthlyCost"("productId", "yearMonth");

-- CreateIndex
CREATE INDEX "ProductMonthlyCost_yearMonth_idx" ON "ProductMonthlyCost"("yearMonth");
