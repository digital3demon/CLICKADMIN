const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const x = await zip.file("word/document.xml").async("string");
  for (const word of ["номер", "дата", "реквизиты", "почта"]) {
    const re = new RegExp(`<w:t[^>]*>${word}</w:t>`, "g");
    const n = (x.match(re) || []).length;
    console.log(word, n);
  }
})();
