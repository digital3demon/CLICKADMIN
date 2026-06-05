/**
 * Собирает data/templates/typical-contract-ooo.pdf (Legal Design + AcroForm).
 * Перед первым запуском скачивает Noto Sans в data/fonts/.
 *
 *   node scripts/build-contract-pdf-template.cjs
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const JSZip = require("jszip");
const fontkit = require("@pdf-lib/fontkit");
const { PDFDocument, rgb } = require("pdf-lib");

const ROOT = path.join(__dirname, "..");
const OUT_PDF = path.join(ROOT, "data/templates/typical-contract-ooo.pdf");
const DOCX = path.join(ROOT, "data/templates/typical-contract-ooo.docx");
const FONTS_DIR = path.join(ROOT, "data/fonts");

const FONT_URLS = {
  regular:
    "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
  bold: "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
};

const ACCENT = rgb(37 / 255, 99 / 255, 235 / 255);
const TEXT = rgb(17 / 255, 24 / 255, 39 / 255);
const MUTED = rgb(107 / 255, 114 / 255, 128 / 255);
const BORDER = rgb(229 / 255, 231 / 255, 235 / 255);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      resolve();
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "dental-lab-crm" } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function ensureFonts() {
  await download(FONT_URLS.regular, path.join(FONTS_DIR, "NotoSans-Regular.ttf"));
  await download(FONT_URLS.bold, path.join(FONTS_DIR, "NotoSans-Bold.ttf"));
}

async function extractDocxPlain() {
  if (!fs.existsSync(DOCX)) return "";
  const zip = await JSZip.loadAsync(fs.readFileSync(DOCX));
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  let plain = "";
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) plain += m[1];
  return plain.replace(/\s+/g, " ").trim();
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function main() {
  await ensureFonts();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fs.readFileSync(path.join(FONTS_DIR, "NotoSans-Regular.ttf")), {
    subset: true,
  });
  const bold = await doc.embedFont(fs.readFileSync(path.join(FONTS_DIR, "NotoSans-Bold.ttf")), {
    subset: true,
  });
  const form = doc.getForm();

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Accent arc
  page.drawRectangle({
    x: PAGE_W / 2 - 40,
    y: PAGE_H - 18,
    width: 80,
    height: 18,
    color: ACCENT,
    borderWidth: 0,
  });

  page.drawText("ДОГОВОР", {
    x: MARGIN,
    y: y - 8,
    size: 22,
    font: bold,
    color: TEXT,
  });

  const numField = form.createTextField("contract_number");
  numField.addToPage(page, {
    x: PAGE_W - MARGIN - 120,
    y: y - 6,
    width: 120,
    height: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: rgb(1, 1, 1),
  });

  y -= 36;
  page.drawText("место", { x: MARGIN, y: y + 14, size: 8, font: regular, color: MUTED });
  const placeField = form.createTextField("contract_place");
  placeField.addToPage(page, {
    x: MARGIN,
    y: y - 4,
    width: 200,
    height: 22,
    borderWidth: 1,
    borderColor: BORDER,
  });

  page.drawText("дата", { x: MARGIN + 220, y: y + 14, size: 8, font: regular, color: MUTED });
  const dateField = form.createTextField("contract_date");
  dateField.addToPage(page, {
    x: MARGIN + 220,
    y: y - 4,
    width: 200,
    height: 22,
    borderWidth: 1,
    borderColor: BORDER,
  });

  y -= 48;

  const cardW = (PAGE_W - 2 * MARGIN - 12) / 2;
  const cardH = 100;
  for (const [i, title] of [
    [0, "Заказчик"],
    [1, "Поставщик"],
  ]) {
    const x0 = MARGIN + i * (cardW + 12);
    page.drawRectangle({
      x: x0,
      y: y - cardH,
      width: cardW,
      height: cardH,
      borderColor: ACCENT,
      borderWidth: 1.5,
      color: rgb(1, 1, 1),
    });
    page.drawCircle({
      x: x0 + 10,
      y: y - 10,
      size: 4,
      color: ACCENT,
    });
    page.drawText(title, {
      x: x0 + 20,
      y: y - 22,
      size: 11,
      font: bold,
      color: TEXT,
    });
    if (i === 0) {
      const fields = [
        ["client_name", 0, 36, cardW - 16, 18],
        ["client_inn", 0, 56, cardW - 16, 16],
        ["client_ceo", 0, 74, cardW - 16, 16],
      ];
      for (const [name, dx, dy, w, h] of fields) {
        const tf = form.createTextField(name);
        tf.addToPage(page, {
          x: x0 + 8 + dx,
          y: y - cardH + dy,
          width: w,
          height: h,
          borderWidth: 1,
          borderColor: BORDER,
          font: regular,
        });
      }
    } else {
      page.drawText("ООО «КЛИКЛАБ»", {
        x: x0 + 12,
        y: y - 40,
        size: 9,
        font: regular,
        color: TEXT,
        maxWidth: cardW - 24,
      });
      page.drawText("ИНН 7813675732 · КПП 780201001", {
        x: x0 + 12,
        y: y - 54,
        size: 8,
        font: regular,
        color: MUTED,
        maxWidth: cardW - 24,
      });
    }
  }

  y -= cardH + 24;

  page.drawText("1. Предмет договора", {
    x: MARGIN,
    y: y - 4,
    size: 10,
    font: bold,
    color: TEXT,
    maxWidth: 140,
  });
  page.drawLine({
    start: { x: MARGIN + 150, y: y - 20 },
    end: { x: MARGIN + 150, y: y - 120 },
    thickness: 2,
    color: ACCENT,
  });
  const intro =
    "Поставщик обязуется изготовить и передать Заказчику зуботехнические изделия, а Заказчик обязуется принять и оплатить изделия на условиях настоящего договора.";
  const introLines = wrapText(intro, regular, 8.5, PAGE_W - MARGIN - 170);
  let iy = y;
  for (const line of introLines.slice(0, 12)) {
    page.drawText(line, {
      x: MARGIN + 160,
      y: iy - 4,
      size: 8.5,
      font: regular,
      color: TEXT,
    });
    iy -= 11;
  }

  y -= 140;

  const plain = await extractDocxPlain();
  const bodyStart = plain.indexOf("1.") >= 0 ? plain.indexOf("1.") : 0;
  const body = plain.slice(bodyStart).slice(0, 120000);

  const colLeft = MARGIN;
  const colRight = MARGIN + 160;
  const bodyWidth = PAGE_W - colRight - MARGIN;
  const sections = body.split(/(?=\d+\.\s)/).filter((s) => s.trim().length > 20);

  for (const section of sections) {
    const headMatch = /^(\d+\.)\s*([^0-9]{3,80}?)(?=\d+\.|$)/u.exec(section);
    const head = headMatch ? `${headMatch[1]} ${headMatch[2].trim()}` : section.slice(0, 60);
    const rest = section.slice(head.length).trim();

    if (y < MARGIN + 80) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }

    const headLines = wrapText(head, bold, 9, 130);
    let hy = y;
    for (const line of headLines.slice(0, 4)) {
      page.drawText(line, { x: colLeft, y: hy - 4, size: 9, font: bold, color: TEXT });
      hy -= 12;
    }

    const lineTop = y;
    const lineBottom = y - 100;
    page.drawLine({
      start: { x: colRight - 10, y: lineTop },
      end: { x: colRight - 10, y: lineBottom },
      thickness: 1.5,
      color: ACCENT,
    });

    const restLines = wrapText(rest, regular, 8, bodyWidth);
    let ry = y;
    for (const line of restLines) {
      if (ry < MARGIN + 40) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        ry = y;
      }
      page.drawText(line, {
        x: colRight,
        y: ry - 4,
        size: 8,
        font: regular,
        color: TEXT,
      });
      ry -= 10;
    }
    y = Math.min(hy, ry) - 18;
  }

  // Extra fields page for requisites
  page = doc.addPage([PAGE_W, PAGE_H]);
  y = PAGE_H - MARGIN;
  page.drawText("Реквизиты и контакты заказчика", {
    x: MARGIN,
    y: y - 4,
    size: 12,
    font: bold,
    color: TEXT,
  });
  y -= 28;
  for (const [label, name, h] of [
    ["КПП", "client_kpp", 22],
    ["ОГРН", "client_ogrn", 22],
    ["E-mail", "client_email", 22],
    ["Юр. адрес", "client_address", 22],
    ["Банковские реквизиты", "client_requisites", 72],
  ]) {
    page.drawText(label, { x: MARGIN, y: y + 14, size: 8, font: regular, color: MUTED });
    const tf = form.createTextField(name);
    tf.enableMultiline();
    if (name !== "client_requisites") tf.disableMultiline();
    tf.addToPage(page, {
      x: MARGIN,
      y: y - 4,
      width: PAGE_W - 2 * MARGIN,
      height: h,
      borderWidth: 1,
      borderColor: BORDER,
      font: regular,
    });
    y -= h + 20;
  }

  form.updateFieldAppearances(regular);

  fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });
  fs.writeFileSync(OUT_PDF, await doc.save());
  console.log("Wrote", OUT_PDF, fs.statSync(OUT_PDF).size, "bytes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
