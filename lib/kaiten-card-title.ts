function capPart(part: string): string {
  if (!part) return part;
  const lower = part.toLocaleLowerCase("ru-RU");
  return lower.charAt(0).toLocaleUpperCase("ru-RU") + lower.slice(1);
}

function looksLikeInitialToken(t: string): boolean {
  const core = t.replace(/\./g, "").trim();
  if (core.length !== 1) return false;
  return /[А-Яа-яЁёA-Za-z]/.test(core);
}

/** Одна буква + точка из токена «И», «И.» */
function initialFromToken(t: string): string {
  const c = t.replace(/\./g, "").trim().charAt(0);
  if (!c) return "";
  return c.toLocaleUpperCase("ru-RU") + ".";
}

/** Первая буква слова + точка (полное имя или отчество). */
function initialFromWord(word: string): string {
  const m = word.match(/[А-Яа-яЁёA-Za-z]/);
  if (!m) return "";
  return m[0].toLocaleUpperCase("ru-RU") + ".";
}

/**
 * Сокращает ФИО для шапки Kaiten: всегда «Фамилия И.О.» (инициалы без пробела между ними).
 * Поддерживаются полное ФИО, «Фамилия Имя Отчество», «Фамилия И. О.», «Фамилия И.О.» и т.п.
 */
export function formatRussianPersonShort(
  raw: string | null | undefined,
): string {
  if (raw == null || !String(raw).trim()) return "—";
  const parts = String(raw)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (parts.length === 0) return "—";

  const surname = capPart(parts[0]);
  if (parts.length === 1) return surname;

  if (parts.length === 2) {
    const p1 = parts[1];
    const compact = p1.match(
      /^([А-Яа-яЁёA-Za-z])\.([А-Яа-яЁёA-Za-z])\.?$/u,
    );
    if (compact) {
      return `${surname} ${compact[1].toLocaleUpperCase("ru-RU")}.${compact[2].toLocaleUpperCase("ru-RU")}.`;
    }
    if (looksLikeInitialToken(p1)) {
      return `${surname} ${initialFromToken(p1)}`;
    }
    return `${surname} ${initialFromWord(p1)}`;
  }

  const p1 = parts[1];
  const p2 = parts[2];

  if (looksLikeInitialToken(p1) && looksLikeInitialToken(p2)) {
    return `${surname} ${initialFromToken(p1)}${initialFromToken(p2)}`;
  }
  if (looksLikeInitialToken(p1) && !looksLikeInitialToken(p2)) {
    return `${surname} ${initialFromToken(p1)}${initialFromWord(p2)}`;
  }
  if (!looksLikeInitialToken(p1) && looksLikeInitialToken(p2)) {
    return `${surname} ${initialFromWord(p1)}${initialFromToken(p2)}`;
  }

  return `${surname} ${initialFromWord(p1)}${initialFromWord(p2)}`;
}

/** DD.MM и при includeTime — время HH:mm по Москве (для срока в шапке карточки / печати). */
export function formatKaitenAdminDue(
  d: Date | null | undefined,
  includeTime = true,
): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    ...(includeTime
      ? { hour: "2-digit" as const, minute: "2-digit" as const, hour12: false }
      : {}),
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const day = (map.day ?? "").padStart(2, "0");
  const month = (map.month ?? "").padStart(2, "0");
  if (!includeTime) {
    return `${day}.${month}`;
  }
  const hour = (map.hour ?? "0").padStart(2, "0");
  const minute = (map.minute ?? "0").padStart(2, "0");
  return `${day}.${month} ${hour}:${minute}`;
}

/** Фрагмент для второй строки заголовка: «КЭФ 1,5» (после работы, до даты админам). */
function formatKaitenUrgentCoefForTitle(c: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(c);
}

/** Заголовок карточки Kaiten: две строки — наряд/пациент и врач/работа/срок. */
export function buildKaitenCardTitle(
  order: {
    orderNumber: string;
    patientName: string | null;
    doctor: { fullName: string };
    /** Срок лабораторный (дата/время в шапке Kaiten, канбана и печатного наряда). */
    dueDate: Date | null;
    /** Если false — в шапке только дата без времени (редко для лабораторного срока). */
    kaitenLabDueHasTime?: boolean | null;
    /** Если задан — в шапке вместо названия типа карточки */
    kaitenCardTitleLabel?: string | null;
    kaitenCardType?: { name: string } | null;
    isUrgent?: boolean;
    urgentCoefficient?: number | null;
  },
): string {
  const num = order.orderNumber.trim() || "—";
  const patient = formatRussianPersonShort(order.patientName);
  const doctor = formatRussianPersonShort(order.doctor.fullName);
  const custom = order.kaitenCardTitleLabel?.trim();
  const typeName = order.kaitenCardType?.name?.trim();
  const work =
    custom && custom.length > 0
      ? custom
      : typeName && typeName.length > 0
        ? typeName
        : "—";
  const labDue = formatKaitenAdminDue(
    order.dueDate,
    order.kaitenLabDueHasTime !== false,
  );

  const coef =
    order.isUrgent &&
    order.urgentCoefficient != null &&
    Number.isFinite(Number(order.urgentCoefficient))
      ? ` КЭФ ${formatKaitenUrgentCoefForTitle(Number(order.urgentCoefficient))}`
      : "";

  const line1 = `${num} ${patient}`;
  const line2 = `${doctor} ${work}${coef} ${labDue}`;
  return `${line1}\n${line2}`;
}
