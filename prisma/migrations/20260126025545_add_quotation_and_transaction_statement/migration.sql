-- CreateTable
CREATE TABLE "Quotation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotationNumber" TEXT NOT NULL,
    "quotationDate" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "customerName" TEXT,
    "customerRef" TEXT,
    "customerPhone" TEXT,
    "customerFax" TEXT,
    "customerEmail" TEXT,
    "salesPersonName" TEXT,
    "salesPersonPhone" TEXT,
    "subtotal" REAL NOT NULL,
    "vatAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "validityPeriod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quotationId" INTEGER NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionStatement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statementNumber" TEXT NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "recipientName" TEXT,
    "recipientRef" TEXT,
    "recipientPhone" TEXT,
    "recipientFax" TEXT,
    "subtotal" REAL NOT NULL,
    "vatAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "paymentTerms" TEXT,
    "bankAccount" TEXT,
    "receiverName" TEXT,
    "receiverSignature" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TransactionStatementItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "statementId" INTEGER NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransactionStatementItem_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "TransactionStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionStatement_statementNumber_key" ON "TransactionStatement"("statementNumber");
