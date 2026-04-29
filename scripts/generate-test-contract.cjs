/**
 * Тестовый договор по шаблону data/templates/typical-contract-ooo.docx
 * Подставляет данные клиники с максимально полным набором реквизитов из БД.
 *
 * Запуск: node --env-file=.env scripts/generate-test-contract.cjs
 * Выход:  data/exports/Тестовый-договор-<slug>.docx
 */

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TEMPLATE = path.join(
  __dirname,
  "../data/templates/typical-contract-ooo.docx",
);
const OUT_DIR = path.join(__dirname, "../data/exports");

function score(c) {
  const f = [
    c.legalFullName,
    c.inn,
    c.kpp,
    c.ogrn,
    c.legalAddress,
    c.bankName,
    c.bik,
    c.settlementAccount,
    c.correspondentAccount,
    c.ceoName,
    c.phone,
    c.email,
  ];
  return f.filter(Boolean).length;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Дата договора: «04» апреля 2026 г. */
function formatContractDateRu(d) {
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  return `«${day}» ${months[d.getMonth()]} ${d.getFullYear()} г.`;
}

function slugifyName(name) {
  return String(name)
    .replace(/[«»"""']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * В шаблоне три отдельных красных фрагмента: « + [краткое наименование] + ».
 */
function orgNameForPreamble(c) {
  const raw = (c.legalFullName || "").trim();
  if (!raw) return c.name || "—";
  let x = raw.replace(/^\s*ООО\s+/i, "").trim();
  if (x.startsWith("«") && x.endsWith("»")) {
    x = x.slice(1, -1).trim();
  }
  return x || c.name || "—";
}

function buildRequisitesLine(c) {
  const parts = [
    `ИНН ${c.inn || "—"}`,
    c.kpp ? `КПП ${c.kpp}` : null,
    c.ogrn ? `ОГРН ${c.ogrn}` : null,
    c.legalAddress ? `Юр. адрес: ${c.legalAddress}` : null,
    c.settlementAccount && c.bankName
      ? `р/с ${c.settlementAccount} в ${c.bankName}`
      : null,
    c.correspondentAccount ? `к/с ${c.correspondentAccount}` : null,
    c.bik ? `БИК ${c.bik}` : null,
    c.phone ? `тел. ${c.phone}` : null,
    c.email ? `e-mail: ${c.email}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Номер и дата — в теле договора и в колонтитулах приложений (header*.xml). */
function applyNumberAndDate(xml, contractNo, contractDate) {
  let s = xml;
  s = s.replace(
    /<w:t>номер<\/w:t>/g,
    `<w:t>${escapeXml(contractNo)}</w:t>`,
  );
  s = s.replace(
    /<w:t>дата<\/w:t>/g,
    `<w:t>${escapeXml(contractDate)}</w:t>`,
  );
  return s;
}

/**
 * Только «реквизиты» внутри одного w:r, где в этом же run есть красный цвет.
 * Слово «реквизиты» в заголовке «Банковские реквизиты» — отдельный run без FF0000.
 */
function replaceRedRequisitesOnly(xml, reqLineEscaped) {
  return xml.replace(/<w:r[^>]*>([\s\S]*?)<\/w:r>/g, (full, inner) => {
    if (!inner.includes("<w:t>реквизиты</w:t>")) return full;
    if (!inner.includes('w:val="FF0000"')) return full;
    return full.replace(
      /<w:t>реквизиты<\/w:t>/,
      `<w:t>${reqLineEscaped}</w:t>`,
    );
  });
}

function applyDocumentBody(xml, c, contractNo, contractDate) {
  const orgShort = escapeXml(orgNameForPreamble(c));
  const ceo = escapeXml(c.ceoName || "—");
  const reqLine = escapeXml(buildRequisitesLine(c));
  const email = escapeXml((c.email || "").trim() || "—");

  let s = xml;
  s = applyNumberAndDate(s, contractNo, contractDate);

  s = s.replace(
    /<w:t xml:space="preserve"> ИНН<\/w:t>/g,
    `<w:t xml:space="preserve"> ${escapeXml(c.inn || "—")}</w:t>`,
  );
  s = s.replace(/<w:t>ООО<\/w:t>/g, `<w:t>${orgShort}</w:t>`);
  s = s.replace(/<w:t([^>]*)>ФИО<\/w:t>/g, `<w:t$1>${ceo}</w:t>`);

  /* п. 9.1.1: адрес электронной почты Заказчика — одно красное «почта» */
  s = s.replace(/<w:t>почта<\/w:t>/g, `<w:t>${email}</w:t>`);

  s = replaceRedRequisitesOnly(s, reqLine);
  return s;
}

(async () => {
  if (!fs.existsSync(TEMPLATE)) {
    console.error("Нет шаблона:", TEMPLATE);
    process.exit(1);
  }

  const rows = await prisma.clinic.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      legalFullName: true,
      inn: true,
      kpp: true,
      ogrn: true,
      legalAddress: true,
      bankName: true,
      bik: true,
      settlementAccount: true,
      correspondentAccount: true,
      ceoName: true,
      phone: true,
      email: true,
    },
  });

  if (rows.length === 0) {
    console.error("В базе нет клиник.");
    process.exit(1);
  }

  rows.sort((a, b) => score(b) - score(a));
  const c = rows[0];
  const contractNo = `ТЕСТ-${slugifyName(c.name) || "клиника"}-2026`;
  const contractDate = formatContractDateRu(new Date());

  const buf = fs.readFileSync(TEMPLATE);
  const zip = await JSZip.loadAsync(buf);

  const docPath = "word/document.xml";
  let documentXml = await zip.file(docPath).async("string");
  documentXml = applyDocumentBody(documentXml, c, contractNo, contractDate);
  zip.file(docPath, documentXml);

  for (const name of Object.keys(zip.files)) {
    if (!/^word\/header\d+\.xml$/.test(name)) continue;
    let hx = await zip.file(name).async("string");
    if (!hx.includes("<w:t>номер</w:t>") && !hx.includes("<w:t>дата</w:t>")) {
      continue;
    }
    hx = applyNumberAndDate(hx, contractNo, contractDate);
    zip.file(name, hx);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = slugifyName(c.name) || "clinic";
  const outPath = path.join(OUT_DIR, `Тестовый-договор-${slug}.docx`);
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  let writtenPath = outPath;
  try {
    fs.writeFileSync(outPath, out);
  } catch (e) {
    if (e && e.code === "EBUSY") {
      writtenPath = path.join(
        OUT_DIR,
        `Тестовый-договор-${slug}-${Date.now()}.docx`,
      );
      fs.writeFileSync(writtenPath, out);
      console.warn(
        "Основной файл занят (закройте его в Word). Записано копия:",
        writtenPath,
      );
    } else {
      throw e;
    }
  }

  console.log("Клиника:", c.name);
  console.log("Заполненность полей (из 12):", score(c));
  console.log("Файл:", writtenPath);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  prisma.$disconnect().finally(() => process.exit(1));
});
