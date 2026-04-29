const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

(async () => {
  const buf = fs.readFileSync(
    path.join(__dirname, "../data/templates/typical-contract-ooo.docx"),
  );
  const zip = await JSZip.loadAsync(buf);
  const x = await zip.file("word/document.xml").async("string");
  let plain = "";
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(x)) !== null) plain += m[1];

  const markers = [
    "9.1.1",
    "9.1",
    "Банковские реквизиты",
    "Приложение",
    "Договор №",
    "номер",
    "дата",
  ];
  for (const s of markers) {
    const i = plain.indexOf(s);
    console.log(s, i);
    if (i >= 0) console.log(plain.substring(i, i + Math.min(350, plain.length - i)));
    console.log("---");
  }
})();
