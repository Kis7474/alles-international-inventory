-- DropIndex
DROP INDEX "CustomsTracking_declarationNumber_key";

-- CreateIndex
CREATE INDEX "declaration_idx" ON "CustomsTracking"("declarationNumber");
