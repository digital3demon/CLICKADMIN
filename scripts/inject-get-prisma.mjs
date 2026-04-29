/**
 * Заменяет import { prisma } на getPrisma и вставляет `const prisma = await getPrisma();`
 * в начало каждого `export async function` (однострочная сигнатура).
 */
import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib", "components"];
const skip = new Set([
  path.join("lib", "prisma.ts"),
  path.join("lib", "prisma-demo.ts"),
  path.join("lib", "get-prisma.ts"),
]);

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
}

function rel(p) {
  return path.relative(process.cwd(), p).split(path.sep).join("/");
}

function processFile(absPath) {
  const r = rel(absPath);
  if (skip.has(r)) return false;
  let s = fs.readFileSync(absPath, "utf8");
  if (!s.includes('@/lib/prisma"') && !s.includes("@/lib/prisma'")) return false;
  if (s.includes("get-prisma")) {
    /* already migrated */
  }
  s = s.replace(
    /import\s+\{\s*prisma\s*\}\s+from\s+["']@\/lib\/prisma["'];?\s*\n/g,
    'import { getPrisma } from "@/lib/get-prisma";\n',
  );
  if (s.includes('from "@/lib/prisma"')) {
    console.warn("leftover prisma import", r);
    return false;
  }

  const re =
    /^export async function \w+\([^)]*\) \{\n(?!  const prisma = await getPrisma\(\);)/gm;
  const n = (s.match(re) || []).length;
  s = s.replace(
    re,
    (m) => `${m}  const prisma = await getPrisma();\n`,
  );
  fs.writeFileSync(absPath, s, "utf8");
  console.log(r, n ? `+${n} handlers` : "(import only)");
  return true;
}

const files = [];
for (const d of roots) walk(path.join(process.cwd(), d), files);

let n = 0;
for (const f of files) {
  if (processFile(f)) n++;
}
console.log("done", n);
