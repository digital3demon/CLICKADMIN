-- Колонки добавляет scripts/ensure-doctor-extra-columns-sqlite.cjs (идемпотентно, учёт duplicate column).
-- Раньше здесь были два ALTER — падало, если orderPriceListKind уже был в БД (db push / ручной SQL).

SELECT 1;
