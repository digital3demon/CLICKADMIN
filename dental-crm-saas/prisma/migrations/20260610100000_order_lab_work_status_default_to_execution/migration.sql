-- Ранее здесь был `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT`, который не поддерживается
-- SQLite в вашей сборке (ошибка «near ALTER: syntax error»).
-- Значение по умолчанию для новых нарядов задаётся в Prisma: `labWorkStatus @default(TO_EXECUTION)`.
-- Достаточно пустой миграции, чтобы цепочка `migrate deploy` продолжилась.
SELECT 1;
