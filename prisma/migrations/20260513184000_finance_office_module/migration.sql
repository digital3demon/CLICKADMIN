ALTER TYPE "AppModule" ADD VALUE IF NOT EXISTS 'FINANCE_OFFICE';

DO $$
BEGIN
  IF to_regclass('"Order"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'Order'
         AND column_name = 'financeCalculated'
     )
  THEN
    ALTER TABLE "Order"
      ADD COLUMN "financeCalculated" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
