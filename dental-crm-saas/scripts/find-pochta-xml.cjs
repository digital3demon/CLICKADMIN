const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const x = await zip.file("word/document.xml").async("string");

  const exact = x.match(/<w:t[^>]*>почта<\/w:t>/g);
  console.log("exact <w:t>почта</w:t> count:", exact ? exact.length : 0);

  let idx = 0;
  while (true) {
    const i = x.indexOf("почта", idx);
    if (i < 0) break;
    if (x.substring(i - 30, i).includes("<w:t")) {
      const snip = x.substring(Math.max(0, i - 60), i + 80);
      console.log("--- at", i, "---");
      console.log(snip);
    }
    idx = i + 5;
  }
})();
