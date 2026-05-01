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

if (!fs.existsSync(staticSrc)) {
  console.error(
    "[copy-standalone-assets] Нет каталога .next/static — сначала выполните next build.",
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
}

console.log("[copy-standalone-assets] OK → .next/standalone/.next/static");
