-- Код сброса пароля: владелец выдаёт сотруднику, тот задаёт новый пароль на /login/forgot.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);
