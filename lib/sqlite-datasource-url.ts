/**
 * Prisma SQLite: длинные запросы по умолчанию могут упираться в «Socket timeout»
 * (см. https://pris.ly/d/sqlite-connector). Дополняем `file:` URL параметрами пула.
 */

/** Таймаут ожидания ответа движка на один запрос, сек. */
const DEFAULT_SOCKET_TIMEOUT_SEC = 600;

/** Убрать `?…` из file-URL, чтобы получить только путь к файлу. */
export function sqliteFileUrlPathOnly(fileDatasourceUrl: string): string {
  const t = fileDatasourceUrl.trim();
  const q = t.indexOf("?");
  return (q >= 0 ? t.slice(0, q) : t).trim();
}

/**
 * Дополняет `file:…` URL параметрами Prisma/SQLite, не затирая уже заданные в `.env`.
 */
export function augmentSqliteDatasourceUrl(url: string): string {
  const raw = url.trim();
  if (raw.length === 0) return raw;
  if (!raw.toLowerCase().startsWith("file:")) return raw;

  const envSec = Number(process.env.PRISMA_SQLITE_SOCKET_TIMEOUT_SEC);
  const socketSec =
    Number.isFinite(envSec) && envSec > 0 ? Math.floor(envSec) : DEFAULT_SOCKET_TIMEOUT_SEC;

  const pathPart = sqliteFileUrlPathOnly(raw);
  const queryRaw = raw.length > pathPart.length ? raw.slice(pathPart.length + 1) : "";

  const params = new URLSearchParams(queryRaw);
  if (!params.has("connection_limit")) {
    /**
     * `connection_limit=1` — один долгий запрос монополизирует пул и блокирует остальные.
     * Переопределение: `PRISMA_SQLITE_CONNECTION_LIMIT` или `?connection_limit=` в URL.
     */
    const rawLimit = Number(process.env.PRISMA_SQLITE_CONNECTION_LIMIT);
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1
        ? Math.min(32, Math.floor(rawLimit))
        : 5;
    params.set("connection_limit", String(limit));
  }
  if (!params.has("socket_timeout")) {
    params.set("socket_timeout", String(socketSec));
  }

  const q = params.toString();
  return q ? `${pathPart}?${q}` : pathPart;
}
