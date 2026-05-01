/**
 * После `next build` с output: "standalone" должны быть server.js, чанки и копия static в standalone.
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const serverJs = path.join(cwd, ".next", "standalone", "server.js");
if (!fs.existsSync(serverJs)) {
  console.error(
    "[verify-standalone] Нет файла:",
    serverJs,
    "\nПроверьте, что next.config подхватил output: \"standalone\" и сборка шла из корня репозитория.",
  );
  process.exit(1);
}

function chunkJsCount(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith(".js")) n += 1;
    }
  };
  walk(dir);
  return n;
}

const chunksRoot = path.join(cwd, ".next", "static", "chunks");
const standaloneChunks = path.join(
  cwd,
  ".next",
  "standalone",
  ".next",
  "static",
  "chunks",
);
const n = chunkJsCount(chunksRoot);
const ns = chunkJsCount(standaloneChunks);

if (n < 1) {
  console.error(
    "[verify-standalone] Нет JS-чанков в .next/static/chunks — сборка Next повреждена или не завершилась.",
  );
  process.exit(1);
}
if (ns < 1) {
  console.error(
    "[verify-standalone] Нет JS-чанков в .next/standalone/.next/static/chunks.",
    "\nЗапустите: node scripts/copy-standalone-assets.cjs (он должен вызываться после next build).",
  );
  process.exit(1);
}

console.log("[verify-standalone] OK:", serverJs, `(chunks: ${n}, standalone: ${ns})`);
