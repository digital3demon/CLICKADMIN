/**
 * Импорт клиник и врачей из Excel (.xlsx) в SQLite через Prisma.
 *
 * Модель Clinic в БД заточена под CRM (наряды, реквизиты, счета), а не под полную копию Excel.
 * Дополнительно в БД: ЭДО, Сверка, Подписан (у договора) → поля клиники; «Работаем от Юр.лица» → billingLegalForm (ИП/ООО) у клиники.
 * По-прежнему не переносим: сроки договоров, СБИС, «Сделать», TG и пр.
 *
 * Что читаем (заголовки ищутся по подстроке, кроме точных алиасов):
 *   Клиника — краткое имя (name)
 *   Полное наименование* — legalFullName
 *   Адрес — address
 *   Реквизиты для оплаты — текст: парсим ИНН/КПП/ОГРН/БИК/р/с/к/с, юр. адрес, банк; иначе дублируем в legalFullName первую осмысленную строку
 *   E-mail (счёт) — колонка с «счёт»/«счета», без «договор»/«прайс» → email
 *   E-mail договор/прайс — в notes
 *   Номер договора: колонка V — для ООО (contractNumber), колонка AA — для ИП
 *   Клиника, контакты, заметки / Примечания / Работаем от Юр.лица — в notes
 *   Не активна — чекбокс: isActive = !колонка
 *   Ген.директор/Директор (не бухгалтер) — ceoName
 *   Доктора — врачи и связи M:N
 *
 * Формат: первая строка — заголовки. Обязательно для строки с данными — колонка клиники:
 *   Клиника / clinic / название / name / организация
 *
 * Одна строка = одна связка «клиника + (опционально) один или несколько врачей в ячейке».
 * Врачей в одной ячейке разделяем: переводы строк, «;», запятые между ФИО, либо подряд идущие тройки
 * слов (Фамилия Имя Отчество). Если врачей несколько в разных строках с тем же названием клиники —
 * клиника одна. Врач ищется по ФИО глобально.
 *
 * Нормализация полей (типовые ошибки Excel):
 *   — краткое имя (name): без адреса; адрес из второй+ строки ячейки, из хвоста « … г. …», из «, г. …»
 *     в одной строке — в поле address; если тот же текст есть в колонке «Адрес», дубли убираются;
 *     после сборки address повторный фрагмент адреса вырезается из названия;
 *   — доп. refine (clinic-cleanup-utils): хвост «неактивна» в названии → isActive=false; «Название /»; «ФИО + Москва, ул…»
 *     в одной строке; «Астра, Асгард» → первое имя + заметка; дубли в адресе;
 *     если после разбора название похоже на личное ФИО (2–3 слова) — не клиника: служебное имя «Клиника (…)» + заметка.
 *   — полное наименование: ИНН/КПП/ОГРН/БИК, приписанные к строке наименования, вырезаются в отдельные поля;
 *   — приоритет ИНН: отдельная колонка «ИНН» > блок «Реквизиты» > извлечено из наименования.
 *
 * Запуск из корня проекта (подхватывается .env с DATABASE_URL):
 *   node --env-file=.env scripts/import-clinics-xlsx.cjs путь/к/файлу.xlsx
 *
 * После смены логики разбора «Клиника»/ФИО старые записи с «длинным» именем клиники в БД не
 * совпадут с новым кратким именем — возможны дубликаты. Перед повторным импортом очистите тестовую БД
 * или объедините записи вручную.
 *
 * Готовый файл по умолчанию в репозитории:
 *   npm run import:clinics:1
 *   → data/imports/1.xlsx, лист «Контрагенты» (первый лист)
 *
 * Лист по умолчанию — первый. Другой лист:
 *   node --env-file=.env scripts/import-clinics-xlsx.cjs файл.xlsx "Имя листа"
 *
 * Только «работаем от юр.лица» → поле клиники billingLegalForm (ИП/ООО), без врачей и прочих полей:
 *   npm run sync:clinics:billing
 *   или: node --env-file=.env scripts/import-clinics-xlsx.cjs data/imports/1.xlsx --billing-only
 *
 * Синхронизация флагов из Excel (ЭДО, Сверка, Подписан, Активен/Не активна, юрлицо) — только обновление БД:
 *   npm run sync:clinics:excel
 *   или: node --env-file=.env scripts/import-clinics-xlsx.cjs data/imports/1.xlsx --sync-clinic-excel
 */

const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");
const { refineClinicNameAndAddress } = require("./clinic-cleanup-utils.cjs");

function loadEnvFallback() {
  if (process.env.DATABASE_URL) return;
  const p = path.join(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function normHeader(cell) {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function safeDateToIso(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  try {
    return d.toISOString();
  } catch {
    return "";
  }
}

function cellValueToString(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "boolean") {
    return "";
  }
  if (typeof value === "object") {
    if (value instanceof Date) return safeDateToIso(value);
    // ExcelJS: формулы и общие формулы — брать вычисленное значение
    if (
      Object.prototype.hasOwnProperty.call(value, "result") &&
      value.result != null
    ) {
      if (value.result instanceof Date) {
        return safeDateToIso(value.result);
      }
      if (typeof value.result === "object" && value.result !== null) {
        return cellValueToString(value.result);
      }
      if (typeof value.result === "boolean") {
        return "";
      }
      return String(value.result).trim();
    }
    if (Array.isArray(value) && value.result != null) {
      return String(value.result).trim();
    }
    if (value.richText && Array.isArray(value.richText)) {
      return value.richText.map((p) => p.text || "").join("").trim();
    }
    if (value.text != null) return String(value.text).trim();
  }
  return String(value).trim();
}

/** Строка листа как массив ячеек (как у sheet_to_json header:1). */
function excelRowToArray(row) {
  const arr = [];
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    while (arr.length < colNumber) arr.push("");
    arr[colNumber - 1] = cellValueToString(cell.value);
  });
  while (arr.length > 0 && arr[arr.length - 1] === "") {
    arr.pop();
  }
  return arr;
}

function buildHeaderMap(headerRow) {
  const map = new Map();
  headerRow.forEach((cell, i) => {
    const n = normHeader(cell);
    if (n) map.set(n, i);
  });
  return map;
}

function colIndex(map, aliases) {
  for (const a of aliases) {
    const n = normHeader(a);
    if (map.has(n)) return map.get(n);
  }
  return undefined;
}

/** Заголовок содержит подстроку (после нормализации). */
function colIndexContains(headerMap, fragment) {
  const n = normHeader(fragment);
  if (!n) return undefined;
  for (const [key, idx] of headerMap) {
    if (key.includes(n)) return idx;
  }
  return undefined;
}

function colIndexContainsAll(headerMap, fragments) {
  const norms = fragments.map((f) => normHeader(f)).filter(Boolean);
  if (!norms.length) return undefined;
  for (const [key, idx] of headerMap) {
    if (norms.every((nn) => key.includes(nn))) return idx;
  }
  return undefined;
}

function colIndexInvoiceEmail(headerMap) {
  for (const [key, idx] of headerMap) {
    if (!key.includes("e-mail") && !key.includes("email")) continue;
    if (key.includes("договор") || key.includes("прайс")) continue;
    if (key.includes("счет") || key.includes("счёт")) return idx;
  }
  for (const [key, idx] of headerMap) {
    if (key.includes("e-mail") || key.includes("email")) return idx;
  }
  return undefined;
}

function colIndexContractEmail(headerMap) {
  for (const [key, idx] of headerMap) {
    if (!key.includes("e-mail") && !key.includes("email")) continue;
    if (key.includes("договор") || key.includes("прайс")) return idx;
  }
  return undefined;
}

function colIndexDirector(headerMap) {
  for (const [key, idx] of headerMap) {
    if (key.includes("бухгалтер")) continue;
    if (key.includes("директор")) return idx;
  }
  return undefined;
}

function readInactiveRaw(ws, excelRow1Based, iInactive0Based) {
  if (iInactive0Based === undefined) return null;
  const v = ws.getRow(excelRow1Based).getCell(iInactive0Based + 1).value;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (
    v &&
    typeof v === "object" &&
    Object.prototype.hasOwnProperty.call(v, "result")
  ) {
    if (v.result === true || v.result === 1) return true;
    if (v.result === false || v.result === 0) return false;
  }
  return null;
}

/**
 * Из текста «Реквизиты для оплаты» — типовые поля РФ; остальное не дублируем в отдельные колонки Excel.
 * Важно: в JS \b не считает границей слова кириллицу, поэтому для ИНН/КПП и т.д. не используем \b.
 */
function parseRequisitesRuBlob(text) {
  const out = {};
  const t = String(text || "").replace(/\r/g, "");
  if (!t.trim()) return out;

  const innM = t.match(/ИНН[:\s]*(\d{10}|\d{12})(?!\d)/iu);
  if (innM) out.inn = innM[1];
  const kppM = t.match(/КПП[:\s]*(\d{9})(?!\d)/iu);
  if (kppM) out.kpp = kppM[1];
  const ogrnM = t.match(/ОГРН[ИП]?[:\s]*(\d{13}|\d{15})(?!\d)/iu);
  if (ogrnM) out.ogrn = ogrnM[1];
  const bikM = t.match(/БИК[:\s]*(\d{9})(?!\d)/iu);
  if (bikM) out.bik = bikM[1];
  const rsM = t.match(
    /(?:Р\s*[/\\]\s*с|Р[/\\]с|Расч[ёе]тн[ыой]+\s+сч[её]т)[^0-9]*(\d{20})\b/i,
  );
  if (rsM) out.settlementAccount = rsM[1];
  const ksM = t.match(
    /(?:К\s*[/\\]\s*с|К[/\\]с|Корр\.?\s*сч[её]т)[^0-9]*(\d{20})\b/i,
  );
  if (ksM) out.correspondentAccount = ksM[1];
  const jurM = t.match(
    /(?:Юр\.\s*адрес|Юридический\s+адрес)[:\s]*([^\n]+)/i,
  );
  if (jurM) out.legalAddress = jurM[1].trim();

  const bankLine = t.match(/Банк\s+([^\n]+)/i);
  if (bankLine) out.bankName = bankLine[1].trim();

  const first = t
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.length > 3);
  if (first && /ООО|ИП|ПАО|АО|«|»|"/.test(first)) {
    out.legalFullNameHint = first;
  }
  return out;
}

/** Строка похожа на фрагмент почтового адреса РФ. */
function lineLooksLikeAddressLine(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (/^\d{6}\s*,/u.test(t)) return true;
  if (/\d+\s*этаж/u.test(t)) return true;
  if (/^(г|ул|просп|пр|пер|шоссе|б-р|наб)\.\s+/iu.test(t)) return true;
  if (/(^|[\s,;·])(г|ул|просп|пр|пер)\.\s+/iu.test(t)) return true;
  if (/,\s*д\.?\s*\d/u.test(t) || /(^|[\s,])д\.?\s*\d+/iu.test(t)) return true;
  if (/пом\.|помещ|оф\.|офис/iu.test(t)) return true;
  // «614000, Пермский край» / индекс и регион без «г.»
  if (/^\d{6}\s*,\s*[А-Яа-яЁё]/u.test(t)) return true;
  if (/край\s*,|область\s*,|респ\./iu.test(t)) return true;
  return false;
}

/** Доп. разбор первой строки «Название, г. …» при многострочной ячейке. */
function attachPeelFromName(shortName, trailingAddress) {
  const peel = peelCommaSeparatedCityAddress(String(shortName || "").trim());
  if (!peel.tail) {
    return {
      shortName: String(shortName || "").trim(),
      trailingAddress: String(trailingAddress || "").trim(),
    };
  }
  const tail = [peel.tail, trailingAddress].filter(Boolean).join(", ");
  return { shortName: peel.name, trailingAddress: tail };
}

/**
 * Одна строка: «Название, г. Город, ул. …» — имя до «, г.».
 */
function peelCommaSeparatedCityAddress(singleLine) {
  const t = String(singleLine || "").trim();
  if (!t) return { name: "", tail: "" };
  const m = t.match(/^(.+)(,\s*г\.\s*.+)$/su);
  if (!m) return { name: t, tail: "" };
  const tail = m[2].replace(/^,\s*/, "").trim();
  if (tail.length < 6) return { name: t, tail: "" };
  const hasStreet =
    /(ул\.|пр\.|просп\.|д\.|пом\.|офис|этаж|край|область|респ\.|^\d{6})/iu.test(
      tail,
    );
  const onlyCity = /^г\.\s+[А-Яа-яЁёA-Za-z\-\s]+$/iu.test(tail);
  if (!hasStreet && !onlyCity) return { name: t, tail: "" };
  return { name: m[1].trim(), tail };
}

/** Убирает из краткого названия фрагменты, совпадающие с полем address (дубли из ячейки + колонки). */
function scrubAddressOutOfName(name, address) {
  const original = String(name || "").trim();
  let n = original;
  const addr = String(address || "").trim();
  if (!n || !addr || addr.length < 8) return n;

  const tryStrip = (fragment) => {
    const f = String(fragment || "").trim();
    if (f.length < 8) return;
    const fl = f.toLowerCase();
    let nl = n.toLowerCase();
    let idx = nl.indexOf(fl);
    while (idx >= 0) {
      n = (n.slice(0, idx) + n.slice(idx + f.length))
        .replace(/\s+/g, " ")
        .trim();
      n = n.replace(/^[,;\s]+|[,;\s]+$/g, "").trim();
      nl = n.toLowerCase();
      idx = nl.indexOf(fl);
    }
  };

  tryStrip(addr);
  for (const part of addr.split(",")) tryStrip(part);

  return n.length >= 2 ? n : original;
}

/**
 * Из ячейки «Клиника» отделяем краткое имя CRM и хвост, похожий на адрес (вторая строка или « … г. …»).
 */
function splitClinicDisplayName(raw) {
  const t = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!t) return { shortName: "", trailingAddress: "" };

  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Достаточно, чтобы вторая строка выглядела как адрес — не требуем «адресности» всех хвостовых строк
  if (lines.length >= 2 && lineLooksLikeAddressLine(lines[1])) {
    return attachPeelFromName(
      lines[0].trim(),
      lines.slice(1).join(", "),
    );
  }

  const gIdx = t.search(/\sг\.\s+[А-Яа-яЁё\-]/u);
  if (gIdx > 0) {
    const tail = t.slice(gIdx).trim();
    if (/(ул\.|пр\.|просп\.|д\.|пом\.|офис|,\s*д\.)/iu.test(tail)) {
      return attachPeelFromName(t.slice(0, gIdx).trim(), tail);
    }
  }

  const peeled = peelCommaSeparatedCityAddress(t);
  if (peeled.tail) {
    return { shortName: peeled.name, trailingAddress: peeled.tail };
  }

  return attachPeelFromName(t, "");
}

function normalizeAddrKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Колонка «Адрес» + хвост из названия: без дублирования одного и того же текста. */
function mergeAddressParts(fromColumn, fromNameCell) {
  const a = String(fromColumn ?? "").trim();
  const b = String(fromNameCell ?? "").trim();
  if (!a) return b;
  if (!b) return a;
  const na = normalizeAddrKey(a);
  const nb = normalizeAddrKey(b);
  if (na === nb) return a;
  if (na.length >= 12 && nb.includes(na.slice(0, Math.min(24, na.length)))) return a;
  if (nb.length >= 12 && na.includes(nb.slice(0, Math.min(24, nb.length)))) return b;
  return a;
}

/**
 * Вытаскивает ИНН/КПП/ОГРН/БИК из произвольного текста и убирает их из строки для legalFullName.
 */
function extractTaxIdsFromLegalBlob(text) {
  const raw = String(text ?? "").replace(/\r/g, "");
  const out = { cleaned: raw.trim(), inn: "", kpp: "", ogrn: "", bik: "" };
  if (!raw.trim()) return out;

  let t = raw;
  const innM = t.match(/ИНН[:\s]*(\d{10}|\d{12})(?!\d)/iu);
  if (innM && innM[0]) {
    const d = innM[0].match(/(\d{10}|\d{12})/);
    if (d) out.inn = d[1];
    t = t.replace(innM[0], " ");
  }
  const kppM = t.match(/КПП[:\s]*(\d{9})(?!\d)/iu);
  if (kppM && kppM[0]) {
    const d = kppM[0].match(/(\d{9})/);
    if (d) out.kpp = d[1];
    t = t.replace(kppM[0], " ");
  }
  const ogrnM = t.match(/ОГРН[ИП]?[:\s]*(\d{13}|\d{15})(?!\d)/iu);
  if (ogrnM && ogrnM[0]) {
    const d = ogrnM[0].match(/(\d{13}|\d{15})/);
    if (d) out.ogrn = d[1];
    t = t.replace(ogrnM[0], " ");
  }
  const bikM = t.match(/БИК[:\s]*(\d{9})(?!\d)/iu);
  if (bikM && bikM[0]) {
    const d = bikM[0].match(/(\d{9})/);
    if (d) out.bik = d[1];
    t = t.replace(bikM[0], " ");
  }

  out.cleaned = t
    .replace(/\s*[,;]+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,;\s]+|[,;\s]+$/g, "")
    .trim();
  return out;
}

/** Слово похоже на русское ФИО (фамилия/имя/отчество). */
function wordLooksLikeNamePart(w) {
  const s = String(w || "").trim();
  if (!s) return false;
  if (/^[А-ЯЁ][а-яё\-]{1,40}$/u.test(s)) return true;
  if (/^[А-ЯЁ]\.[А-ЯЁ]\.?$/u.test(s)) return true;
  return false;
}

function chunkLooksLikeTripleFio(chunk) {
  const words = String(chunk || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length !== 3) return false;
  return words.every(wordLooksLikeNamePart);
}

function dedupeDoctorNames(names) {
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const k = n.trim().toLowerCase().replace(/\s+/g, " ");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(n.trim());
  }
  return out;
}

/**
 * Разбор ячейки «Доктора»: несколько человек в одной ячейке → несколько строк ФИО.
 */
function splitDoctorCell(raw) {
  const t = String(raw ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!t) return [];

  const byDelim = t
    .split(/\n|;|；/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byDelim.length > 1) {
    const merged = [];
    for (const b of byDelim) merged.push(...splitDoctorCell(b));
    return dedupeDoctorNames(merged);
  }

  if (t.includes(",")) {
    const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => p.split(/\s+/).length >= 2)) {
      return dedupeDoctorNames(parts);
    }
  }

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return dedupeDoctorNames([t]);

  if (words.length >= 6 && words.length % 3 === 0) {
    const chunks = [];
    for (let i = 0; i < words.length; i += 3) {
      chunks.push(words.slice(i, i + 3).join(" "));
    }
    if (chunks.every(chunkLooksLikeTripleFio)) return dedupeDoctorNames(chunks);
  }

  return dedupeDoctorNames([t]);
}

/** Колонка «ИНН» (не путать с длинными составными заголовками). */
function colIndexInn(headerMap) {
  for (const [key, idx] of headerMap) {
    const k = key.trim();
    if (k === "инн" || /^инн\b/u.test(k)) return idx;
  }
  for (const [key, idx] of headerMap) {
    if (key.includes("инн") && key.length <= 24) return idx;
  }
  return undefined;
}

function cell(row, idx) {
  if (idx === undefined) return "";
  const v = row[idx];
  if (v == null) return "";
  return String(v).trim();
}

/** Первая колонка, у которой нормализованный заголовок совпадает с эталоном (важно при дублях «Подписан»). */
function colIndexNormEqualsInRow(headerRow, canonical) {
  const target = normHeader(canonical);
  if (!target) return undefined;
  for (let i = 0; i < headerRow.length; i++) {
    if (normHeader(headerRow[i]) === target) return i;
  }
  return undefined;
}

function readBooleanCell(ws, excelRow1Based, colIdx0) {
  if (colIdx0 === undefined) return null;
  const v = ws.getRow(excelRow1Based).getCell(colIdx0 + 1).value;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (
    v &&
    typeof v === "object" &&
    Object.prototype.hasOwnProperty.call(v, "result")
  ) {
    if (v.result === true || v.result === 1) return true;
    if (v.result === false || v.result === 0) return false;
  }
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (/^(да|истина|true|yes|1|\+)$/i.test(s)) return true;
  if (/^(нет|ложь|false|no|0|\-|–|—)$/i.test(s)) return false;
  return null;
}

/** ИП / ООО из ячейки «Работаем от Юр.лица». */
function parseBillingLegalForm(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const low = s.toLowerCase().replace(/\s+/g, " ");
  if (/^ооо\.?$/i.test(s) || /^ooo\.?$/i.test(s)) return "OOO";
  if (/^ип\.?$/i.test(s)) return "IP";
  if (/\bооо\b/u.test(s) || /\booo\b/i.test(s) || low.includes("общество"))
    return "OOO";
  if (/\bип\b/u.test(low) || low.includes("индивидуальн")) return "IP";
  if (low.includes("ооо") || low.includes("ooo")) return "OOO";
  if (low.includes(" ип") || low.startsWith("ип ") || low === "ип")
    return "IP";
  return null;
}

/** Excel V (22-й столбец) — номер договора для ООО; AA (27-й) — для ИП. Индексы 0-based в массиве строки. */
const EXCEL_COL_V_CONTRACT_OOO = 21;
const EXCEL_COL_AA_CONTRACT_IP = 26;

const CONTRACT_NUMBER_MAX_LEN = 500;

/**
 * Номер договора из фиксированных колонок V / AA по типу юрлица строки.
 * @returns {string|null|undefined} undefined — не менять в БД; null — очистить; строка — записать
 */
function readContractNumberForRow(row, billingForm) {
  const v = String(cell(row, EXCEL_COL_V_CONTRACT_OOO) ?? "")
    .trim()
    .slice(0, CONTRACT_NUMBER_MAX_LEN);
  const aa = String(cell(row, EXCEL_COL_AA_CONTRACT_IP) ?? "")
    .trim()
    .slice(0, CONTRACT_NUMBER_MAX_LEN);
  if (billingForm === "OOO") return v.length ? v : null;
  if (billingForm === "IP") return aa.length ? aa : null;
  return undefined;
}

/** Колонка «работаем от юр.лица» / «Работаем от Юр.лица» и варианты. */
function colIndexWorkingEntity(headerMap) {
  let idx = colIndexContainsAll(headerMap, ["работаем", "юр"]);
  if (idx !== undefined) return idx;
  for (const [key, i] of headerMap) {
    if (key.includes("работаем") && key.includes("юр")) return i;
  }
  for (const [key, i] of headerMap) {
    if (/работаем/.test(key) && /юр.*лиц|лиц.*юр/.test(key)) return i;
  }
  return undefined;
}

/**
 * «Активен» / «Активна»: да → isActive true. Не путать с «Не активна» (инверсия в основном импорте).
 */
function colIndexClinicActiveColumn(headerMap, headerRow) {
  const a = colIndexNormEqualsInRow(headerRow, "Активен");
  if (a !== undefined) return a;
  const b = colIndexNormEqualsInRow(headerRow, "Активна");
  if (b !== undefined) return b;
  for (const [key, idx] of headerMap) {
    if (key.includes("не актив")) continue;
    if (key === "активен" || key === "активна") return idx;
  }
  return undefined;
}

/**
 * @param {Record<string, string | boolean | undefined>} patch — поля Prisma Clinic (пустые строки не перезаписывают при update, кроме address)
 */
async function upsertClinicFromImport(prisma, name, patch) {
  const existing = await prisma.clinic.findFirst({ where: { name } });
  const data = {};
  const boolKeys = new Set([
    "worksWithReconciliation",
    "contractSigned",
    "worksWithEdo",
  ]);
  const enumKeys = new Set(["billingLegalForm"]);
  for (const [k, v] of Object.entries(patch)) {
    if (
      v === undefined ||
      k === "isActive" ||
      k === "address" ||
      k === "contractNumber" ||
      boolKeys.has(k) ||
      enumKeys.has(k)
    ) {
      continue;
    }
    if (typeof v === "string" && v.trim()) data[k] = v.trim();
  }
  if (patch.contractNumber !== undefined) {
    if (patch.contractNumber === null) {
      data.contractNumber = null;
    } else {
      const t = String(patch.contractNumber).trim().slice(0, CONTRACT_NUMBER_MAX_LEN);
      data.contractNumber = t.length ? t : null;
    }
  }
  if (!existing) {
    const addr =
      patch.address != null && String(patch.address).trim()
        ? String(patch.address).trim()
        : null;
    return prisma.clinic.create({
      data: {
        name,
        address: addr,
        isActive: patch.isActive !== undefined ? patch.isActive : true,
        worksWithReconciliation: Boolean(patch.worksWithReconciliation),
        contractSigned: Boolean(patch.contractSigned),
        worksWithEdo: Boolean(patch.worksWithEdo),
        billingLegalForm:
          patch.billingLegalForm === "IP" || patch.billingLegalForm === "OOO"
            ? patch.billingLegalForm
            : null,
        ...data,
      },
    });
  }
  const updateData = { ...data };
  if (patch.address !== undefined) {
    const a = String(patch.address ?? "").trim();
    updateData.address = a.length ? a : null;
  }
  if (patch.isActive !== undefined) updateData.isActive = patch.isActive;
  if (patch.worksWithReconciliation !== undefined) {
    updateData.worksWithReconciliation = patch.worksWithReconciliation;
  }
  if (patch.contractSigned !== undefined) {
    updateData.contractSigned = patch.contractSigned;
  }
  if (patch.worksWithEdo !== undefined) {
    updateData.worksWithEdo = patch.worksWithEdo;
  }
  if (patch.billingLegalForm !== undefined) {
    updateData.billingLegalForm =
      patch.billingLegalForm === "IP" || patch.billingLegalForm === "OOO"
        ? patch.billingLegalForm
        : null;
  }
  if (Object.keys(updateData).length === 0) return existing;
  return prisma.clinic.update({
    where: { id: existing.id },
    data: updateData,
  });
}

async function main() {
  loadEnvFallback();

  const argv = process.argv.slice(2).filter(Boolean);
  const billingOnly = argv.includes("--billing-only");
  const syncClinicExcel = argv.includes("--sync-clinic-excel");
  const posArgs = argv.filter(
    (a) => a !== "--billing-only" && a !== "--sync-clinic-excel",
  );
  const fileArg = posArgs[0];
  const sheetName = posArgs[1];

  if (!fileArg) {
    console.error(
      "Укажите путь к .xlsx:\n  node --env-file=.env scripts/import-clinics-xlsx.cjs клиники.xlsx",
    );
    process.exit(1);
  }

  const abs = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(abs)) {
    console.error("Файл не найден:", abs);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(abs);

  let ws =
    sheetName != null && sheetName !== ""
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

  if (!ws) {
    const names = workbook.worksheets.map((w) => w.name).join(", ");
    console.error("Лист не найден. Доступные:", names || "(нет)");
    process.exit(1);
  }

  const rows = [];
  ws.eachRow((row) => {
    rows.push(excelRowToArray(row));
  });

  if (rows.length < 2) {
    console.error("В файле нет строк данных (нужен заголовок и хотя бы одна строка).");
    process.exit(1);
  }

  const headerMap = buildHeaderMap(rows[0]);
  const iClinic = colIndex(headerMap, [
    "клиника",
    "clinic",
    "название",
    "name",
    "организация",
  ]);
  const iAddress = colIndex(headerMap, ["адрес", "address"]);
  const iDoctor = colIndex(headerMap, [
    "врач",
    "doctor",
    "доктора",
    "фио",
    "fullname",
    "врач фио",
  ]);

  const iLegalFull = colIndexContainsAll(headerMap, ["полное", "наименование"]);
  const iInn = colIndexInn(headerMap);
  const iRequisites = colIndexContainsAll(headerMap, ["реквизит", "оплат"]);
  const iContactsNotes = colIndexContainsAll(headerMap, ["контакт", "заметк"]);
  const iRemarks = colIndexContains(headerMap, "примечан");
  const iWorkingEntity = colIndexWorkingEntity(headerMap);
  const iInactive = colIndex(headerMap, ["не активна"]);
  const iCeo = colIndexDirector(headerMap);
  const iInvoiceMail = colIndexInvoiceEmail(headerMap);
  const iContractMail = colIndexContractEmail(headerMap);

  if (iClinic === undefined) {
    console.error(
      "Не найдена колонка клиники. Добавьте заголовок вроде «Клиника» или «clinic».",
    );
    console.error("Заголовки в файле:", rows[0].map(normHeader).filter(Boolean));
    process.exit(1);
  }

  if (billingOnly && iWorkingEntity === undefined) {
    console.error(
      "Режим --billing-only: не найдена колонка «работаем от юр.лица» (или аналог).",
    );
    console.error("Заголовки в файле:", rows[0].map(normHeader).filter(Boolean));
    process.exit(1);
  }

  const headerRow = rows[0];
  const iEdo = colIndexNormEqualsInRow(headerRow, "ЭДО");
  const iSverka = colIndexNormEqualsInRow(headerRow, "Сверка");
  const iPodpisanDogovor = colIndexNormEqualsInRow(headerRow, "Подписан");
  const iAktiven = colIndexClinicActiveColumn(headerMap, headerRow);

  if (syncClinicExcel) {
    console.log("[--sync-clinic-excel] найденные колонки:", {
      ЭДО: iEdo !== undefined,
      Сверка: iSverka !== undefined,
      Подписан: iPodpisanDogovor !== undefined,
      "Не активна": iInactive !== undefined,
      "Активен/Активна": iAktiven !== undefined,
      "Работаем от юр.лица": iWorkingEntity !== undefined,
      "Номер договора V (ООО) / AA (ИП)": true,
    });
    if (
      iEdo === undefined &&
      iSverka === undefined &&
      iPodpisanDogovor === undefined &&
      iInactive === undefined &&
      iAktiven === undefined &&
      iWorkingEntity === undefined
    ) {
      console.error(
        "[--sync-clinic-excel] ни одной из ожидаемых колонок не найдено. Заголовки:",
        rows[0].map(normHeader).filter(Boolean),
      );
      process.exit(1);
    }
  }

  const prisma = new PrismaClient();
  let clinicsTouched = 0;
  let doctorsCreated = 0;
  let linksCreated = 0;
  let rowsSkipped = 0;
  let rowErrors = 0;
  let billingUpdated = 0;
  let billingSkippedEmpty = 0;
  let billingSkippedNoForm = 0;
  let billingClinicNotFound = 0;
  let syncExcelUpdated = 0;
  let syncExcelNotFound = 0;
  let syncExcelSkippedNoFields = 0;
  let syncExcelBillingUnparsed = 0;

  try {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      try {
      const rawClinicCell = cell(row, iClinic);
      const { shortName: nameFromCell, trailingAddress } =
        splitClinicDisplayName(rawClinicCell);
      if (!nameFromCell) {
        rowsSkipped++;
        continue;
      }

      const addressCol = iAddress !== undefined ? cell(row, iAddress) : "";
      let address = mergeAddressParts(addressCol, trailingAddress);
      let clinicName = scrubAddressOutOfName(nameFromCell, address);
      const refined = refineClinicNameAndAddress(clinicName, address);
      clinicName = refined.name;
      address = refined.address;

      if (syncClinicExcel) {
        /** @type {Record<string, unknown>} */
        const data = {};

        const bEdo = readBooleanCell(ws, r + 1, iEdo);
        const bSverka = readBooleanCell(ws, r + 1, iSverka);
        const bPodp = readBooleanCell(ws, r + 1, iPodpisanDogovor);
        if (bEdo !== null) data.worksWithEdo = bEdo;
        if (bSverka !== null) data.worksWithReconciliation = bSverka;
        if (bPodp !== null) data.contractSigned = bPodp;

        let isActivePatch = undefined;
        const bAktiv = readBooleanCell(ws, r + 1, iAktiven);
        const inRaw = readInactiveRaw(ws, r + 1, iInactive);
        if (bAktiv !== null) isActivePatch = bAktiv;
        else if (inRaw !== null) isActivePatch = !inRaw;
        else if (refined.inactiveFromName) isActivePatch = false;
        if (isActivePatch !== undefined) data.isActive = isActivePatch;

        const workEntSync =
          iWorkingEntity !== undefined ? cell(row, iWorkingEntity) : "";
        if (String(workEntSync).trim()) {
          const bf = parseBillingLegalForm(workEntSync);
          if (bf === "IP" || bf === "OOO") data.billingLegalForm = bf;
          else syncExcelBillingUnparsed++;
        }

        const rowClinic = await prisma.clinic.findFirst({
          where: { name: clinicName, deletedAt: null },
        });
        if (!rowClinic) {
          syncExcelNotFound++;
          console.warn(
            "[--sync-clinic-excel] нет клиники в БД:",
            clinicName.slice(0, 100),
          );
          continue;
        }

        const billingForContract =
          data.billingLegalForm !== undefined
            ? data.billingLegalForm
            : rowClinic.billingLegalForm;
        const cnSync = readContractNumberForRow(row, billingForContract);
        if (cnSync !== undefined) data.contractNumber = cnSync;

        if (Object.keys(data).length === 0) {
          syncExcelSkippedNoFields++;
          continue;
        }

        await prisma.clinic.update({
          where: { id: rowClinic.id },
          data,
        });
        syncExcelUpdated++;
        clinicsTouched++;
        continue;
      }

      if (billingOnly) {
        const workEnt =
          iWorkingEntity !== undefined ? cell(row, iWorkingEntity) : "";
        if (!String(workEnt).trim()) {
          billingSkippedEmpty++;
          continue;
        }
        const billingForm = parseBillingLegalForm(workEnt);
        if (billingForm !== "IP" && billingForm !== "OOO") {
          billingSkippedNoForm++;
          console.warn(
            "[--billing-only] не распознано ИП/ООО:",
            clinicName.slice(0, 60),
            "|",
            String(workEnt).slice(0, 80),
          );
          continue;
        }
        const existing = await prisma.clinic.findFirst({
          where: { name: clinicName, deletedAt: null },
        });
        if (!existing) {
          billingClinicNotFound++;
          console.warn(
            "[--billing-only] нет клиники в БД:",
            clinicName.slice(0, 100),
          );
          continue;
        }
        const cnBill = readContractNumberForRow(row, billingForm);
        /** @type {Record<string, unknown>} */
        const billData = { billingLegalForm: billingForm };
        if (cnBill !== undefined) billData.contractNumber = cnBill;
        await prisma.clinic.update({
          where: { id: existing.id },
          data: billData,
        });
        billingUpdated++;
        clinicsTouched++;
        continue;
      }

      const doctorCell =
        iDoctor !== undefined ? cell(row, iDoctor) : "";
      const doctorNames = splitDoctorCell(doctorCell);

      const legalColRaw =
        iLegalFull !== undefined ? cell(row, iLegalFull) : "";
      const reqText =
        iRequisites !== undefined ? cell(row, iRequisites) : "";
      const parsed = parseRequisitesRuBlob(reqText);
      const legalFullNameHint = parsed.legalFullNameHint;
      delete parsed.legalFullNameHint;

      let taxFromLegal = extractTaxIdsFromLegalBlob(legalColRaw);
      if (legalFullNameHint) {
        const hintEx = extractTaxIdsFromLegalBlob(
          String(legalFullNameHint),
        );
        if (!taxFromLegal.cleaned.trim()) {
          taxFromLegal = {
            cleaned: hintEx.cleaned,
            inn: taxFromLegal.inn || hintEx.inn,
            kpp: taxFromLegal.kpp || hintEx.kpp,
            ogrn: taxFromLegal.ogrn || hintEx.ogrn,
            bik: taxFromLegal.bik || hintEx.bik,
          };
        } else {
          for (const k of ["inn", "kpp", "ogrn", "bik"]) {
            if (!taxFromLegal[k] && hintEx[k]) taxFromLegal[k] = hintEx[k];
          }
        }
      }
      const legalFullName = taxFromLegal.cleaned || "";

      const noteParts = [];
      for (const ne of refined.notesExtra) {
        if (String(ne || "").trim()) noteParts.push(ne.trim());
      }
      const contacts =
        iContactsNotes !== undefined ? cell(row, iContactsNotes) : "";
      if (contacts) noteParts.push(contacts);
      const remarks = iRemarks !== undefined ? cell(row, iRemarks) : "";
      if (remarks) noteParts.push(remarks);
      const workEnt =
        iWorkingEntity !== undefined ? cell(row, iWorkingEntity) : "";
      if (workEnt) noteParts.push(`Работаем от юр. лица: ${workEnt}`);
      const cMail =
        iContractMail !== undefined ? cell(row, iContractMail) : "";
      if (cMail) noteParts.push(`E-mail для договора/прайса: ${cMail}`);
      const notesCombined = noteParts.filter(Boolean).join("\n\n");

      const emailInv =
        iInvoiceMail !== undefined ? cell(row, iInvoiceMail) : "";
      const ceo = iCeo !== undefined ? cell(row, iCeo) : "";

      let isActivePatch = undefined;
      const inRaw = readInactiveRaw(ws, r + 1, iInactive);
      const bAktivFull = readBooleanCell(ws, r + 1, iAktiven);
      if (bAktivFull !== null) isActivePatch = bAktivFull;
      else if (inRaw !== null) isActivePatch = !inRaw;
      else if (refined.inactiveFromName) isActivePatch = false;

      /** @type {Record<string, string | boolean | undefined>} */
      const patch = {
        address,
        isActive: isActivePatch,
      };
      const bEdo = readBooleanCell(ws, r + 1, iEdo);
      const bSverka = readBooleanCell(ws, r + 1, iSverka);
      const bPodp = readBooleanCell(ws, r + 1, iPodpisanDogovor);
      if (bSverka !== null) patch.worksWithReconciliation = bSverka;
      if (bPodp !== null) patch.contractSigned = bPodp;
      if (bEdo !== null) patch.worksWithEdo = bEdo;

      if (legalFullName.trim()) patch.legalFullName = legalFullName.trim();
      if (emailInv) patch.email = emailInv;
      if (ceo) patch.ceoName = ceo;
      if (notesCombined) patch.notes = notesCombined;
      for (const k of [
        "kpp",
        "ogrn",
        "bik",
        "settlementAccount",
        "correspondentAccount",
        "legalAddress",
        "bankName",
      ]) {
        if (parsed[k]) patch[k] = parsed[k];
      }
      const innFromColumn = (() => {
        if (iInn === undefined) return "";
        const digits = String(cell(row, iInn) || "").replace(/\D/g, "");
        if (digits.length === 10 || digits.length === 12) return digits;
        return "";
      })();
      const innResolved =
        innFromColumn || parsed.inn || taxFromLegal.inn || "";
      if (innResolved) patch.inn = innResolved;
      for (const k of ["kpp", "ogrn", "bik"]) {
        if (!patch[k] && taxFromLegal[k]) patch[k] = taxFromLegal[k];
      }

      const billingForm = parseBillingLegalForm(workEnt);
      if (billingForm != null) patch.billingLegalForm = billingForm;

      const cnImport = readContractNumberForRow(row, billingForm);
      if (cnImport !== undefined) patch.contractNumber = cnImport;

      const clinic = await upsertClinicFromImport(prisma, clinicName, patch);
      clinicsTouched++;

      for (const doctorName of doctorNames) {
        if (!doctorName) continue;
        let doctor = await prisma.doctor.findFirst({
          where: { fullName: doctorName },
        });
        if (!doctor) {
          doctor = await prisma.doctor.create({
            data: { fullName: doctorName },
          });
          doctorsCreated++;
        }
        const existingLink = await prisma.doctorOnClinic.findFirst({
          where: { clinicId: clinic.id, doctorId: doctor.id },
        });
        if (!existingLink) {
          await prisma.doctorOnClinic.create({
            data: { doctorId: doctor.id, clinicId: clinic.id },
          });
          linksCreated++;
        }
      }
      } catch (err) {
        rowErrors++;
        const hint = cell(row, iClinic) || `строка ${r + 1}`;
        console.warn(
          "[импорт] пропуск строки:",
          hint.slice(0, 80),
          err?.message ?? err,
        );
      }
    }

    console.log(
      "Готово.",
      syncClinicExcel
        ? {
            режим: "--sync-clinic-excel",
            обновленоКлиник: syncExcelUpdated,
            нетВБд: syncExcelNotFound,
            строкБезИзменяемыхПолей: syncExcelSkippedNoFields,
            ячеекЮрлицаБезИпОоо: syncExcelBillingUnparsed,
            пропущеноПустыхКлиник: rowsSkipped,
            ошибокСтрок: rowErrors,
          }
        : billingOnly
          ? {
              режим: "--billing-only",
              обновленоЮрлицо: billingUpdated,
              пустаяЯчейкаЮрлица: billingSkippedEmpty,
              неРаспознаноИпОоо: billingSkippedNoForm,
              клиникаНеНайденаВБд: billingClinicNotFound,
              пропущеноПустыхКлиник: rowsSkipped,
              ошибокСтрок: rowErrors,
            }
          : {
              строкОбработано: rows.length - 1 - rowsSkipped,
              пропущеноПустыхКлиник: rowsSkipped,
              ошибокСтрок: rowErrors,
              клиникЗатронуто: clinicsTouched,
              врачейСоздано: doctorsCreated,
              связейВрачКлиника: linksCreated,
            },
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
