/**
 * Сжимает изображения внутри шаблона договора .docx, чтобы уменьшить итоговый размер файла.
 *
 * Запуск:
 *   node scripts/optimize-contract-template.cjs
 */

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const sharp = require("sharp");

const TEMPLATE_PATH = path.join(
  __dirname,
  "../data/templates/typical-contract-ooo.docx",
);

const SCALE = 0.62;

async function optimizePng(buf) {
  const meta = await sharp(buf).metadata();
  const width = Math.max(1200, Math.round((meta.width || 2000) * SCALE));
  return sharp(buf)
    .resize({ width, withoutEnlargement: true })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality: 72,
      effort: 10,
    })
    .toBuffer();
}

(async () => {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Нет шаблона: ${TEMPLATE_PATH}`);
  }

  const beforeBuf = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(beforeBuf);

  let touched = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const name of Object.keys(zip.files)) {
    if (!/^word\/media\/.+\.png$/i.test(name)) continue;
    const entry = zip.file(name);
    if (!entry) continue;
    const source = await entry.async("nodebuffer");
    const optimized = await optimizePng(source);
    bytesBefore += source.length;
    bytesAfter += optimized.length;
    touched += 1;
    zip.file(name, optimized);
    console.log(
      `${name}: ${source.length} -> ${optimized.length} (${Math.round((optimized.length / source.length) * 100)}%)`,
    );
  }

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  fs.writeFileSync(TEMPLATE_PATH, out);

  console.log("");
  console.log("images:", touched);
  console.log("media bytes:", bytesBefore, "->", bytesAfter);
  console.log("template bytes:", beforeBuf.length, "->", out.length);
})();
