const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  let idx = 0;
  let n = 0;
  while (true) {
    const i = xml.indexOf("<w:t>реквизиты</w:t>", idx);
    if (i < 0) break;
    n++;
    console.log("=== occurrence", n, "at", i, "===");
    console.log(xml.substring(i - 400, i + 60));
    idx = i + 1;
  }
})();
