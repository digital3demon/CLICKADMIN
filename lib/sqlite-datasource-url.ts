/**
 * Prisma datasource URL: доп. параметры пула для SQLite и PostgreSQL.
 * SQLite: socket_timeout (см. https://pris.ly/d/sqlite-connector).
 * PostgreSQL: connection_limit — иначе каждый PrismaClient открывает десятки слотов.
 */

/** Таймаут ожидания ответа движка SQLite на один запрос, сек. */
const DEFAULT_SOCKET_TIMEOUT_SEC = 600;

/** Дефолтный лимит соединений Prisma → PostgreSQL на один процесс Node. */
const DEFAULT_PG_CONNECTION_LIMIT = 5;

function splitUrlQuery(url: string): [string, string] {
  const q = url.indexOf("?");
  if (q < 0) return [url, ""];
  return [url.slice(0, q), url.slice(q + 1)];
}

/** Убрать `?…` из file-URL, чтобы получить только путь к файлу. */
export function sqliteFileUrlPathOnly(fileDatasourceUrl: string): string {
  return splitUrlQuery(fileDatasourceUrl.trim())[0].trim();
}

function readBoundedInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function augmentPostgresDatasourceUrl(url: string): string {
  const [base, queryRaw] = splitUrlQuery(url.trim());
  const params = new URLSearchParams(queryRaw);
  if (!params.has("connection_limit")) {
    const limit = readBoundedInt(
      process.env.PRISMA_PG_CONNECTION_LIMIT,
      DEFAULT_PG_CONNECTION_LIMIT,
      1,
      20,
    );
    params.set("connection_limit", String(limit));
  }
  if (!params.has("pool_timeout")) {
    params.set("pool_timeout", "30");
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

function augmentSqliteFileDatasourceUrl(url: string): string {
  const envSec = Number(process.env.PRISMA_SQLITE_SOCKET_TIMEOUT_SEC);
  const socketSec =
    Number.isFinite(envSec) && envSec > 0 ? Math.floor(envSec) : DEFAULT_SOCKET_TIMEOUT_SEC;

  const pathPart = sqliteFileUrlPathOnly(url);
  const queryRaw = url.length > pathPart.length ? url.slice(pathPart.length + 1) : "";

  const params = new URLSearchParams(queryRaw);
  if (!params.has("connection_limit")) {
    /**
     * `connection_limit=1` — один долгий запрос монополизирует пул и блокирует остальные.
     * Переопределение: `PRISMA_SQLITE_CONNECTION_LIMIT` или `?connection_limit=` в URL.
     */
    const limit = readBoundedInt(process.env.PRISMA_SQLITE_CONNECTION_LIMIT, 5, 1, 32);
    params.set("connection_limit", String(limit));
  }
  if (!params.has("socket_timeout")) {
    params.set("socket_timeout", String(socketSec));
  }

  const q = params.toString();
  return q ? `${pathPart}?${q}` : pathPart;
}

/** Дополняет URL параметрами пула Prisma, не затирая уже заданные в `.env`. */
export function augmentDatasourceUrl(url: string): string {
  const raw = url.trim();
  if (raw.length === 0) return raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith("file:")) return augmentSqliteFileDatasourceUrl(raw);
  if (lower.startsWith("postgres")) return augmentPostgresDatasourceUrl(raw);
  return raw;
}

/**
 * @deprecated alias — используйте augmentDatasourceUrl
 */
export function augmentSqliteDatasourceUrl(url: string): string {
  return augmentDatasourceUrl(url);
}
