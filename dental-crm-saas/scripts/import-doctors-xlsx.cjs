/**
 * Импорт врачей из реестра Excel (лист «Врачи» или первый лист).
 *
 * Столбцы (заголовки по подстроке / алиасы):
 *   Фамилия врача — только фамилия в CRM: инициалы в конце ячейки отбрасываются (Г. А., В.Ф., С.)
 *   Имя, Отчество, Фамилия ранее, Номер телефона, Аккаунт в ТГ, Специальность, Клиника,
 *   e-mail, почта клиники (с которой присылают работы), День Рождения, Город
 *
 * Сопоставление: телефон → точное ФИО → фамилия+имя; плюс слияние «Фамилия И.О.» с карточкой
 * «Фамилия Имя Отчество» при той же фамилии и совпадении инициалов (разные клиники → одна карточка).
 * Строки-заметки («врач просил…», «гл.врач» без ФИО) пропускаются. Префиксы «врач/док/» снимаются.
 * «Почти пустые» строки (только фамилия / фамилия+инициалы без телефона, почты, клиники и т.д.) не импортируются.
 *
 * Клиника: ячейка как в реестре (многострочно). Поддерживается несколько клиник в одной ячейке:
 *   первая строка — название, следующие — адрес; либо строки «Название, ул. …».
 *   Раньше все строки после названия склеивались в один адрес — разные клиники попадали в одну карточку.
 *
 * Путь к файлу: аргумент, либо DOCTORS_IMPORT_XLSX в .env, либо data/imports/доктора.xlsx,
 * либо .xlsx в data/imports с «врач»/«докт» в имени (см. resolve-doctors-xlsx.cjs).
 *
 * Запуск из корня проекта:
 *   node --env-file=.env scripts/import-doctors-xlsx.cjs [путь.xlsx] [имя листа]
 *
 * npm run import:doctors
 */

const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");
const {
  resolveDoctorXlsxAbs,
  formatMissingHelp,
} = require("./resolve-doctors-xlsx.cjs");
const { isSparseSurnameOnlyRow } = require("./doctor-is-sparse.cjs");

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

function colIndexContains(headerMap, fragment) {
  const n = normHeader(fragment);
  if (!n) return undefined;
  for (const [key, idx] of headerMap) {
    if (key.includes(n)) return idx;
  }
  return undefined;
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
  if (typeof value === "boolean") return "";
  if (typeof value === "object") {
    if (value instanceof Date) return safeDateToIso(value);
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
      if (typeof value.result === "boolean") return "";
      return String(value.result).trim();
    }
    if (value.richText && Array.isArray(value.richText)) {
      return value.richText.map((p) => p.text || "").join("").trim();
    }
    if (value.text != null) return String(value.text).trim();
  }
  return String(value).trim();
}

function excelRowToArray(row) {
  const arr = [];
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    while (arr.length < colNumber) arr.push("");
    arr[colNumber - 1] = cellValueToString(cell.value);
  });
  while (arr.length > 0 && arr[arr.length - 1] === "") arr.pop();
  return arr;
}

function cell(row, idx) {
  if (idx === undefined) return "";
  const v = row[idx];
  if (v == null) return "";
  return String(v).trim();
}

/** Токен — инициалы (Г.  А.  В.Ф.  С.) */
function isInitialsToken(tok) {
  const x = String(tok || "").trim();
  if (!x) return false;
  if (/^[А-ЯЁA-Z]\.$/iu.test(x)) return true;
  if (/^[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.?$/iu.test(x)) return true;
  if (/^[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.$/iu.test(x)) return true;
  return false;
}

/**
 * Из ячейки «Фамилия врача» оставляем только фамилию (без хвоста инициалов).
 */
function extractSurnameOnly(familyCell) {
  const t = String(familyCell || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!t) return "";
  const tokens = t.split(" ");
  const parts = [];
  for (const tok of tokens) {
    if (isInitialsToken(tok)) break;
    parts.push(tok);
  }
  if (parts.length > 0) return parts.join(" ");
  return t;
}

/** Убираем «врач », «док. », «гл.врач » и т.п. перед фамилией. */
function stripRolePrefixFromFamilyCell(raw) {
  let t = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!t) return "";
  const patterns = [
    /^гл\.?\s*врач[,\s]*/iu,
    /^главный\s+врач[,\s]*/iu,
    /^врач[.\s]+/iu,
    /^доктор[.\s]+/iu,
    /^док\.?\s*/iu,
  ];
  let prev = "";
  while (prev !== t) {
    prev = t;
    for (const re of patterns) t = t.replace(re, "").trim();
  }
  return t.trim();
}

/** Заметки и служебный текст вместо ФИО — не создаём врача. */
function isGarbageFamilyCell(raw) {
  const t = String(raw || "").trim();
  if (!t) return true;
  if (t.length > 120) return true;
  const low = t.toLowerCase();
  const garbageHints = [
    "просил направлять",
    "направлять счета",
    "запрать",
    "отправить из дома",
    "отправляет в оплату",
    "он отправляет",
    "счета ему",
    "совладелец",
    "направлять в оплату",
  ];
  if (garbageHints.some((h) => low.includes(h))) return true;
  if (/^гл\.?\s*врач\s*$/iu.test(t)) return true;
  if (/^врач\s*$/iu.test(t)) return true;
  const hasCyrillicName = /[А-ЯЁа-яё]{2,}/.test(t);
  if (!hasCyrillicName) return true;
  return false;
}

function extractInitialLettersFromTail(tail) {
  const letters = [];
  const tokens = String(tail || "")
    .trim()
    .split(/\s+/);
  for (const tok of tokens) {
    if (!isInitialsToken(tok)) continue;
    const m = tok.match(/[А-ЯЁA-Za-z]/gi);
    if (m) letters.push(...m);
  }
  return letters;
}

function isRealGivenName(s) {
  const t = String(s || "").trim();
  if (t.length < 2) return false;
  if (/^[А-ЯЁA-Z]\.$/iu.test(t)) return false;
  if (/^[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.?$/iu.test(t)) return false;
  if (/^[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]\.$/iu.test(t)) return false;
  return true;
}

function initialsMatchFullName(letters, firstName, patronymic) {
  const f = String(firstName || "").trim();
  const p = String(patronymic || "").trim();
  if (!letters.length) return true;
  if (letters.length >= 1 && f && f[0].toLowerCase() !== letters[0].toLowerCase()) {
    return false;
  }
  if (letters.length >= 2 && p && p[0].toLowerCase() !== letters[1].toLowerCase()) {
    return false;
  }
  return true;
}

function familyTailAfterSurname(familyRaw, surname) {
  const t = String(familyRaw || "")
    .trim()
    .replace(/\s+/g, " ");
  const su = String(surname || "").trim();
  if (!t || !su) return "";
  const re = new RegExp(
    "^" + su.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+",
    "i",
  );
  if (re.test(t)) return t.replace(re, "").trim();
  const first = t.split(/\s+/)[0];
  if (first && first.toLowerCase() === su.toLowerCase()) {
    return t.slice(first.length).trim();
  }
  return "";
}

function doctorRichnessScore(d) {
  let s = 0;
  if (normalizePhoneDigits(d.phone).length >= 10) s += 20;
  if (d.telegramUsername) s += 3;
  if (d.email) s += 2;
  if (isRealGivenName(d.firstName)) s += 15;
  if (String(d.patronymic || "").trim().length > 3) s += 10;
  const fn = String(d.fullName || "").length;
  s += Math.min(fn, 40) / 4;
  return s;
}

function buildDoctorFullName(lastName, firstName, patronymic) {
  const a = [lastName, firstName, patronymic]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  if (a.length) return a.join(" ");
  return String(lastName || "").trim();
}

function normalizePhoneDigits(s) {
  let d = String(s || "").replace(/\D/g, "");
  if (d.length === 11 && d[0] === "8") d = "7" + d.slice(1);
  return d;
}

function parseBirthdayCell(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        12,
        0,
        0,
        0,
      ),
    );
  }
  const s = String(value).trim();
  const dm = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (dm) {
    const d = new Date(
      Date.UTC(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]), 12, 0, 0, 0),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const d = new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (isoPrefix) {
    const d = new Date(
      Date.UTC(
        Number(isoPrefix[1]),
        Number(isoPrefix[2]) - 1,
        Number(isoPrefix[3]),
        12,
        0,
        0,
        0,
      ),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function stripTelegramUsername(raw) {
  const s = String(raw || "").trim().replace(/^@+/, "");
  return s || "";
}

/** Строка похожа на фрагмент адреса (как в import-clinics-xlsx). */
function lineLooksLikeAddressLineDoctor(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  /** «5-я / 5-Я Красноармейская» — это улица, не название клиники */
  if (/^\d{1,2}-[Яяю]\s+/iu.test(t)) return true;
  if (/^\d{6}\s*,/u.test(t)) return true;
  if (/\d+\s*этаж/u.test(t)) return true;
  if (/^(г|ул|просп|пр|пер|шоссе|б-р|наб)\.\s+/iu.test(t)) return true;
  if (/(^|[\s,;·])(г|ул|просп|пр|пер|наб)\.\s+/iu.test(t)) return true;
  if (/,\s*д\.?\s*\d/u.test(t) || /(^|[\s,])д\.?\s*\d+/iu.test(t)) return true;
  if (/пом\.|помещ|оф\.|офис/iu.test(t)) return true;
  if (/^\d{6}\s*,\s*[А-Яа-яЁё]/u.test(t)) return true;
  if (/край\s*,|область\s*,|респ\./iu.test(t)) return true;
  return false;
}

/**
 * Левая часть от запятой не может быть названием клиники (только город / улица / N-я …).
 */
function addressOnlyLeftPart(left) {
  const s = String(left || "").trim();
  if (!s) return false;
  if (/^\d{1,2}-[Яяю]\s+/iu.test(s)) return true;
  if (/^г\.\s+[А-Яа-яЁёA-Za-z\-\s]+$/u.test(s)) return true;
  if (/^(ул\.|просп\.?|пер\.|наб\.|шоссе|б-р|пр\.)\s+/iu.test(s)) return true;
  if (/^(пос\.|п\.|дер\.|с\.)\s+/iu.test(s)) return true;
  if (/^к\.\s*\d/iu.test(s)) return true;
  return false;
}

/**
 * Одна строка «Название клиники, ул./наб./…» → две части.
 * Не режем «5-Я Красноармейская, д. 32» на имя клиники.
 */
function splitNameCommaStreetLine(line) {
  const t = String(line || "").trim();
  const m = t.match(/^(.+?),\s*(.+)$/su);
  if (!m) return null;
  const left = m[1].trim();
  const right = m[2].trim();
  if (left.length < 2 || right.length < 6) return null;
  if (addressOnlyLeftPart(left)) return null;
  if (!/(ул\.|просп|пер|наб\.|шоссе|б-р|пр\.|д\.|\d{6})/iu.test(right))
    return null;
  if (/^\d{6}\s*,/u.test(left) && !/[А-Яа-яЁёA-Za-z]{3,}/u.test(left))
    return null;
  return {
    clinicName: left.slice(0, 200),
    clinicAddress: right.slice(0, 2000),
  };
}

/** Строка «только адрес» без шаблона «Клиника, ул.» в начале ячейки. */
function lineIsOrphanAddressLine(t) {
  const s = String(t || "").trim();
  if (!s) return false;
  if (splitNameCommaStreetLine(s)) return false;
  return lineLooksLikeAddressLineDoctor(s);
}

/** Продолжение адреса к предыдущей клинике (в т.ч. хвост после склейки JSON). */
function lineLooksLikeAddressContinuation(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (splitNameCommaStreetLine(t)) return false;
  if (lineLooksLikeAddressLineDoctor(t)) return true;
  if (/^д\.?\s*\d/iu.test(t)) return true;
  if (/"\s*,\s*"/.test(t)) return true;
  if (
    /,\s*"[^"]*(?:[Дд]ент|[Кк]линик|[Dd]ental|[Ll]ab|[Сс]томат)/u.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * «5-Я …» / «г. …» в name и хвост адреса с кавычками (`…", "Клиника` или `…, , \"Клиника`).
 */
function splitSwapQuotedClinicTail(pair) {
  const clinicName = pair.clinicName;
  const addrRaw = String(pair.clinicAddress || "").trim();
  if (!addrRaw) return [pair];
  const addr = addrRaw
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\\"/g, '"')
    .trim();

  const nameBad =
    addressOnlyLeftPart(clinicName) ||
    /^\d{1,2}-[Яяю]\s/u.test(String(clinicName || "").trim());

  function trySwap(headAddr, quotedName) {
    const q = String(quotedName || "").trim();
    if (!q) return null;
    if (!nameBad) return null;
    if (addressOnlyLeftPart(q)) return null;
    if (/^к\.\s*\d/iu.test(q)) return null;
    const newAddress = [clinicName.trim(), String(headAddr || "").trim()]
      .filter(Boolean)
      .join("\n")
      .trim();
    return {
      clinicName: q.slice(0, 200),
      clinicAddress: newAddress.slice(0, 2000),
    };
  }

  let splitAt = -1;
  let nameStart = -1;
  const re = /"\s*,\s*"/g;
  let m;
  while ((m = re.exec(addr)) !== null) {
    splitAt = m.index;
    nameStart = m.index + m[0].length;
  }
  if (splitAt >= 0 && nameStart >= 0) {
    const headAddr = addr.slice(0, splitAt).replace(/^"+|"+$/g, "").trim();
    const quotedName = addr
      .slice(nameStart)
      .trim()
      .replace(/^"+|"+$/g, "")
      .trim();
    const r = trySwap(headAddr, quotedName);
    if (r) return [r];
  }

  const tm = addr.match(/,\s*(?:,\s*)?"([^"]+)"?\s*$/u);
  if (tm) {
    const headAddr = addr.slice(0, tm.index).trim();
    const r = trySwap(headAddr, tm[1]);
    if (r) return [r];
  }

  return [pair];
}

/**
 * Из ячейки «Клиника» — несколько пар (название, адрес), по одной на каждую клинику.
 */
function parseClinicCellToPairs(raw) {
  let t = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^["\s]+|["\s]+$/g, "")
    .trim();
  if (!t) return [];

  if (t.startsWith("[") && t.includes('"')) {
    try {
      const parsed = JSON.parse(t.replace(/\u00a0/g, " "));
      if (Array.isArray(parsed)) {
        t = parsed
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
          .join("\n");
      }
    } catch {
      /* оставляем как есть */
    }
  }

  const lines = t
    .split("\n")
    .map((l) => l.replace(/^["\s]+|["\s]+$/g, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  if (lines.length === 1) {
    const one = lines[0];
    const gIdx = one.search(/\sг\.\s+[А-Яа-яЁёA-Za-z\-]/u);
    if (gIdx > 0 && /(ул\.|пр\.|д\.|пом\.|шоссе)/iu.test(one.slice(gIdx))) {
      return [
        {
          clinicName: one.slice(0, gIdx).trim().slice(0, 200),
          clinicAddress: one.slice(gIdx).trim().slice(0, 2000),
        },
      ];
    }
  }

  const pairs = [];
  let i = 0;
  const leadingAddr = [];
  while (i < lines.length && lineIsOrphanAddressLine(lines[i])) {
    leadingAddr.push(lines[i]);
    i += 1;
  }

  const prependLeading = (addr) => {
    const a = String(addr || "").trim();
    if (!leadingAddr.length) return a.slice(0, 2000);
    const pre = leadingAddr.join("\n").trim();
    leadingAddr.length = 0;
    return [pre, a].filter(Boolean).join("\n").trim().slice(0, 2000);
  };

  while (i < lines.length) {
    const L = lines[i];

    if (pairs.length > 0 && lineLooksLikeAddressContinuation(L)) {
      const last = pairs[pairs.length - 1];
      last.clinicAddress = [last.clinicAddress, L].filter(Boolean).join("\n").trim().slice(0, 2000);
      i += 1;
      continue;
    }

    const comb = splitNameCommaStreetLine(L);
    if (comb) {
      pairs.push({
        clinicName: comb.clinicName,
        clinicAddress: prependLeading(comb.clinicAddress),
      });
      i += 1;
      continue;
    }

    if (lineIsOrphanAddressLine(L)) {
      leadingAddr.push(L);
      i += 1;
      continue;
    }

    const clinicName = L.slice(0, 200).trim();
    i += 1;
    const addrParts = [];
    while (i < lines.length) {
      const next = lines[i];
      if (splitNameCommaStreetLine(next)) break;
      if (
        lineLooksLikeAddressLineDoctor(next) ||
        addrParts.length > 0 ||
        lineLooksLikeAddressContinuation(next)
      ) {
        addrParts.push(next);
        i += 1;
        continue;
      }
      break;
    }
    if (clinicName) {
      pairs.push({
        clinicName,
        clinicAddress: prependLeading(addrParts.join(", ").trim()),
      });
    }
  }

  if (leadingAddr.length && pairs.length > 0) {
    const first = pairs[0];
    first.clinicAddress = [leadingAddr.join("\n"), first.clinicAddress]
      .filter(Boolean)
      .join("\n")
      .trim()
      .slice(0, 2000);
    leadingAddr.length = 0;
  }

  return pairs.flatMap((p) => splitSwapQuotedClinicTail(p));
}

async function findOrCreateClinic(prisma, name, address) {
  const n = name.trim().slice(0, 200);
  if (!n) return null;
  const a = String(address || "").trim();
  let c = await prisma.clinic.findFirst({ where: { name: n } });
  if (c) {
    /** Не дописываем адреса через \\n — чужие клиники из ячейки не слипаем. */
    if (a) {
      return prisma.clinic.update({
        where: { id: c.id },
        data: { address: a },
      });
    }
    return c;
  }
  return prisma.clinic.create({
    data: {
      name: n,
      address: a || null,
    },
  });
}

/** Совместимость: первая пара из ячейки. */
function parseClinicCell(raw) {
  const pairs = parseClinicCellToPairs(raw);
  if (pairs.length === 0) return { clinicName: "", clinicAddress: "" };
  return {
    clinicName: pairs[0].clinicName,
    clinicAddress: pairs[0].clinicAddress,
  };
}

/** Связи M:N по всем клиникам из многострочной ячейки. @returns число новых связей */
async function linkDoctorToClinicsFromCell(prisma, doctorId, clinicRaw) {
  let added = 0;
  for (const { clinicName, clinicAddress } of parseClinicCellToPairs(
    clinicRaw,
  )) {
    if (!clinicName) continue;
    const clinic = await findOrCreateClinic(prisma, clinicName, clinicAddress);
    if (!clinic) continue;
    const has = await prisma.doctorOnClinic.findUnique({
      where: {
        doctorId_clinicId: { doctorId, clinicId: clinic.id },
      },
    });
    if (!has) {
      await prisma.doctorOnClinic.create({
        data: { doctorId, clinicId: clinic.id },
      });
      added += 1;
    }
  }
  return added;
}

function strEqualNorm(a, b) {
  return (
    String(a || "")
      .trim()
      .toLowerCase() ===
    String(b || "")
      .trim()
      .toLowerCase()
  );
}

function collectInitialsFromNameFields(firstName, patronymic) {
  const letters = [];
  for (const s of [firstName, patronymic]) {
    const t = String(s || "").trim();
    if (!t) continue;
    if (isInitialsToken(t)) {
      const m = t.match(/[А-ЯЁA-Za-z]/gi);
      if (m) letters.push(...m);
    }
  }
  return letters;
}

function collectRowInitialLetters(familyCleaned, lastName, firstName, patronymic) {
  const fromFields = collectInitialsFromNameFields(firstName, patronymic);
  if (fromFields.length) return fromFields;
  const tail = familyTailAfterSurname(familyCleaned, lastName);
  return extractInitialLettersFromTail(tail);
}

function rowHasIdentityBeyondSurname(lastName, firstName, patronymic, familyCleaned) {
  const fnm = String(firstName || "").trim();
  const pat = String(patronymic || "").trim();
  if (isRealGivenName(fnm)) return true;
  if (pat.length >= 2 && !isInitialsToken(pat)) return true;
  const tail = familyTailAfterSurname(familyCleaned, lastName);
  if (extractInitialLettersFromTail(tail).length > 0) return true;
  if (collectInitialsFromNameFields(fnm, pat).length > 0) return true;
  return false;
}

function doctorMatchesSurnameFuzzy(c, letters, firstName, patronymic) {
  const fnm = String(firstName || "").trim();
  const pat = String(patronymic || "").trim();
  if (letters.length > 0) {
    return initialsMatchFullName(letters, c.firstName, c.patronymic);
  }
  if (pat.length >= 2 && !isInitialsToken(pat)) {
    return strEqualNorm(c.patronymic, pat);
  }
  if (fnm && isInitialsToken(fnm)) {
    const L = collectInitialsFromNameFields(fnm, pat);
    return L.length > 0 && initialsMatchFullName(L, c.firstName, c.patronymic);
  }
  return false;
}

async function findDoctorIdByNormalizedPhone(prisma, phoneRaw) {
  const digits = normalizePhoneDigits(phoneRaw);
  if (digits.length < 10) return null;
  const candidates = await prisma.doctor.findMany({
    select: { id: true, phone: true },
  });
  for (const d of candidates) {
    if (normalizePhoneDigits(d.phone) === digits) return d.id;
  }
  return null;
}

/**
 * @param {object} ctx
 * @param {string} ctx.fullName
 * @param {string} ctx.lastName
 * @param {string} ctx.firstName
 * @param {string} ctx.patronymic
 * @param {string} ctx.phoneRaw
 * @param {string} ctx.familyCleaned — фамилия после stripRolePrefix (как в строке Excel)
 */
async function findDoctorIdForUpsert(prisma, ctx) {
  const { fullName, lastName, firstName, patronymic, phoneRaw, familyCleaned } =
    ctx;
  const digits = normalizePhoneDigits(phoneRaw);
  if (digits.length >= 10) {
    const candidates = await prisma.doctor.findMany({
      select: { id: true, phone: true },
    });
    for (const d of candidates) {
      if (normalizePhoneDigits(d.phone) === digits) return d.id;
    }
  }
  const fn = String(fullName || "").trim();
  if (fn) {
    const byFn = await prisma.doctor.findFirst({
      where: { fullName: fn },
      select: { id: true },
    });
    if (byFn) return byFn.id;
  }
  const ln = String(lastName || "").trim();
  const fnm = String(firstName || "").trim();
  const pat = String(patronymic || "").trim();
  if (ln && fnm && isRealGivenName(fnm)) {
    const byParts = await prisma.doctor.findFirst({
      where: {
        lastName: ln,
        firstName: fnm,
        ...(pat ? { patronymic: pat } : {}),
      },
      select: { id: true },
    });
    if (byParts) return byParts.id;
    const loose = await prisma.doctor.findFirst({
      where: { lastName: ln, firstName: fnm },
      select: { id: true },
    });
    if (loose) return loose.id;
  }
  if (ln && !fnm && pat.length >= 3 && !isInitialsToken(pat)) {
    const byLnPat = await prisma.doctor.findFirst({
      where: { lastName: ln, patronymic: pat },
      select: { id: true },
    });
    if (byLnPat) return byLnPat.id;
  }

  if (!ln) return null;
  if (!rowHasIdentityBeyondSurname(ln, fnm, pat, familyCleaned)) return null;

  const letters = collectRowInitialLetters(familyCleaned, ln, fnm, pat);
  const candidates = await prisma.doctor.findMany({
    where: { lastName: ln },
    select: {
      id: true,
      firstName: true,
      patronymic: true,
      fullName: true,
      phone: true,
      telegramUsername: true,
      email: true,
    },
  });
  const matching = candidates.filter((c) =>
    doctorMatchesSurnameFuzzy(c, letters, fnm, pat),
  );
  if (matching.length === 0) return null;
  if (matching.length === 1) return matching[0].id;
  matching.sort((a, b) => doctorRichnessScore(b) - doctorRichnessScore(a));
  return matching[0].id;
}

function pickPersonNamePart(incoming, existing, kind) {
  const i = String(incoming || "").trim();
  const e = String(existing || "").trim();
  const iGood =
    kind === "first"
      ? isRealGivenName(i) || (i.length > 2 && !isInitialsToken(i))
      : i.length >= 3 && !isInitialsToken(i);
  const eGood =
    kind === "first"
      ? isRealGivenName(e) || (e.length > 2 && !isInitialsToken(e))
      : e.length >= 3 && !isInitialsToken(e);
  if (iGood && !eGood) return i || null;
  if (eGood && !iGood) return e || null;
  if (iGood && eGood) return i.length >= e.length ? i : e;
  if (i) return i;
  return e || null;
}

function preferLongerNonEmpty(inc, cur) {
  const i = String(inc || "").trim();
  const c = String(cur || "").trim();
  if (i && !c) return i;
  if (c && !i) return c;
  if (i && c) return i.length >= c.length ? i : c;
  return null;
}

function mergeDoctorPayload(existing, incoming) {
  const lastName =
    String(incoming.lastName || "").trim() || existing.lastName || null;
  const firstName = pickPersonNamePart(
    incoming.firstName,
    existing.firstName,
    "first",
  );
  const patronymic = pickPersonNamePart(
    incoming.patronymic,
    existing.patronymic,
    "pat",
  );
  const fullName = buildDoctorFullName(lastName, firstName, patronymic);

  const di = normalizePhoneDigits(incoming.phone);
  const de = normalizePhoneDigits(existing.phone);
  let phone = null;
  if (di.length >= 10) phone = String(incoming.phone || "").trim() || existing.phone;
  else if (de.length >= 10) phone = existing.phone || String(incoming.phone || "").trim() || null;
  else
    phone =
      String(incoming.phone || "").trim() || existing.phone || null;

  const telegramUsername =
    String(incoming.telegramUsername || "").trim() ||
    existing.telegramUsername ||
    null;
  const email = preferLongerNonEmpty(incoming.email, existing.email);
  const clinicWorkEmail = preferLongerNonEmpty(
    incoming.clinicWorkEmail,
    existing.clinicWorkEmail,
  );
  const specialty = preferLongerNonEmpty(incoming.specialty, existing.specialty);
  const city = preferLongerNonEmpty(incoming.city, existing.city);
  const formerLastName = preferLongerNonEmpty(
    incoming.formerLastName,
    existing.formerLastName,
  );

  const preferredContact =
    telegramUsername || existing.telegramUsername
      ? "Telegram"
      : existing.preferredContact || incoming.preferredContact || null;

  const birthday =
    incoming.birthday != null ? incoming.birthday : existing.birthday;

  return {
    fullName,
    lastName,
    firstName,
    patronymic,
    formerLastName,
    specialty,
    city,
    email,
    clinicWorkEmail,
    phone,
    telegramUsername,
    preferredContact,
    birthday,
  };
}

async function main() {
  loadEnvFallback();
  const fileArg = process.argv[2];
  const sheetArg = process.argv[3];

  const abs = resolveDoctorXlsxAbs(process.cwd(), fileArg);

  if (!fs.existsSync(abs)) {
    console.error(formatMissingHelp(abs));
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(abs);
  let ws =
    sheetArg != null && sheetArg !== ""
      ? workbook.getWorksheet(sheetArg)
      : workbook.getWorksheet("Врачи") || workbook.worksheets[0];

  if (!ws) {
    console.error(
      "Лист не найден. Доступные:",
      workbook.worksheets.map((w) => w.name).join(", "),
    );
    process.exit(1);
  }

  const rows = [];
  ws.eachRow((row) => rows.push(excelRowToArray(row)));
  if (rows.length < 2) {
    console.error("Нет строк данных.");
    process.exit(1);
  }

  const headerMap = buildHeaderMap(rows[0]);
  const iFamily = colIndex(headerMap, [
    "фамилия врача",
    "фамилия",
    "фио врача",
  ]);
  const iFirst = colIndex(headerMap, ["имя"]);
  const iPat = colIndex(headerMap, ["отчество"]);
  const iFormer = colIndexContains(headerMap, "фамилия ранее");
  const iPhone = colIndex(headerMap, [
    "номер телефона",
    "телефон",
    "phone",
  ]);
  const iTg = colIndex(headerMap, [
    "аккаунт в тг",
    "telegram",
    "тг",
  ]);
  const iSpec = colIndex(headerMap, ["специальность"]);
  const iClinic = colIndex(headerMap, ["клиника"]);
  const iEmail =
    colIndex(headerMap, ["e-mail"]) ??
    colIndex(headerMap, ["email"]) ??
    colIndexContains(headerMap, "email");
  const iClinicMail = colIndexContains(headerMap, "почта клиники");
  const iBday = colIndexContains(headerMap, "день рождения");
  const iCity = colIndex(headerMap, ["город"]);

  if (iFamily === undefined) {
    console.error(
      "Не найден столбец фамилии. Заголовки:",
      rows[0].map(normHeader).filter(Boolean),
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  let linksAdded = 0;
  let skipped = 0;
  let skippedSparse = 0;
  let rowErrors = 0;

  try {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      try {
        const familyRaw = cell(row, iFamily);
        const phone = iPhone !== undefined ? cell(row, iPhone) : "";
        const clinicRaw = iClinic !== undefined ? cell(row, iClinic) : "";
        const phoneDigits = normalizePhoneDigits(phone);

        if (!String(familyRaw || "").trim()) {
          if (phoneDigits.length >= 10) {
            const byPhone = await findDoctorIdByNormalizedPhone(prisma, phone);
            if (byPhone) {
              const doctor = await prisma.doctor.findUnique({
                where: { id: byPhone },
              });
              if (doctor && clinicRaw) {
                linksAdded += await linkDoctorToClinicsFromCell(
                  prisma,
                  doctor.id,
                  clinicRaw,
                );
              }
              continue;
            }
          }
          skipped++;
          continue;
        }

        const familyCleaned = stripRolePrefixFromFamilyCell(familyRaw);
        if (!familyCleaned || isGarbageFamilyCell(familyCleaned)) {
          skipped++;
          continue;
        }

        const lastName = extractSurnameOnly(familyCleaned);
        const firstName = iFirst !== undefined ? cell(row, iFirst) : "";
        const patronymic = iPat !== undefined ? cell(row, iPat) : "";
        const formerLastName = iFormer !== undefined ? cell(row, iFormer) : "";
        const tgRaw = iTg !== undefined ? cell(row, iTg) : "";
        const telegramUsername = stripTelegramUsername(tgRaw);
        const specialty = iSpec !== undefined ? cell(row, iSpec) : "";
        const email = iEmail !== undefined ? cell(row, iEmail) : "";
        const clinicWorkEmail =
          iClinicMail !== undefined ? cell(row, iClinicMail) : "";
        const city = iCity !== undefined ? cell(row, iCity) : "";

        let birthday = null;
        if (iBday !== undefined) {
          const rawB = row[iBday];
          const bStr = cell(row, iBday);
          birthday = parseBirthdayCell(
            rawB instanceof Date ? rawB : bStr || rawB,
          );
        }

        if (
          isSparseSurnameOnlyRow({
            lastName,
            firstName,
            patronymic,
            phone,
            telegramUsername,
            email,
            clinicWorkEmail,
            specialty,
            city,
            formerLastName,
            birthday,
            clinicRaw,
            familyCleaned,
          })
        ) {
          skipped++;
          skippedSparse++;
          continue;
        }

        const fullName = buildDoctorFullName(lastName, firstName, patronymic);
        if (!fullName) {
          skipped++;
          continue;
        }

        const data = {
          fullName,
          lastName: lastName || null,
          firstName: firstName || null,
          patronymic: patronymic || null,
          formerLastName: formerLastName || null,
          specialty: specialty || null,
          city: city || null,
          email: email || null,
          clinicWorkEmail: clinicWorkEmail || null,
          phone: phone || null,
          telegramUsername: telegramUsername || null,
          birthday,
        };
        if (telegramUsername) data.preferredContact = "Telegram";

        const existingId = await findDoctorIdForUpsert(prisma, {
          fullName,
          lastName,
          firstName,
          patronymic,
          phoneRaw: phone,
          familyCleaned,
        });

        let doctor;
        if (existingId) {
          const existing = await prisma.doctor.findUnique({
            where: { id: existingId },
          });
          if (!existing) {
            doctor = await prisma.doctor.create({ data });
            created++;
          } else {
            const merged = mergeDoctorPayload(existing, data);
            doctor = await prisma.doctor.update({
              where: { id: existingId },
              data: merged,
            });
            updated++;
          }
        } else {
          doctor = await prisma.doctor.create({ data });
          created++;
        }

        if (clinicRaw) {
          linksAdded += await linkDoctorToClinicsFromCell(
            prisma,
            doctor.id,
            clinicRaw,
          );
        }
      } catch (err) {
        rowErrors++;
        console.warn("[import-doctors] строка", r + 1, err?.message ?? err);
      }
    }

    console.log("Готово.", {
      создано: created,
      обновлено: updated,
      пропущеноПустых: skipped,
      пропущеноТолькоФамилия: skippedSparse,
      связейКлиникаДобавлено: linksAdded,
      ошибокСтрок: rowErrors,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
