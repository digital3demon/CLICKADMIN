/**
 * Как scripts/package-standalone-windows.ps1: убирает из standalone абсолютные пути сборки,
 * чтобы /_next/static работал после распаковки архива на другом каталоге/сервере.
 *
 *   node scripts/repair-standalone-bundle.cjs /path/to/bundle-root
 */
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
if (!root?.trim()) {
  console.error("Usage: node scripts/repair-standalone-bundle.cjs <bundle-root>");
  process.exit(1);
}

const serverJsPath = path.join(root, "server.js");
if (fs.existsSync(serverJsPath)) {
  let t = fs.readFileSync(serverJsPath, "utf8");
  t = t.replace(/"outputFileTracingRoot":"(?:[^"\\]|\\.)*"/g, '"outputFileTracingRoot":""');
  t = t.replace(/"turbopack":\{"root":"(?:[^"\\]|\\.)*"\}/g, '"turbopack":{}');
  const oldHost = "const hostname = process.env.HOSTNAME || '0.0.0.0'";
  const newHost =
    "const hostname = process.env.CRM_BIND_HOST || process.env.HOSTNAME || '0.0.0.0'";
  if (t.includes(oldHost)) {
    t = t.replace(oldHost, newHost);
  }
  fs.writeFileSync(serverJsPath, t, "utf8");
}

const rsfPath = path.join(root, ".next", "required-server-files.json");
if (fs.existsSync(rsfPath)) {
  let r = fs.readFileSync(rsfPath, "utf8");
  r = r.replace(/"appDir"\s*:\s*"(?:[^"\\]|\\.)*"/g, '"appDir":"."');
  r = r.replace(/"outputFileTracingRoot"\s*:\s*"(?:[^"\\]|\\.)*"/g, '"outputFileTracingRoot":""');
  r = r.replace(/"turbopack"\s*:\s*\{[^}]*\}/gs, '"turbopack":{}');
  fs.writeFileSync(rsfPath, r, "utf8");
}

console.log("repair-standalone-bundle: OK", path.resolve(root));
