/**
 * Замер first-load JS после `next build`: класс экранов волны 0.
 * Без .next — выход 0 и подсказка, сборку не запускает.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const manifestPath = path.join(root, ".next", "app-build-manifest.json");
const routes = [
  "/orders",
  "/orders/[id]",
  "/kanban",
  "/mail",
  "/analytics",
  "/clients",
  "/ai-admin",
];

if (!fs.existsSync(manifestPath)) {
  console.log(
    "[bundle-route-baseline] Нет .next/app-build-manifest.json — сначала npm run build:platform",
  );
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pages = manifest.pages ?? {};

function filesForRoute(route) {
  const keys = Object.keys(pages);
  const hit =
    keys.find((k) => k === route || k === `${route}/page`) ||
    keys.find((k) => k.replace(/\\/g, "/").endsWith(`${route}/page`));
  return hit ? pages[hit] : [];
}

function fileBytes(rel) {
  const abs = path.join(root, ".next", rel.replace(/^\//, ""));
  try {
    return fs.statSync(abs).size;
  } catch {
    const alt = path.join(root, ".next", "static", rel.replace(/^static\//, ""));
    try {
      return fs.statSync(alt).size;
    } catch {
      return 0;
    }
  }
}

console.log("route\tjs_files\tbytes");
for (const route of routes) {
  const files = filesForRoute(route);
  const bytes = files.reduce((sum, f) => sum + fileBytes(f), 0);
  console.log(`${route}\t${files.length}\t${bytes}`);
}
