-- AlterTable - Make itemId nullable and add productId to InventoryMovement
-- Step 1: Create new table with updated schema
CREATE TABLE "InventoryMovement_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movementDate" DATETIME NOT NULL,
    "itemId" INTEGER,
    "productId" INTEGER,
    "lotId" INTEGER,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 2: Copy data from old table to new table
INSERT INTO "InventoryMovement_new" ("id", "movementDate", "itemId", "lotId", "type", "quantity", "unitCost", "totalCost", "refType", "refId", "createdAt")
SELECT "id", "movementDate", "itemId", "lotId", "type", "quantity", "unitCost", "totalCost", "refType", "refId", "createdAt"
FROM "InventoryMovement";

-- Step 3: Drop old table
DROP TABLE "InventoryMovement";

-- Step 4: Rename new table to original name
ALTER TABLE "InventoryMovement_new" RENAME TO "InventoryMovement";
