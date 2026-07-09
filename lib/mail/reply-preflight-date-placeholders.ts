import {
  formatMailDate,
  formatMailDateTime,
  localInputToDateYmd,
} from "@/lib/mail/build-email-reply-context";

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

export type ReplyDatePickerEntry = {
  value: string;
  hasTime: boolean;
};

export type ReplyDatePickerState = Partial<
  Record<ReplyDatePlaceholderKey, ReplyDatePickerEntry>
>;

/** YYYY-MM-DDTHH:mm из datetime-local или ISO. */
export function localInputToDatetimeLocal(
  value: string | null | undefined,
): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(t);
  return m?.[1] ?? "";
}

export function parseReplyDatePickerLocal(value: string): {
  date: Date | null;
  ymd: string;
  hm: string | null;
} {
  const t = value.trim();
  if (!t) return { date: null, ymd: "", hm: null };
  const ymd = localInputToDateYmd(t);
  if (!ymd) return { date: null, ymd: "", hm: null };
  const hm = t.includes("T") ? parseHmFromLocal(t) : null;
  const d = hm
    ? new Date(`${ymd}T${hm}:00`)
    : new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), 12, 0, 0, 0);
  return {
    date: Number.isNaN(d.getTime()) ? null : d,
    ymd,
    hm,
  };
}

function parseHmFromLocal(local: string): string | null {
  const t = local.trim();
  if (!t.includes("T")) return null;
  const hm = t.slice(t.indexOf("T") + 1, t.indexOf("T") + 6);
  return /^\d{2}:\d{2}$/.test(hm) ? hm : null;
}

export function collectReplyDatePlaceholdersInHaystack(
  haystack: string,
): ReplyDatePlaceholderDef[] {
  return REPLY_DATE_PLACEHOLDER_DEFS.filter((def) => def.re.test(haystack));
}

export function initialReplyDatePickerState(
  defs: readonly ReplyDatePlaceholderDef[],
  dueDateLocal: string,
  appointmentLocal: string,
  opts?: { labWholeDay?: boolean; appointmentWholeDay?: boolean },
): ReplyDatePickerState {
  const out: ReplyDatePickerState = {};
  for (const def of defs) {
    if (def.key === "date") {
      // Ожидаемый срок отгрузки в письме — только для ответа, не из полей наряда.
      const ymd =
        localInputToDateYmd(dueDateLocal) ||
        /(\d{4}-\d{2}-\d{2})/.exec(dueDateLocal.trim())?.[1] ||
        "";
      if (ymd) out.date = { value: ymd, hasTime: false };
    } else if (def.key === "appointmentDate") {
      const wholeDay = opts?.appointmentWholeDay ?? false;
      const dt = localInputToDatetimeLocal(appointmentLocal);
      const ymd = localInputToDateYmd(appointmentLocal);
      const value = wholeDay ? ymd : dt || ymd;
      if (value) {
        out.appointmentDate = { value, hasTime: !wholeDay && Boolean(dt) };
      }
    } else if (def.key === "dueDate") {
      const wholeDay = opts?.labWholeDay ?? false;
      const dt = localInputToDatetimeLocal(dueDateLocal);
      const ymd = localInputToDateYmd(dueDateLocal);
      const value = wholeDay ? ymd : dt || ymd;
      if (value) {
        out.dueDate = { value, hasTime: !wholeDay && Boolean(dt) };
      }
    }
  }
  return out;
}

/** @deprecated используйте initialReplyDatePickerState */
export function initialReplyDatePickerValues(
  defs: readonly ReplyDatePlaceholderDef[],
  dueDateLocal: string,
  appointmentLocal: string,
): Partial<Record<ReplyDatePlaceholderKey, string>> {
  const state = initialReplyDatePickerState(defs, dueDateLocal, appointmentLocal);
  const out: Partial<Record<ReplyDatePlaceholderKey, string>> = {};
  for (const key of Object.keys(state) as ReplyDatePlaceholderKey[]) {
    out[key] = state[key]?.value;
  }
  return out;
}

export function formatReplyDateForEmailContext(
  def: ReplyDatePlaceholderDef,
  entry: ReplyDatePickerEntry | undefined,
): string {
  const value = entry?.value?.trim() ?? "";
  if (!value) return "";
  const datePart = formatMailDate(value);
  if (def.key === "date") {
    if (!entry?.hasTime) return `${datePart} в течение дня`;
    return formatMailDateTime(value);
  }
  if (!entry?.hasTime) return `${datePart} в течение дня`;
  return formatMailDateTime(value);
}

export function buildReplyDateDisplayByKey(
  defs: readonly ReplyDatePlaceholderDef[],
  state: ReplyDatePickerState,
): Partial<Record<ReplyDatePlaceholderKey, string>> {
  const out: Partial<Record<ReplyDatePlaceholderKey, string>> = {};
  for (const def of defs) {
    const formatted = formatReplyDateForEmailContext(def, state[def.key]);
    if (formatted) out[def.key] = formatted;
  }
  return out;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Оборачивает подставленные даты в кликабельные span для префлайта. */
/** Обновляет даты в сохранённых правках текста блоков (contentEditable без {{date}}). */
export function refreshReplyDatesInTextOverrides(
  textOverrides: Record<string, string>,
  defs: readonly ReplyDatePlaceholderDef[],
  prevState: ReplyDatePickerState,
  nextState: ReplyDatePickerState,
): Record<string, string> {
  let changed = false;
  const out = { ...textOverrides };
  for (const [blockId, text] of Object.entries(textOverrides)) {
    let updated = text;
    for (const def of defs) {
      const oldFmt = formatReplyDateForEmailContext(def, prevState[def.key]);
      const newFmt = formatReplyDateForEmailContext(def, nextState[def.key]);
      if (!oldFmt || !newFmt || oldFmt === newFmt) continue;
      if (updated.includes(oldFmt)) {
        updated = updated.split(oldFmt).join(newFmt);
        changed = true;
        continue;
      }
      // Старые сохранённые тексты могли содержать запятую перед «в течение дня».
      const legacyOldFmt = oldFmt.replace(
        /^(\d{2}\.\d{2}\.\d{2}) в течение дня$/,
        "$1, в течение дня",
      );
      if (legacyOldFmt !== oldFmt && updated.includes(legacyOldFmt)) {
        updated = updated.split(legacyOldFmt).join(newFmt);
        changed = true;
      }
    }
    if (updated !== text) out[blockId] = updated;
  }
  return changed ? out : textOverrides;
}

export function injectReplyInlineDatePickers(
  html: string,
  defs: readonly ReplyDatePlaceholderDef[],
  displayByKey: Partial<Record<ReplyDatePlaceholderKey, string>>,
): string {
  let out = stripReplyInlineDatePickers(html);
  for (const def of defs) {
    const text = displayByKey[def.key]?.trim();
    if (!text) continue;
    const span = `<span class="reply-inline-date-pick" data-reply-date-key="${def.key}" role="button" tabindex="0" contenteditable="false" title="Нажмите, чтобы изменить ${def.label.toLowerCase()}" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;text-decoration-color:#fb923c;">${text}</span>`;
    out = out.replace(new RegExp(escapeRegExp(text)), span);
  }
  return out;
}

export function stripReplyInlineDatePickers(html: string): string {
  return html.replace(
    /<span[^>]*data-reply-date-key="[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    "$1",
  );
}

export function replyDateStateToLegacyValues(
  state: ReplyDatePickerState,
): Partial<Record<ReplyDatePlaceholderKey, string>> {
  const out: Partial<Record<ReplyDatePlaceholderKey, string>> = {};
  for (const key of Object.keys(state) as ReplyDatePlaceholderKey[]) {
    out[key] = state[key]?.value;
  }
  return out;
}
