import ExcelJS from "exceljs";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

export type ImportRowInput = {
  rowNumber: number;
  orderNumber: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  statusLabel: string;
  prostheticsText: string;
  registeredByText: string;
  createdAtText: string;
  notes: string;
  clientOrderText: string;
  additionalSourceNotesText: string;
  dueDateText: string;
  appointmentDateText: string;
  appointmentTimeText: string;
  quantityText: string;
  correctionTrackText: string;
  workReceivedAtText: string;
  shippedDescription: string;
  reconciliationText: string;
  paymentText: string;
  invoicedText: string;
  amountText: string;
  createKaitenCard: boolean;
};

type DoctorRef = { id: string; fullName: string };
type ClinicRef = { id: string; name: string };
export type PriceListItemRef = { id: string; code: string; name: string };

function hasUnclosedParen(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")" && depth > 0) depth -= 1;
  }
  return depth > 0;
}

function lineLooksLikeNewInvoicedItem(line: string): boolean {
  const v = line.trim();
  if (!v) return false;
  if (/^\d{3,6}\b/.test(v)) return true;
  return /^(аналог|титанов|абатмент|винт|коронка|модель|протетика)\b/i.test(v);
}

export function splitInvoicedText(inputRaw: string): string[] {
  const src = String(inputRaw ?? "").trim();
  if (!src) return [];
  const lines = src
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const merged: string[] = [];
  let current = "";
  for (const line of lines) {
    if (!current) {
      current = line;
      continue;
    }
    if (hasUnclosedParen(current)) {
      current = `${current} ${line}`;
      continue;
    }
    if (lineLooksLikeNewInvoicedItem(line)) {
      merged.push(current);
      current = line;
      continue;
    }
    current = `${current} ${line}`;
  }
  if (current) merged.push(current);

  return merged
    .flatMap((s) => s.split(/[;,]+/g))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasProstheticsKeywords(inputRaw: string): boolean {
  const t = normalizeHumanText(String(inputRaw ?? ""));
  if (!t) return false;
  return /\b(протетик|аналог|титанов|абатмент|винт)\b/.test(t);
}

export const ORDER_IMPORT_EXPORT_HEADERS = [
  "Номер",
  "Пациент",
  "Доктор",
  "Клиника",
  "Статус",
  "Протетика",
  "Занес",
  "Зашла",
  "Оформ",
  "Заказ, расшифровка",
  "Комментарий",
  "Что еще есть к работе",
  "Дата",
  "Прием",
  "Время",
  "Кол-во ед.",
  "Коррекция",
  "Отгружено",
  "Сверка",
  "Оплата",
  "Выставлено",
  "Сумма",
  "Карточка в кайтен/канбан создана",
] as const;

type HeaderKey = (typeof ORDER_IMPORT_EXPORT_HEADERS)[number];

const HEADER_ALIASES: Record<HeaderKey, string[]> = {
  Номер: ["номер"],
  Пациент: ["пациент"],
  Доктор: ["доктор"],
  Клиника: ["клиника"],
  Статус: ["статус"],
  Протетика: [
    "протетика",
    "протетика заказана/ прислал врач",
    "протетика заказана",
  ],
  Занес: ["занес"],
  Зашла: ["зашла"],
  Оформ: ["оформ"],
  "Заказ, расшифровка": ["заказ, расшифровка", "заказ расшифровка"],
  Комментарий: ["комментарий", "комментарии"],
  "Что еще есть к работе": [
    "что еще есть к работе",
    "что ещё есть к работе",
    "исходные данные",
    "дополнительно к работе",
  ],
  Дата: ["дата"],
  Прием: ["прием", "приём"],
  Время: ["время"],
  "Кол-во ед.": ["кол-во ед.", "кол во ед", "кол-во", "количество"],
  Коррекция: ["коррекция"],
  Отгружено: ["отгружено"],
  Сверка: ["сверка"],
  Оплата: ["оплата"],
  Выставлено: ["выставлено"],
  Сумма: ["сумма"],
  "Карточка в кайтен/канбан создана": [
    "карточка в кайтен/канбан создана",
    "карточка в кайтен канбан создана",
    "создать карточку в кайтен/канбан",
    "создать карточку в кайтен",
    "создать карточку",
  ],
};

function normText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const vv = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (typeof vv.text === "string") return vv.text.trim();
    if (typeof vv.result === "string" || typeof vv.result === "number") {
      return String(vv.result).trim();
    }
    if (Array.isArray(vv.richText)) {
      return vv.richText.map((x) => x.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

function normalizeHumanText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,;:()"'`«»/\\_-]+/g, " ")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0]?.trim() ?? "";
}

function beforeComma(value: string): string {
  return value.split(",")[0]?.trim() ?? "";
}

function beforeAddressMarker(value: string): string {
  const src = String(value ?? "").trim();
  if (!src) return "";
  // Не используем \b: для кириллицы word-boundary в JS часто даёт промахи.
  const parts = normalizeHumanText(src).split(" ").filter(Boolean);
  const markers = new Set([
    "ул",
    "улица",
    "проспект",
    "просп",
    "пр",
    "наб",
    "набережная",
    "шоссе",
    "бул",
    "бульвар",
    "д",
    "дом",
  ]);
  const idx = parts.findIndex((p) => markers.has(p));
  if (idx <= 0) return src;
  return parts.slice(0, idx).join(" ");
}

function timeCellToString(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hh = String(value.getHours()).padStart(2, "0");
    const mm = String(value.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = parseExcelSerialDate(value);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return cellToString(value);
}

export function resolveDoctorId(inputRaw: string, doctors: DoctorRef[]): string | null {
  const input = inputRaw.trim();
  if (!input) return null;
  const direct = new Map<string, string>();
  const bySurname = new Map<string, DoctorRef[]>();
  for (const d of doctors) {
    const fullNorm = normalizeHumanText(d.fullName);
    const parts = fullNorm.split(" ").filter(Boolean);
    const surname = parts[0] ?? "";
    if (surname) {
      const list = bySurname.get(surname) ?? [];
      list.push(d);
      bySurname.set(surname, list);
    }
    const keys = new Set<string>([
      normalizeLookup(d.fullName),
      fullNorm,
      normalizeHumanText(personNameSurnameInitials(d.fullName)),
    ]);
    for (const k of keys) {
      if (k) direct.set(k, d.id);
    }
  }

  const candidates = new Set<string>([
    input,
    firstLine(input),
    beforeComma(firstLine(input)),
    beforeComma(input),
    input.includes(":") ? input.split(":").slice(-1).join(":").trim() : "",
  ]);
  const queryKeys = Array.from(candidates)
    .flatMap((c) => [
      normalizeLookup(c),
      normalizeHumanText(c),
      normalizeHumanText(personNameSurnameInitials(c)),
    ])
    .filter(Boolean);

  for (const key of queryKeys) {
    const hit = direct.get(key);
    if (hit) return hit;
  }

  const q = normalizeHumanText(beforeComma(firstLine(input)));
  if (!q) return null;
  const matches = doctors.filter((d) => {
    const full = normalizeHumanText(d.fullName);
    const short = normalizeHumanText(personNameSurnameInitials(d.fullName));
    return full.includes(q) || q.includes(full) || short.includes(q) || q.includes(short);
  });
  if (matches.length === 1) return matches[0].id;

  // Фолбэк: часто в Excel только фамилия. Берём только однозначное совпадение.
  const qParts = q.split(" ").filter(Boolean);
  const qSurname0 = qParts[0] ?? "";
  if (!qSurname0) return null;
  let qSurname = qSurname0;
  let surnameMatches = bySurname.get(qSurname) ?? [];
  if (surnameMatches.length === 0) {
    const idx = qParts.findIndex((p) => bySurname.has(p));
    if (idx >= 0) {
      qSurname = qParts[idx];
      surnameMatches = bySurname.get(qSurname) ?? [];
      qParts.splice(0, idx);
    }
  }
  if (surnameMatches.length === 1) return surnameMatches[0].id;
  if (surnameMatches.length === 0) return null;

  const qInitials = qParts.slice(1).map((w) => w[0]).filter(Boolean);
  if (qInitials.length === 0) return null;
  const byInitials = surnameMatches.filter((d) => {
    const parts = normalizeHumanText(d.fullName).split(" ").filter(Boolean);
    const initials = parts.slice(1).map((w) => w[0]).filter(Boolean);
    if (initials.length < qInitials.length) return false;
    return qInitials.every((ch, i) => initials[i] === ch);
  });
  return byInitials.length === 1 ? byInitials[0].id : null;
}

export function resolveClinicId(inputRaw: string, clinics: ClinicRef[]): string | null {
  const input = inputRaw.trim();
  if (!input) return null;
  const direct = new Map<string, Set<string>>();
  const clinicById = new Map<string, ClinicRef>();
  const addDirect = (key: string, id: string) => {
    if (!key) return;
    const set = direct.get(key) ?? new Set<string>();
    set.add(id);
    direct.set(key, set);
  };
  for (const c of clinics) {
    clinicById.set(c.id, c);
    const keys = new Set<string>([
      normalizeLookup(c.name),
      normalizeHumanText(c.name),
      normalizeHumanText(firstLine(c.name)),
      normalizeHumanText(beforeComma(c.name)),
      normalizeHumanText(beforeAddressMarker(c.name)),
    ]);
    for (const k of keys) {
      addDirect(k, c.id);
    }
  }
  const inputNormFull = normalizeHumanText(firstLine(input));
  const pickBestByTokens = (ids: Iterable<string>): string | null => {
    const list = Array.from(ids)
      .map((id) => clinicById.get(id))
      .filter((v): v is ClinicRef => Boolean(v));
    if (list.length === 0) return null;
    if (list.length === 1) return list[0].id;
    const qTokens = inputNormFull.split(" ").filter((t) => t.length >= 2);
    if (qTokens.length === 0) return null;
    const scored = list
      .map((c) => {
        const n = normalizeHumanText(c.name);
        const nTokens = new Set(n.split(" ").filter((t) => t.length >= 2));
        let score = 0;
        for (const t of qTokens) {
          if (nTokens.has(t)) score += 1;
        }
        return { id: c.id, score };
      })
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    const second = scored[1];
    if (!best || best.score <= 0) return null;
    if (!second || best.score > second.score) return best.id;
    return null;
  };
  const candidates = new Set<string>([
    input,
    firstLine(input),
    beforeComma(firstLine(input)),
    beforeComma(input),
    beforeAddressMarker(firstLine(input)),
    beforeAddressMarker(beforeComma(firstLine(input))),
  ]);
  for (const c of candidates) {
    const keys = [normalizeLookup(c), normalizeHumanText(c)];
    for (const key of keys) {
      if (!key) continue;
      const hits = direct.get(key);
      if (!hits || hits.size === 0) continue;
      if (hits.size === 1) return Array.from(hits)[0] ?? null;
      const best = pickBestByTokens(hits);
      if (best) return best;
    }
  }

  const q = inputNormFull || normalizeHumanText(beforeComma(firstLine(input)));
  if (!q) return null;
  const qTokens = q.split(" ").filter((t) => t.length >= 2);
  if (qTokens.length === 0) return null;
  const scored = clinics
    .map((c) => {
      const n = normalizeHumanText(c.name);
      const nTokens = new Set(n.split(" ").filter((t) => t.length >= 2));
      let score = 0;
      for (const t of qTokens) {
        if (nTokens.has(t)) score += /^\d+$/.test(t) ? 2 : 1;
      }
      if (n.includes(q)) score += 2;
      if (q.includes(n)) score += 1;
      return { id: c.id, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];
  if (best && best.score >= 3 && (!second || best.score > second.score)) {
    return best.id;
  }
  return null;
}

export function resolvePriceListItem(
  inputRaw: string,
  items: PriceListItemRef[],
): PriceListItemRef | null {
  const input = inputRaw
    .replace(/\*\s*\d+(?:[.,]\d+)?\s*\*/g, " ")
    .replace(/\s+\d+\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!input) return null;

  const byKey = new Map<string, PriceListItemRef>();
  for (const item of items) {
    const keys = new Set<string>([
      normalizeLookup(item.code),
      normalizeLookup(item.name),
      normalizeHumanText(item.name),
      normalizeHumanText(`${item.code} ${item.name}`),
    ]);
    for (const key of keys) {
      if (key) byKey.set(key, item);
    }
  }

  const candidates = new Set<string>([
    input,
    firstLine(input),
    beforeComma(firstLine(input)),
    beforeComma(input),
  ]);
  for (const c of candidates) {
    const keys = [normalizeLookup(c), normalizeHumanText(c)];
    for (const key of keys) {
      if (!key) continue;
      const hit = byKey.get(key);
      if (hit) return hit;
    }
  }

  const q = normalizeHumanText(beforeComma(firstLine(input)));
  if (!q) return null;
  const matches = items.filter((item) => {
    const byName = normalizeHumanText(item.name);
    const byBoth = normalizeHumanText(`${item.code} ${item.name}`);
    return byName.includes(q) || q.includes(byName) || byBoth.includes(q) || q.includes(byBoth);
  });
  return matches.length === 1 ? matches[0] : null;
}

export function resolvePriceListItemsForText(
  inputRaw: string,
  items: PriceListItemRef[],
): Array<{ token: string; item: PriceListItemRef | null }> {
  const tokens = splitInvoicedText(inputRaw);
  return tokens.map((token) => ({ token, item: resolvePriceListItem(token, items) }));
}

function toExcelColumn(index: number): string {
  let n = index;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out || "A";
}

function parseExcelSerialDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const fraction = serial - Math.floor(serial) + 1e-7;
  const secs = Math.floor(86400 * fraction);
  return new Date((utcValue + secs) * 1000);
}

export function parseExcelDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = parseExcelSerialDate(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const text = String(value).trim();
  if (!text) return null;

  const ru = text.match(
    /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2}))?$/,
  );
  if (ru) {
    const [, dd, mm, yyyy, hh = "0", min = "0"] = ru;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      0,
      0,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const iso = new Date(text);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function parseYesNo(value: unknown): boolean {
  const t = normText(value);
  if (!t) return false;
  return ["1", "true", "да", "yes", "y", "x"].includes(t);
}

export async function parseWorkbookImportRows(buffer: Uint8Array): Promise<{
  rows: ImportRowInput[];
  sheetName: string;
}> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    return { rows: [], sheetName: "" };
  }

  const headerRow = sheet.getRow(1);
  const colByHeader = new Map<HeaderKey, number>();
  const headerValues = headerRow.values as Array<unknown>;

  for (let col = 1; col < headerValues.length; col++) {
    const raw = normText(headerValues[col]);
    if (!raw) continue;
    for (const [header, aliases] of Object.entries(HEADER_ALIASES) as Array<
      [HeaderKey, string[]]
    >) {
      if (aliases.some((a) => raw === a || raw.includes(a))) {
        if (!colByHeader.has(header)) colByHeader.set(header, col);
      }
    }
  }

  const getCell = (row: ExcelJS.Row, header: HeaderKey): unknown => {
    const idx = colByHeader.get(header);
    if (!idx) return "";
    return row.getCell(idx).value;
  };

  const rows: ImportRowInput[] = [];
  let workNumber = 0;
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const orderNumber = cellToString(getCell(row, "Номер"));
    const patientName = cellToString(getCell(row, "Пациент"));
    const doctorName = cellToString(getCell(row, "Доктор"));
    const clinicName = cellToString(getCell(row, "Клиника"));
    const statusLabel = cellToString(getCell(row, "Статус"));
    const prostheticsText = cellToString(getCell(row, "Протетика"));
    const registeredByText = cellToString(getCell(row, "Занес"));
    const createdAtText = cellToString(getCell(row, "Оформ"));
    const notes = cellToString(getCell(row, "Комментарий"));
    const clientOrderText = cellToString(getCell(row, "Заказ, расшифровка"));
    const additionalSourceNotesText = cellToString(getCell(row, "Что еще есть к работе"));
    const dueDateText = cellToString(getCell(row, "Дата"));
    const appointmentDateText = cellToString(getCell(row, "Прием"));
    const appointmentTimeText = timeCellToString(getCell(row, "Время"));
    const quantityText = cellToString(getCell(row, "Кол-во ед."));
    const correctionTrackText = cellToString(getCell(row, "Коррекция"));
    const workReceivedAtText = cellToString(getCell(row, "Зашла"));
    const shippedDescription = cellToString(getCell(row, "Отгружено"));
    const reconciliationText = cellToString(getCell(row, "Сверка"));
    const paymentText = cellToString(getCell(row, "Оплата"));
    const invoicedText = cellToString(getCell(row, "Выставлено"));
    const amountText = cellToString(getCell(row, "Сумма"));
    const createKaitenCard = parseYesNo(
      getCell(row, "Карточка в кайтен/канбан создана"),
    );

    const hasData = [
      orderNumber,
      patientName,
      doctorName,
      clinicName,
      statusLabel,
      prostheticsText,
      registeredByText,
      createdAtText,
      notes,
      clientOrderText,
      additionalSourceNotesText,
      dueDateText,
      appointmentDateText,
      appointmentTimeText,
      quantityText,
      correctionTrackText,
      workReceivedAtText,
      shippedDescription,
      reconciliationText,
      paymentText,
      invoicedText,
      amountText,
    ].some((x) => x.length > 0);
    if (!hasData) continue;

    workNumber += 1;
    rows.push({
      rowNumber: workNumber,
      orderNumber,
      patientName,
      doctorName,
      clinicName,
      statusLabel,
      prostheticsText,
      registeredByText,
      createdAtText,
      notes,
      clientOrderText,
      additionalSourceNotesText,
      dueDateText,
      appointmentDateText,
      appointmentTimeText,
      quantityText,
      correctionTrackText,
      workReceivedAtText,
      shippedDescription,
      reconciliationText,
      paymentText,
      invoicedText,
      amountText,
      createKaitenCard,
    });
  }

  return { rows, sheetName: sheet.name };
}

export async function getMissingHeaderMessages(buffer: Uint8Array): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  const sheet = wb.worksheets[0];
  if (!sheet) return ["Файл не содержит листов Excel."];
  const values = (sheet.getRow(1).values as Array<unknown>).map((v) => normText(v));

  const hasAlias = (aliases: string[]) =>
    values.some((v) => aliases.some((a) => v === a || v.includes(a)));

  const required: Array<{ title: string; aliases: string[]; letter: string }> = [
    { title: "Доктор", aliases: HEADER_ALIASES["Доктор"], letter: "C" },
    { title: "Пациент", aliases: HEADER_ALIASES["Пациент"], letter: "B" },
    { title: "Прием", aliases: HEADER_ALIASES["Прием"], letter: "L" },
  ];

  const miss: string[] = [];
  for (const r of required) {
    if (!hasAlias(r.aliases)) {
      miss.push(
        `Не найдена обязательная колонка "${r.title}" (ожидалась в шаблоне около ${r.letter}).`,
      );
    }
  }
  return miss;
}

export function buildExportWorkbookRows(
  orders: Array<{
    orderNumber: string;
    patientName: string | null;
    doctorName: string;
    clinicName: string | null;
    statusLabel: string;
    prostheticsText: string | null;
    registeredByLabel: string | null;
    workReceivedAt: Date | null;
    createdAt: Date;
    clientOrderText: string | null;
    notes: string | null;
    additionalSourceNotesText: string | null;
    dueDate: Date | null;
    appointmentDate: Date | null;
    correctionTrack: string | null;
    shippedDescription: string | null;
    reconciliationLabel: string;
    paymentLabel: string | null;
    kaitenCardCreated: boolean;
    invoiceParsedSummaryText: string | null;
    invoiceParsedTotalRub: number | null;
    constructionsCount: number;
  }>,
): Array<Array<string | number>> {
  return orders.map((o) => {
    const appointment = o.appointmentDate;
    const appointmentTime =
      appointment != null
        ? `${String(appointment.getHours()).padStart(2, "0")}:${String(
            appointment.getMinutes(),
          ).padStart(2, "0")}`
        : "";
    return [
      o.orderNumber,
      o.patientName ?? "",
      o.doctorName,
      o.clinicName ?? "",
      o.statusLabel,
      o.prostheticsText?.trim() || "",
      o.registeredByLabel ?? "",
      o.workReceivedAt ? o.workReceivedAt.toLocaleString("ru-RU") : "",
      o.createdAt.toLocaleString("ru-RU"),
      o.clientOrderText ?? "",
      o.notes ?? "",
      o.additionalSourceNotesText ?? "",
      o.dueDate ? o.dueDate.toLocaleDateString("ru-RU") : "",
      o.appointmentDate ? o.appointmentDate.toLocaleDateString("ru-RU") : "",
      appointmentTime,
      o.constructionsCount,
      o.correctionTrack ?? "",
      o.shippedDescription ?? "",
      o.reconciliationLabel,
      o.paymentLabel ?? "",
      o.invoiceParsedSummaryText ?? "",
      o.invoiceParsedTotalRub ?? "",
      o.kaitenCardCreated ? "Да" : "Нет",
    ];
  });
}

export function makeTemplateFileName(range?: {
  from?: string | null;
  to?: string | null;
}): string {
  const from = String(range?.from ?? "").trim();
  const to = String(range?.to ?? "").trim();
  if (from && to) {
    return `Выгрузка работ за ${from} - ${to}.xlsx`;
  }
  if (from) {
    return `Выгрузка работ за ${from}.xlsx`;
  }
  if (to) {
    return `Выгрузка работ за начало - ${to}.xlsx`;
  }
  return "Выгрузка работ за все время.xlsx";
}

export function correctionTrackFromText(
  value: string,
): "ORTHOPEDICS" | "ORTHODONTICS" | "REWORK" | null {
  const t = normText(value);
  if (!t) return null;
  if (t.includes("передел")) return "REWORK";
  if (t.includes("ортодон")) return "ORTHODONTICS";
  if (t.includes("ортопед")) return "ORTHOPEDICS";
  return null;
}

export function normalizeLookup(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function combineAppointmentDateTime(
  dateText: string,
  timeText: string,
): Date | null {
  const date = parseExcelDate(dateText);
  if (!date) return null;
  const time = String(timeText ?? "").trim();
  if (!time) return date;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return date;
  date.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return date;
}

export function templateHeaderWithLetters(): Array<{ letter: string; title: string }> {
  return ORDER_IMPORT_EXPORT_HEADERS.map((title, idx) => ({
    letter: toExcelColumn(idx + 1),
    title,
  }));
}
