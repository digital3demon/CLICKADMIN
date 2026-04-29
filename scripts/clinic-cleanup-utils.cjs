/**
 * Нормализация названия и адреса клиники (импорт + пост-очистка БД).
 * Убирает хвост «неактивна», дубли адреса в названии, лишние «/», склеенные «Название + улица» в одной строке.
 * ФИО вместо названия клиники (напр. «Асирян Мариам») → служебное имя «Клиника (…)» и пояснение в заметках.
 */

function normalizeAddrKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lineLooksLikeAddressLine(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (/^\d{6}\s*,/u.test(t)) return true;
  if (/\d+\s*этаж/u.test(t)) return true;
  if (/^(г|ул|просп|пр|пер|шоссе|б-р|наб)\.\s+/iu.test(t)) return true;
  if (/(^|[\s,;·])(г|ул|просп|пр|пер)\.\s+/iu.test(t)) return true;
  if (/,\s*д\.?\s*\d/u.test(t) || /(^|[\s,])д\.?\s*\d+/iu.test(t)) return true;
  if (/пом\.|помещ|оф\.|офис/iu.test(t)) return true;
  if (/^\d{6}\s*,\s*[А-Яа-яЁё]/u.test(t)) return true;
  if (/край\s*,|область\s*,|респ\./iu.test(t)) return true;
  return false;
}

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
  return `${a}\n${b}`;
}

function dedupeCommaSegmentsInLine(line) {
  const chunks = String(line || "")
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const c of chunks) {
    const k = normalizeAddrKey(c);
    if (k.length >= 12 && seen.has(k)) continue;
    if (k.length >= 12) seen.add(k);
    out.push(c);
  }
  return out.join(", ");
}

function dedupeAddressText(addr) {
  const t = String(addr || "").trim();
  if (!t) return "";
  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const outLines = [];
  const seenLineKeys = new Set();
  for (const line of lines) {
    const d = dedupeCommaSegmentsInLine(line);
    const key = normalizeAddrKey(d);
    if (key.length >= 20 && seenLineKeys.has(key)) continue;
    if (key.length >= 20) seenLineKeys.add(key);
    outLines.push(d);
  }
  return outLines.join("\n");
}

/**
 * «Астра, Асгард» — два коротких названия без признаков адреса: первое в name, второе в заметку.
 */
function splitDualClinicName(name) {
  const t = String(name || "").trim();
  if (!t.includes(",")) return { name: t, extraNote: "" };
  const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return { name: t, extraNote: "" };
  const [a, b] = parts;
  if (/ООО|ИП|ПАО|АО|ЗАО|ОБЩЕСТВО|«|»/i.test(t)) return { name: t, extraNote: "" };
  if (lineLooksLikeAddressLine(b) || lineLooksLikeAddressLine(a))
    return { name: t, extraNote: "" };
  if (a.length < 2 || b.length < 2) return { name: t, extraNote: "" };
  if (/неактивна|неактивен/i.test(b) || /неактивна|неактивен/i.test(a))
    return { name: t, extraNote: "" };
  return {
    name: a,
    extraNote: `Также в исходной строке было название: ${b}`,
  };
}

function peelInlineAddressFromName(name) {
  const n = String(name || "").trim();
  if (!n) return { shortName: "", extraAddress: "" };

  const idxM = n.match(/^(.+?)\s+(\d{6}\s*[,，]\s*.+)$/u);
  if (
    idxM &&
    idxM[1].trim().length >= 2 &&
    lineLooksLikeAddressLine(idxM[2])
  ) {
    return { shortName: idxM[1].trim(), extraAddress: idxM[2].trim() };
  }

  const cityM = n.match(
    /^(.+?)\s+((?:Москва|Санкт-Петербург|Санкт\s+Петербург|СПб)\s*[,，]\s*.+)/iu,
  );
  if (cityM && cityM[1].trim().length >= 3) {
    return { shortName: cityM[1].trim(), extraAddress: cityM[2].trim() };
  }

  const streetM = n.match(
    /^(.+?)\s+([А-ЯЁа-яёA-Za-z0-9\.\-]+\s+(?:ул\.?|просп\.?|пр\.|пер\.|шоссе|б-р|наб\.)\s*.+)/iu,
  );
  if (streetM && streetM[1].trim().length >= 4) {
    const tail = streetM[2].trim();
    if (lineLooksLikeAddressLine(tail) || /д\.|корп|строен/i.test(tail)) {
      return { shortName: streetM[1].trim(), extraAddress: tail };
    }
  }

  const gM = n.match(/^(.+?)\s+(г\.\s*[А-Яа-яЁё][^,]+(?:,\s*.+)?)$/iu);
  if (gM && gM[1].trim().length >= 3) {
    const tail = gM[2].trim();
    if (/(ул\.|пр\.|д\.|пом)/iu.test(tail) || tail.length > 10) {
      return { shortName: gM[1].trim(), extraAddress: tail };
    }
  }

  return { shortName: n, extraAddress: "" };
}

/** Слова похожи на части ФИО (кириллица). */
function wordLooksLikeNamePart(w) {
  const s = String(w || "").trim();
  if (s.length < 2) return false;
  return /^[А-ЯЁ][а-яё\-]{1,40}$/u.test(s);
}

/**
 * Строка выглядит как личное ФИО (2–3 слова), а не как название клиники / юрлица.
 */
function looksLikePersonalNameNotClinic(name) {
  const t = String(name || "").trim();
  if (!t) return false;
  if (
    /клиник|стомат|дент|стом|мед|центр|лаборатор|больниц|поликлин|стоматолог|доктор|doctor|ООО|ИП|ПАО|АО|ЗАО|Ассоциац|общество|сервис|групп|лайн|плюс|студио|studio|clinic|dental|«|»|\/\/|\d{3,}/iu.test(
      t,
    )
  ) {
    return false;
  }
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  if (!words.every(wordLooksLikeNamePart)) return false;
  return true;
}

/**
 * Имя клиники в CRM вместо ошибочного ФИО в столбце «Клиника».
 */
function buildClinicPlaceholderForMisplacedFio(fioOriginal, address) {
  const addr = String(address || "").replace(/\s+/g, " ").trim();
  if (addr.length >= 12) {
    const frag = addr.slice(0, 55).trim();
    return `Клиника (название не указано — см. адрес: ${frag})`.slice(0, 200);
  }
  const fio = fioOriginal.slice(0, 48).trim();
  return `Клиника (в реестре было ФИО, уточните название: ${fio})`.slice(0, 200);
}

/**
 * @returns {{ name: string, address: string, notesExtra: string[], inactiveFromName: boolean }}
 */
function refineClinicNameAndAddress(name, address) {
  const originalName = String(name || "").trim();
  let n = originalName;
  let a = String(address || "").trim();
  const notesExtra = [];
  let inactiveFromName = false;

  n = n.replace(/\s*[/\\]+\s*$/u, "").replace(/\s+/g, " ").trim();

  const inact =
    /\s+(?:не\s+активна|неактивна|не\s+активен|неактивен)\s*$/iu;
  if (inact.test(n)) {
    inactiveFromName = true;
    n = n.replace(inact, "").trim();
  }

  const dual = splitDualClinicName(n);
  if (dual.extraNote) {
    notesExtra.push(dual.extraNote);
    n = dual.name;
  }

  const peel = peelInlineAddressFromName(n);
  if (peel.extraAddress) {
    a = mergeAddressParts(a, peel.extraAddress);
    n = peel.shortName;
  }

  n = scrubAddressOutOfName(n, a);
  a = dedupeAddressText(a);

  n = n.replace(/^[,;\s]+|[,;\s]+$/g, "").trim();
  if (n.length < 1) n = originalName;

  if (looksLikePersonalNameNotClinic(n)) {
    const fioFromRegistry = n;
    notesExtra.unshift(
      `В столбце «Клиника» в реестре указано ФИО (${fioFromRegistry}), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.`,
    );
    n = buildClinicPlaceholderForMisplacedFio(fioFromRegistry, a);
  }

  return {
    name: n,
    address: a,
    notesExtra,
    inactiveFromName,
  };
}

module.exports = {
  refineClinicNameAndAddress,
  looksLikePersonalNameNotClinic,
  dedupeAddressText,
  scrubAddressOutOfName,
  mergeAddressParts,
  normalizeAddrKey,
  lineLooksLikeAddressLine,
};
