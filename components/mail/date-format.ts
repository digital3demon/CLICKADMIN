const MAIL_TIME_ZONE = "Europe/Moscow";

function dateParts(value: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: MAIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

function isSameMoscowDay(a: Date, b: Date): boolean {
  const left = dateParts(a);
  const right = dateParts(b);
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function mailListDateLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isSameMoscowDay(date, new Date())) {
    return date.toLocaleTimeString("ru-RU", {
      timeZone: MAIL_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("ru-RU", {
    timeZone: MAIL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mailFullDateLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    timeZone: MAIL_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mailPrimaryDateValue(email: {
  direction: "INBOUND" | "OUTBOUND" | "DRAFT";
  receivedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}): string | null {
  if (email.direction === "OUTBOUND") return email.sentAt || email.receivedAt || email.createdAt;
  return email.receivedAt || email.sentAt || email.createdAt;
}
