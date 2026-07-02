import { isoToDatetimeLocal } from "@/lib/datetime-local";
import { snapDatetimeLocalToDueGrid } from "@/lib/order-due-datetime";

type EmailTimestampFields = {
  receivedAt?: Date | string | null;
  sentAt?: Date | string | null;
  createdAt?: Date | string | null;
};

function parseEmailTimestamp(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Как в MailLayout при открытии наряда из почты: receivedAt → sentAt → createdAt. */
export function emailEffectiveReceivedAt(email: EmailTimestampFields): Date | null {
  return (
    parseEmailTimestamp(email.receivedAt) ??
    parseEmailTimestamp(email.sentAt) ??
    parseEmailTimestamp(email.createdAt)
  );
}

/** Самое раннее время среди писем-источников (когда работа фактически «зашла»). */
export function earliestEmailReceivedAt(
  emails: ReadonlyArray<EmailTimestampFields>,
): Date | null {
  let best: Date | null = null;
  for (const email of emails) {
    const at = emailEffectiveReceivedAt(email);
    if (!at) continue;
    if (!best || at.getTime() < best.getTime()) best = at;
  }
  return best;
}

/** Значение для DueDatetimeComboPicker «Поступление» из писем в форме нового наряда. */
export function workReceivedLocalFromSourceEmails(
  emails: ReadonlyArray<EmailTimestampFields>,
): string {
  const at = earliestEmailReceivedAt(emails);
  if (!at) return "";
  return snapDatetimeLocalToDueGrid(isoToDatetimeLocal(at.toISOString()));
}

export function hasWorkReceivedFromSourceEmails(
  emails: ReadonlyArray<EmailTimestampFields>,
): boolean {
  return workReceivedLocalFromSourceEmails(emails).trim().length > 0;
}
