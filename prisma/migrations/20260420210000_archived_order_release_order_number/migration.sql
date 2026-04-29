-- Архивные наряды: снять номер вида YYMM-NNN с уникального поля, чтобы его можно было выдать снова.
UPDATE "Order"
SET "orderNumber" = 'ARCH:' || "id"
WHERE "archivedAt" IS NOT NULL
  AND "orderNumber" NOT LIKE 'ARCH:%';
