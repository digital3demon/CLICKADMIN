const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file("word/document.xml").async("string");
  const before = (xml.match(/<w:t>реквизиты<\/w:t>/g) || []).length;
  xml = replaceRedRequisitesOnly(xml, "TEST_REQ");
  const after = (xml.match(/<w:t>реквизиты<\/w:t>/g) || []).length;
  const plain = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
  console.log("реквизиты tags before/after replace:", before, after);
  console.log(
    "Банковские реквизиты intact:",
    plain.includes("Банковские реквизиты"),
  );
})();
