export const REPLY_DATE_PLACEHOLDER_DEFS = [
  {
    key: "date",
    label: "Дата",
    token: "{{date}}",
    re: /\{\{\s*date\s*\}\}/i,
    inputType: "date" as const,
  },
  {
    key: "appointmentDate",
    label: "Дата записи",
    token: "{{appointmentDate}}",
    re: /\{\{\s*appointmentDate\s*\}\}/i,
    inputType: "datetime-local" as const,
  },
  {
    key: "dueDate",
    label: "Лабораторный срок",
    token: "{{dueDate}}",
    re: /\{\{\s*dueDate\s*\}\}/i,
    inputType: "datetime-local" as const,
  },
] as const;

export type ReplyDatePlaceholderKey =
  (typeof REPLY_DATE_PLACEHOLDER_DEFS)[number]["key"];

export type ReplyDatePlaceholderDef =
  (typeof REPLY_DATE_PLACEHOLDER_DEFS)[number];

/** YYYY-MM-DDTHH:mm из datetime-local или ISO. */
export function localInputToDatetimeLocal(
  value: string | null | undefined,
): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(t);
  return m?.[1] ?? "";
}

export function collectReplyDatePlaceholdersInHaystack(
  haystack: string,
): ReplyDatePlaceholderDef[] {
  return REPLY_DATE_PLACEHOLDER_DEFS.filter((def) => def.re.test(haystack));
}

export function initialReplyDatePickerValues(
  defs: readonly ReplyDatePlaceholderDef[],
  dueDateLocal: string,
  appointmentLocal: string,
): Partial<Record<ReplyDatePlaceholderKey, string>> {
  const out: Partial<Record<ReplyDatePlaceholderKey, string>> = {};
  for (const def of defs) {
    if (def.key === "date") {
      const ymd =
        /(\d{4}-\d{2}-\d{2})/.exec(dueDateLocal.trim())?.[1] ??
        /(\d{4}-\d{2}-\d{2})/.exec(appointmentLocal.trim())?.[1] ??
        "";
      if (ymd) out.date = ymd;
    } else if (def.key === "appointmentDate") {
      const v = localInputToDatetimeLocal(appointmentLocal);
      if (v) out.appointmentDate = v;
    } else if (def.key === "dueDate") {
      const v = localInputToDatetimeLocal(dueDateLocal);
      if (v) out.dueDate = v;
    }
  }
  return out;
}
