import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** @param {string} dir */
function walkTsx(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const replacements = [
  [/hover:bg-zinc-50\/80/g, "hover:bg-[var(--table-row-hover)]"],
  [/hover:bg-zinc-50/g, "hover:bg-[var(--table-row-hover)]"],
  [/hover:bg-zinc-100/g, "hover:bg-[var(--surface-hover)]"],
  [/hover:bg-white/g, "hover:bg-[var(--card-bg)]"],
  [/hover:bg-zinc-200\/70/g, "hover:bg-[var(--surface-hover)]"],
  [/bg-zinc-50\/95/g, "bg-[var(--surface-muted)]"],
  [/bg-zinc-50\/90/g, "bg-[var(--surface-muted)]"],
  [/bg-zinc-50\/80/g, "bg-[var(--surface-muted)]"],
  [/bg-zinc-50\/60/g, "bg-[var(--surface-muted)]"],
  [/bg-zinc-50\/50/g, "bg-[var(--surface-muted)]"],
  [/bg-zinc-50/g, "bg-[var(--surface-subtle)]"],
  [/bg-zinc-100/g, "bg-[var(--surface-hover)]"],
  [/border-zinc-100/g, "border-[var(--border-subtle)]"],
  [/border-zinc-200/g, "border-[var(--card-border)]"],
  [/border-zinc-300/g, "border-[var(--input-border)]"],
  [/text-zinc-900/g, "text-[var(--app-text)]"],
  [/text-zinc-800/g, "text-[var(--text-strong)]"],
  [/text-zinc-700/g, "text-[var(--text-body)]"],
  [/text-zinc-600/g, "text-[var(--text-secondary)]"],
  [/text-zinc-500/g, "text-[var(--text-muted)]"],
  [/ring-zinc-200/g, "ring-[var(--card-border)]"],
  [/ring-zinc-300/g, "ring-[var(--input-border)]"],
  [/hover:ring-zinc-300/g, "hover:ring-[var(--input-border)]"],
  [/decoration-zinc-400/g, "decoration-[var(--text-muted)]"],
  [/ring-offset-white/g, "ring-offset-[var(--card-bg)]"],
  [/bg-sky-100/g, "bg-[var(--accent-selection-bg)]"],
];

const files = [
  ...walkTsx(path.join(root, "app")),
  ...walkTsx(path.join(root, "components")),
];

for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  const orig = c;
  for (const [re, rep] of replacements) {
    c = c.replace(re, rep);
  }
  c = c.replace(/\bbg-white\/95\b/g, "bg-[color-mix(in_srgb,var(--card-bg)_95%,transparent)]");
  c = c.replace(/\bbg-white\/90\b/g, "bg-[color-mix(in_srgb,var(--card-bg)_90%,transparent)]");
  c = c.replace(/\bbg-white\/80\b/g, "bg-[color-mix(in_srgb,var(--card-bg)_80%,transparent)]");
  c = c.replace(/\bbg-white\b/g, "bg-[var(--card-bg)]");
  if (c !== orig) {
    fs.writeFileSync(f, c, "utf8");
    console.log("updated", path.relative(root, f));
  }
}

console.log("done");
