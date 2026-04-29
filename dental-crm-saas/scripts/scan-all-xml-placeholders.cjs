const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const words = ["номер", "дата", "Номер", "Дата"];
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml") || !name.startsWith("word/")) continue;
    if (name.includes("rels")) continue;
    const content = await zip.file(name).async("string");
    for (const w of words) {
      const re = new RegExp(`<w:t[^>]*>${w}</w:t>`, "g");
      const n = (content.match(re) || []).length;
      if (n > 0) console.log(name, w, n);
    }
  }
})();
