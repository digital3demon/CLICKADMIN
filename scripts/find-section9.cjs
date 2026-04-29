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

  const needle = "электронной почты Заказчика";
  let i = plain.indexOf(needle);
  console.log("index needle", i);
  if (i >= 0) console.log(plain.substring(i - 200, i + 500));

  const i2 = plain.indexOf("поставщика");
  console.log("\n--- поставщика (lowercase) ---", plain.indexOf("поставщика"));
  const i3 = plain.toLowerCase().indexOf("почты заказчика");
  console.log("почты заказчика", i3);
  if (i3 >= 0) console.log(plain.substring(i3 - 150, i3 + 400));

  // hyperlinks emails
  const emails = [...plain.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)];
  console.log(
    "emails in plain",
    emails.slice(0, 20).map((x) => x[0]),
  );
})();
