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
