-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "AutomationDocumentType" AS ENUM ('SALES_STATEMENT', 'PURCHASE_STATEMENT', 'IMPORT_INVOICE', 'IMPORT_DECLARATION');

-- CreateEnum
CREATE TYPE "DocumentParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationDraftType" AS ENUM ('SALES_OUTBOUND');

-- CreateEnum
CREATE TYPE "AutomationDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED', 'FAILED');

-- AlterTable
ALTER TABLE "ImportExport"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paymentCheckedBy" INTEGER,
  ADD COLUMN "paymentCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesRecord"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paymentCheckedBy" INTEGER,
  ADD COLUMN "paymentCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AutomationDocument" (
  "id" TEXT NOT NULL,
  "type" "AutomationDocumentType" NOT NULL,
  "sourceFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "parseStatus" "DocumentParseStatus" NOT NULL DEFAULT 'PENDING',
  "parseAttempts" INTEGER NOT NULL DEFAULT 0,
  "parseError" TEXT,
  "extractedText" TEXT,
  "parsedAt" TIMESTAMP(3),
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationDraft" (
  "id" TEXT NOT NULL,
  "type" "AutomationDraftType" NOT NULL,
  "status" "AutomationDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "documentId" TEXT NOT NULL,
  "statementDate" TIMESTAMP(3),
  "vendorName" TEXT,
  "totalAmount" DOUBLE PRECISION,
  "approvedById" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationDraftLine" (
  "id" SERIAL NOT NULL,
  "draftId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "rawItemName" TEXT NOT NULL,
  "normalizedItemName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "matchedProductId" INTEGER,
  "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationDraftLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationDocument_parseStatus_createdAt_idx" ON "AutomationDocument"("parseStatus", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationDocument_checksum_idx" ON "AutomationDocument"("checksum");

-- CreateIndex
CREATE INDEX "AutomationDraft_status_createdAt_idx" ON "AutomationDraft"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationDraftLine_draftId_lineNo_key" ON "AutomationDraftLine"("draftId", "lineNo");

-- AddForeignKey
ALTER TABLE "AutomationDocument" ADD CONSTRAINT "AutomationDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationDraft" ADD CONSTRAINT "AutomationDraft_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AutomationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationDraft" ADD CONSTRAINT "AutomationDraft_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationDraftLine" ADD CONSTRAINT "AutomationDraftLine_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "AutomationDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationDraftLine" ADD CONSTRAINT "AutomationDraftLine_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
