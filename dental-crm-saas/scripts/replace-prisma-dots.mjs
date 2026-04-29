import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib", "components"];

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
  if (
    r === "lib/get-prisma.ts" ||
    r === "lib/prisma.ts" ||
    r === "lib/prisma-demo.ts"
  ) {
    return false;
  }
  let s = fs.readFileSync(absPath, "utf8");
  if (!s.includes('from "@/lib/get-prisma"')) return false;
  if (s.includes("const prisma = await getPrisma()")) return false;
  if (!/\bprisma\./.test(s)) return false;
  const next = s.replace(/\bprisma\./g, "(await getPrisma()).");
  if (next === s) return false;
  fs.writeFileSync(absPath, next, "utf8");
  console.log(r);
  return true;
}

const files = [];
for (const d of roots) walk(path.join(process.cwd(), d), files);
let n = 0;
for (const f of files) {
  if (processFile(f)) n++;
}
console.log("replaced in", n, "files");
