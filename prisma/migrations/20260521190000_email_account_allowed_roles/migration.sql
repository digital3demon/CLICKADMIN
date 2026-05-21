-- Mailboxes are private by creator unless the owner explicitly enables roles.
ALTER TABLE "EmailAccount"
ADD COLUMN "allowedRoles" "UserRole"[] NOT NULL DEFAULT ARRAY['OWNER']::"UserRole"[];
