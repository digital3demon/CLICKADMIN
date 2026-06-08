/**
 * Обновляет data/templates/typical-contract-ooo.docx под Legal Design:
 * — плейсхолдеры синие 2563EB (вместо legacy FF0000);
 * — две колонки в sectPr (как в макете Legal Design);
 * — шапка-таблица с синей полосой «ДОГОВОР».
 *
 *   node scripts/build-contract-docx-template.cjs
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const ROOT = path.join(__dirname, "..");
const DOCX = path.join(ROOT, "data/templates/typical-contract-ooo.docx");
const BACKUP = path.join(ROOT, "data/templates/typical-contract-ooo.legacy.docx");

const BLUE = "2563EB";

function legalHeaderXml() {
  return `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:tblBorders>
      <w:bottom w:val="single" w:sz="12" w:space="0" w:color="${BLUE}"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tr>
    <w:tc>
      <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="111827"/></w:rPr><w:t>ДОГОВОР</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="6B7280"/></w:rPr><w:t xml:space="preserve">поставки зуботехнических работ · Legal Design</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>
</w:tbl>
<w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>`;
}

function migrateColors(xml) {
  let s = xml;
  s = s.replace(/w:val="FF0000"/gi, `w:val="${BLUE}"`);
  s = s.replace(/w:val="2F5496"/gi, `w:val="${BLUE}"`);
  return s;
}

function ensureTwoColumns(xml) {
  let s = xml;
  s = s.replace(/<w:cols([^>]*)\/>/g, (full, attrs) => {
    if (/w:num\s*=\s*"/i.test(attrs)) {
      return full.replace(/w:num\s*=\s*"[^"]*"/i, 'w:num="2"');
    }
    return `<w:cols w:num="2"${attrs}/>`;
  });
  if (!s.includes("<w:cols")) {
    s = s.replace(
      /<\/w:body>/,
      `<w:sectPr><w:cols w:num="2" w:space="720"/></w:sectPr></w:body>`,
    );
  }
  return s;
}

function insertLegalHeader(xml) {
  if (xml.includes("поставки зуботехнических работ · Legal Design")) return xml;
  return xml.replace(/<w:body([^>]*)>/, `<w:body$1>${legalHeaderXml()}`);
}

async function main() {
  if (!fs.existsSync(DOCX)) {
    console.error("Нет файла:", DOCX);
    process.exit(1);
  }
  const sourceBuf = fs.existsSync(BACKUP)
    ? fs.readFileSync(BACKUP)
    : fs.readFileSync(DOCX);
  if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(DOCX, BACKUP);
    console.log("Backup:", BACKUP);
  }

  const zip = await JSZip.loadAsync(sourceBuf);
  const wordFiles = Object.keys(zip.files).filter(
    (n) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(n),
  );

  for (const name of wordFiles) {
    let xml = await zip.file(name).async("string");
    xml = migrateColors(xml);
    if (name === "word/document.xml") {
      xml = insertLegalHeader(xml);
      xml = ensureTwoColumns(xml);
    }
    zip.file(name, xml);
  }

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  fs.writeFileSync(DOCX, out);

  const check = await JSZip.loadAsync(out);
  const doc = await check.file("word/document.xml").async("string");
  const red = (doc.match(/w:val="FF0000"/gi) || []).length;
  const blue = (doc.match(new RegExp(`w:val="${BLUE}"`, "gi")) || []).length;
  const cols = doc.includes('w:num="2"');
  console.log("Wrote", DOCX, out.length, "bytes");
  console.log("DOCX colors: red", red, "blue", blue, "two-columns", cols);
  if (red > 0) {
    console.warn("Остались красные плейсхолдеры — проверьте вручную");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
