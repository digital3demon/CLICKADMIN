-- AlterTable: поле было в Prisma-схеме, но не попало в init_postgres
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reworkAtCustomerExpense" BOOLEAN NOT NULL DEFAULT false;
