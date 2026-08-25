-- Дата выставления счёта. DATETIME ломает PostgreSQL (P3009); TIMESTAMP как остальные колонки Order.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceIssuedAt" TIMESTAMP(3);
