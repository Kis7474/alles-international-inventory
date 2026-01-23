-- AlterTable
ALTER TABLE "CustomsTracking" ADD COLUMN "forwarderCode" TEXT;
ALTER TABLE "CustomsTracking" ADD COLUMN "forwarderName" TEXT;
ALTER TABLE "CustomsTracking" ADD COLUMN "pdfFileName" TEXT;
ALTER TABLE "CustomsTracking" ADD COLUMN "pdfFilePath" TEXT;
ALTER TABLE "CustomsTracking" ADD COLUMN "pdfUploadedAt" DATETIME;

-- AlterTable
ALTER TABLE "ImportExport" ADD COLUMN "pdfFileName" TEXT;
ALTER TABLE "ImportExport" ADD COLUMN "pdfFilePath" TEXT;
ALTER TABLE "ImportExport" ADD COLUMN "pdfUploadedAt" DATETIME;
