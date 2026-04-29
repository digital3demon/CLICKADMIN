const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const x = await zip.file("word/document.xml").async("string");
  const matches = [...x.matchAll(/<w:t[^>]*>реквизиты<\/w:t>/g)];
  console.log("count реквизиты:", matches.length);
  matches.forEach((m, i) => {
    const pos = m.index;
    console.log(i, "context:", x.substring(pos - 120, pos + 80));
  });
})();
