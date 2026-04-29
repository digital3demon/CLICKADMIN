/**
 * Общая проверка «почти пустой» карточки врача (импорт + очистка БД).
 */

function isInitialsToken(tok) {
  const x = String(tok || "").trim();
  if (!x) return false;
  if (/^[А-ЯЁA-Z]\.$/iu.test(x)) return true;
  if (/^[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.?$/iu.test(x)) return true;
  if (/^[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.$/iu.test(x)) return true;
  return false;
}

function isRealGivenName(s) {
  const t = String(s || "").trim();
  if (t.length < 2) return false;
  if (/^[А-ЯЁA-Z]\.$/iu.test(t)) return false;
  if (/^[А-ЯЁA-Z]\.[А-ЯЁA-Z]\.?$/iu.test(t)) return false;
  if (/^[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]\.$/iu.test(t)) return false;
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

function normalizePhoneDigits(s) {
  let d = String(s || "").replace(/\D/g, "");
  if (d.length === 11 && d[0] === "8") d = "7" + d.slice(1);
  return d;
}

/**
 * Строка Excel / запись без ценности: только фамилия или фамилия+инициалы,
 * без телефона, мессенджера, почты, клиники (в строке) и прочих полей.
 * @param {object} ctx — для БД задайте familyCleaned: fullName, clinicRaw: ""
 */
function isSparseSurnameOnlyRow(ctx) {
  const {
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
  } = ctx;

  if (!String(lastName || "").trim()) return false;

  if (normalizePhoneDigits(phone).length >= 10) return false;
  if (String(telegramUsername || "").trim()) return false;
  if (String(email || "").trim()) return false;
  if (String(clinicWorkEmail || "").trim()) return false;
  if (String(specialty || "").trim()) return false;
  if (String(city || "").trim()) return false;
  if (String(formerLastName || "").trim()) return false;
  if (birthday != null) return false;
  if (String(clinicRaw || "").trim()) return false;

  if (isRealGivenName(firstName)) return false;
  if (
    String(patronymic || "").trim().length >= 2 &&
    !isInitialsToken(patronymic)
  ) {
    return false;
  }

  const tail = familyTailAfterSurname(familyCleaned, lastName);
  if (extractInitialLettersFromTail(tail).length > 0) return true;
  if (collectInitialsFromNameFields(firstName, patronymic).length > 0)
    return true;

  return true;
}

module.exports = {
  isSparseSurnameOnlyRow,
  normalizePhoneDigits,
};
