import fs from "node:fs";
import path from "node:path";
import { getDemoDatabaseUrl } from "@/lib/prisma-demo";

/** Абсолютный путь к файлу SQLite демо (из `DEMO_DATABASE_URL` или по умолчанию). */
export function getDemoSqliteFilePath(): string {
  const raw = getDemoDatabaseUrl();
  if (!raw.startsWith("file:")) {
    return path.join(process.cwd(), "prisma", "demo.db");
  }
  let p = raw.replace(/^file:(\/\/)?/, "").trim();
  const qIdx = p.indexOf("?");
  if (qIdx >= 0) p = p.slice(0, qIdx);
  if (p.startsWith("./")) {
    return path.join(process.cwd(), p.slice(2));
  }
  if (!path.isAbsolute(p)) {
    return path.join(process.cwd(), p);
  }
  return p;
}

/**
 * Удаляет файл(ы) SQLite демо. Ошибки (кроме «файла нет») пробрасываются —
 * иначе `prisma db push` пытается обновить старую схему и падает с неочевидной ошибкой.
 */
export function unlinkDemoSqliteFiles(): void {
  const fp = getDemoSqliteFilePath();
  for (const s of [
    fp,
    `${fp}-journal`,
    `${fp}-shm`,
    `${fp}-wal`,
  ]) {
    try {
      if (!fs.existsSync(s)) continue;
      fs.rmSync(s, { force: true });
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT") continue;
      throw new Error(
        `Не удалось удалить файл демо-БД (${path.basename(s)}): ${err.message}. Закройте Prisma Studio, другие копии приложения или снимите блокировку файла.`,
      );
    }
  }
}
