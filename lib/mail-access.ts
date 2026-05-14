import "server-only";
import type { MailMailbox, UserRole } from "@prisma/client";

export function mailboxRoleAllowed(
  mailbox: Pick<MailMailbox, "accessRoles">,
  role: UserRole,
): boolean {
  if (role === "OWNER") return true;
  const raw = mailbox.accessRoles;
  if (!Array.isArray(raw) || raw.length === 0) return true;
  return raw.some((x) => x === role);
}
