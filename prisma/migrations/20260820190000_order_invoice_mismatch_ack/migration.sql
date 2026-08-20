-- Подтверждение, что состав наряда и сумма счёта намеренно различаются.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceMismatchAckFingerprint" TEXT;
