-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN "settingsRoles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[];
