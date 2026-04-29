-- AlterTable
ALTER TABLE "Order" ADD COLUMN "compositionDiscountPercent" REAL NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderConstruction" ADD COLUMN "lineDiscountPercent" REAL NOT NULL DEFAULT 0;
