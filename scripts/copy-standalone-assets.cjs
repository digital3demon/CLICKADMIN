/**
 * Рекомендация Next.js для output: "standalone": положить `.next/static` и `public`
 * рядом со standalone-сервером (см. https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
 * Иначе в Docker / PaaS часто отдаётся HTML, а запросы к `/_next/static/chunks/*.js` → 404.
 */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(root, ".next", "standalone", ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(root, ".next", "standalone", "public");

function copyDirRecursive(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(from), to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(staticSrc)) {
  console.error(
    "[copy-standalone-assets] Нет каталога .next/static — сначала выполните next build.",
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(staticDest), { recursive: true });
copyDirRecursive(staticSrc, staticDest);

if (fs.existsSync(publicSrc)) {
  copyDirRecursive(publicSrc, publicDest);
}

const templatesSrc = path.join(root, "templates");
const templatesDest = path.join(root, ".next", "standalone", "templates");
if (fs.existsSync(templatesSrc)) {
  copyDirRecursive(templatesSrc, templatesDest);
  console.log("[copy-standalone-assets] OK → .next/standalone/templates");
}

/** Демо на PaaS: `prisma db push` из runtime — схема должна быть рядом со standalone. */
const prismaSrc = path.join(root, "prisma");
const prismaDest = path.join(root, ".next", "standalone", "prisma");
if (fs.existsSync(path.join(prismaSrc, "schema.prisma"))) {
  fs.mkdirSync(prismaDest, { recursive: true });
  fs.copyFileSync(
    path.join(prismaSrc, "schema.prisma"),
    path.join(prismaDest, "schema.prisma"),
  );
  const migSrc = path.join(prismaSrc, "migrations");
  const migDest = path.join(prismaDest, "migrations");
  if (fs.existsSync(migSrc)) {
    copyDirRecursive(migSrc, migDest);
  }
  console.log("[copy-standalone-assets] OK → .next/standalone/prisma/schema.prisma");
} else {
  console.warn(
    "[copy-standalone-assets] Нет prisma/schema.prisma — демо db push на PaaS упадёт.",
  );
}

console.log("[copy-standalone-assets] OK → .next/standalone/.next/static");

/** pdfjs worker: NFT часто не кладёт pdf.worker.mjs в standalone node_modules. */
const pdfjsSrc = path.join(root, "node_modules", "pdfjs-dist");
const pdfjsDest = path.join(root, ".next", "standalone", "node_modules", "pdfjs-dist");
if (fs.existsSync(pdfjsSrc)) {
  copyDirRecursive(pdfjsSrc, pdfjsDest);
  console.log("[copy-standalone-assets] OK → .next/standalone/node_modules/pdfjs-dist");
} else {
  console.warn("[copy-standalone-assets] Нет node_modules/pdfjs-dist — разбор PDF на PaaS упадёт");
}

/**
 * CLI `prisma` для демо `db push` на PaaS (без npx).
 * Next standalone NFT обычно не тащит пакет `prisma` — только `@prisma/client`.
 */
const prismaCliSrc = path.join(root, "node_modules", "prisma");
const prismaCliDest = path.join(root, ".next", "standalone", "node_modules", "prisma");
const prismaCliJs = path.join(prismaCliSrc, "build", "index.js");
if (fs.existsSync(prismaCliJs)) {
  copyDirRecursive(prismaCliSrc, prismaCliDest);
  const marker = path.join(root, ".prisma-cli-js");
  const markerStandalone = path.join(root, ".next", "standalone", ".prisma-cli-js");
  const absJs = path.resolve(prismaCliJs);
  fs.writeFileSync(marker, `${absJs}\n`, "utf8");
  fs.writeFileSync(markerStandalone, `${path.resolve(path.join(prismaCliDest, "build", "index.js"))}\n`, "utf8");
  console.log("[copy-standalone-assets] OK → .next/standalone/node_modules/prisma + .prisma-cli-js");
} else {
  console.warn(
    "[copy-standalone-assets] Нет node_modules/prisma/build/index.js — демо db push на пустой схеме упадёт",
  );
}
