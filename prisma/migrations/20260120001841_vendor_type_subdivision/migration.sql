-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DOMESTIC_PURCHASE',
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

-- Transform existing data:
-- DOMESTIC -> DOMESTIC_PURCHASE (as default for domestic vendors)
-- INTERNATIONAL -> INTERNATIONAL_PURCHASE (as default for international vendors)
-- OVERSEAS -> INTERNATIONAL_PURCHASE (legacy value)
INSERT INTO "new_Vendor" ("address", "code", "contactPerson", "country", "createdAt", "currency", "email", "id", "memo", "name", "phone", "type", "updatedAt") 
SELECT 
    "address", 
    "code", 
    "contactPerson", 
    "country", 
    "createdAt", 
    "currency", 
    "email", 
    "id", 
    "memo", 
    "name", 
    "phone", 
    CASE 
        WHEN "type" = 'DOMESTIC' THEN 'DOMESTIC_PURCHASE'
        WHEN "type" = 'INTERNATIONAL' THEN 'INTERNATIONAL_PURCHASE'
        WHEN "type" = 'OVERSEAS' THEN 'INTERNATIONAL_PURCHASE'
        ELSE 'DOMESTIC_PURCHASE'
    END as "type",
    "updatedAt" 
FROM "Vendor";

DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
