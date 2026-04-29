import "server-only";

/**
 * Подсказки для операторов при типичных сбоях SQLite / FS на сервере (миграции, права, диск).
 */
export function dbRequestUserHint(error: unknown, defaultMessage: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  const low = msg.toLowerCase();
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const blob = `${low} ${code.toLowerCase()}`;

  if (
    blob.includes("no such column") ||
    blob.includes("no such table") ||
    blob.includes("does not exist in the current database") ||
    blob.includes("p2021") ||
    blob.includes("p2022") ||
    blob.includes("sql_schema")
  ) {
    return (
      "Схема SQLite не совпадает с версией приложения (часто в логах: «no such column» / P2022). " +
      "В каталоге с актуальным кодом и server.js выполните prisma migrate deploy (см. README-SERVER-BUNDLE.txt или npm run db:migrate:deploy). " +
      "Проверьте, что DATABASE_URL указывает на тот же файл БД, куда вы гоняли migrate."
    );
  }
  if (/database is locked|sqlite_busy|timed out during query execution/i.test(msg)) {
    return "База данных занята. Закройте другие процессы с этой БД и повторите.";
  }
  if (
    blob.includes("eacces") ||
    blob.includes("eperm") ||
    low.includes("permission denied") ||
    low.includes("read-only file system") ||
    blob.includes("enospc")
  ) {
    return "Ошибка записи на диск (права или место). Для фото профиля приложение пишет в каталог data/user-avatars рядом с server.js — проверьте владельца процесса и права на data/.";
  }
  if (blob.includes("enoent") && (low.includes("mkdir") || low.includes("open"))) {
    return "Не удалось создать каталог для файлов (data/). Проверьте права на каталог приложения.";
  }
  if (
    low.includes("can't reach database server") ||
    low.includes("server has closed the connection") ||
    low.includes("invalid database url")
  ) {
    return "Не удаётся подключиться к базе. Проверьте DATABASE_URL в .env.";
  }
  return defaultMessage;
}
