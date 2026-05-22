-- Keep mail list and label filters fast as the mailbox grows.
CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_receivedAt_id_idx"
ON "Email"("tenantId", "accountId", "receivedAt", "id");

CREATE INDEX IF NOT EXISTS "Email_tenantId_accountId_direction_receivedAt_id_idx"
ON "Email"("tenantId", "accountId", "direction", "receivedAt", "id");

CREATE INDEX IF NOT EXISTS "EmailLabelAssignment_tenantId_labelId_emailId_idx"
ON "EmailLabelAssignment"("tenantId", "labelId", "emailId");
