const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  const keys = [
    "9.1.1",
    "банковские реквизиты",
    "Банковские реквизиты",
    "почта",
    "Приложен",
    "номер",
    "дата",
  ];
  for (const k of keys) {
    const i = xml.indexOf(k);
    console.log(k, i >= 0 ? i : "—");
    if (i >= 0) {
      console.log(xml.substring(i, Math.min(i + 400, xml.length)));
      console.log("---");
    }
  }
})();
