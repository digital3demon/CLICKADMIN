/**
 *   node scripts/validate-contract-template.cjs
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const JSZip = require("jszip");

const PDF = path.join(__dirname, "../data/templates/typical-contract-ooo.pdf");
const DOCX = path.join(__dirname, "../data/templates/typical-contract-ooo.docx");

const EXPECTED_PDF_FIELDS = [
  "contract_number",
  "contract_place",
  "contract_date",
  "client_name",
  "client_inn",
  "client_requisites",
];

async function validatePdf() {
  if (!fs.existsSync(PDF)) {
    console.error("MISSING", PDF);
    return false;
  }
  const buf = fs.readFileSync(PDF);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const names = doc
    .getForm()
    .getFields()
    .map((f) => f.getName())
    .filter(Boolean);
  console.log("PDF fields:", names.length);
  for (const key of EXPECTED_PDF_FIELDS) {
    if (!names.includes(key)) console.warn("  missing field:", key);
  }
  const raw = buf.toString("latin1");
  if (/QR|qr/i.test(raw) && raw.includes("/QR")) {
    console.warn("  possible QR object in PDF — проверьте визуально");
  }
  return true;
}

async function validateDocx() {
  if (!fs.existsSync(DOCX)) {
    console.warn("DOCX optional — not found");
    return true;
  }
  const zip = await JSZip.loadAsync(fs.readFileSync(DOCX));
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return false;
  const red = (xml.match(/w:val="FF0000"/gi) || []).length;
  const blue = (xml.match(/w:val="2563EB"/gi) || []).length;
  const twoCol = xml.includes('w:num="2"');
  console.log("DOCX placeholder colors: red", red, "blue", blue, "two-columns", twoCol);
  if (blue < 1) {
    console.warn("  нет синих плейсхолдеров — запустите node scripts/build-contract-docx-template.cjs");
    return false;
  }
  if (!twoCol) {
    console.warn("  нет двух колонок в sectPr");
    return false;
  }
  return true;
}

(async () => {
  const ok = (await validatePdf()) && (await validateDocx());
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
