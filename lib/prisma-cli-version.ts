import fs from "node:fs";
import path from "node:path";

const FALLBACK = "6.19.3";

/** Версия CLI из `.prisma-cli-version` в корне выкладки (как на сервере в архиве). */
export function getPrismaCliVersion(): string {
  try {
    const p = path.join(process.cwd(), ".prisma-cli-version");
    const v = fs.readFileSync(p, "utf8").trim();
    if (v) return v;
  } catch {
    /* нет файла — dev или старая выкладка */
  }
  return FALLBACK;
}
