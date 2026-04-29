export type KaitenAdminDueTimeOption = {
  id: string;
  label: string;
  /** Минуты от полуночи в выбранный календарный день (МСК); null если не задаётся */
  minutes: number | null;
  /** false — в шапке карточки только дата DD.MM; true — ещё и время (только текст title, не поле срока Kaiten) */
  sendTimeToKaiten: boolean;
};

export const DEFAULT_KAITEN_ADMIN_DUE_OPTIONS: KaitenAdminDueTimeOption[] = [
  {
    id: "09",
    label: "09:00",
    minutes: 9 * 60,
    sendTimeToKaiten: true,
  },
  {
    id: "14",
    label: "14:00",
    minutes: 14 * 60,
    sendTimeToKaiten: true,
  },
  {
    id: "day",
    label: "В течение дня",
    minutes: null,
    sendTimeToKaiten: false,
  },
];

export function parseAdminDueTimeOptionsJson(raw: string): KaitenAdminDueTimeOption[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v) || v.length === 0) return DEFAULT_KAITEN_ADMIN_DUE_OPTIONS;
    const out: KaitenAdminDueTimeOption[] = [];
    for (const row of v) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id.trim() : "";
      const label = typeof o.label === "string" ? o.label.trim() : "";
      if (!id || !label) continue;
      const minutes =
        o.minutes === null || o.minutes === undefined
          ? null
          : typeof o.minutes === "number" && Number.isFinite(o.minutes)
            ? o.minutes
            : null;
      const sendTimeToKaiten = Boolean(o.sendTimeToKaiten);
      out.push({ id, label, minutes, sendTimeToKaiten });
    }
    return out.length > 0 ? out : DEFAULT_KAITEN_ADMIN_DUE_OPTIONS;
  } catch {
    return DEFAULT_KAITEN_ADMIN_DUE_OPTIONS;
  }
}

export function stringifyAdminDueTimeOptions(opts: KaitenAdminDueTimeOption[]): string {
  return JSON.stringify(opts, null, 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Собирает UTC ISO для поля заказа dueToAdminsAt.
 * Время задаётся в часовом поясе Europe/Moscow через фиксированный offset +03:00.
 */
export function buildDueToAdminsAtIso(
  dateStr: string,
  option: KaitenAdminDueTimeOption,
): string | null {
  const t = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  if (option.sendTimeToKaiten && option.minutes != null) {
    const h = Math.floor(option.minutes / 60);
    const m = option.minutes % 60;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    const d = new Date(`${t}T${pad2(h)}:${pad2(m)}:00+03:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  const d = new Date(`${t}T00:00:00+03:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
