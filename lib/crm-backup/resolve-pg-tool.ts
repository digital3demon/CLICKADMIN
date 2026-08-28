/**
 * Где брать pg_dump / psql: env, затем типичные пути Linux/Windows.
 * Timeweb-образ кладёт клиент в /usr/local/bin (см. Dockerfile).
 */
import fs from "node:fs";
import path from "node:path";

export type PgClientToolName = "pg_dump" | "psql";

function envKeyFor(name: PgClientToolName): "PG_DUMP_PATH" | "PSQL_PATH" {
  return name === "pg_dump" ? "PG_DUMP_PATH" : "PSQL_PATH";
}

export function pgToolCandidatePaths(
  name: PgClientToolName,
  platform: string = process.platform,
): string[] {
  const exe = platform === "win32" ? `${name}.exe` : name;
  const out: string[] = [
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
    `/bin/${name}`,
  ];
  for (let v = 18; v >= 13; v -= 1) {
    out.push(`/usr/lib/postgresql/${v}/bin/${name}`);
    out.push(`/usr/pgsql-${v}/bin/${name}`);
  }
  if (platform === "win32") {
    for (let v = 18; v >= 10; v -= 1) {
      out.push(`C:\\Program Files\\PostgreSQL\\${v}\\bin\\${exe}`);
    }
  }
  return out;
}

export function resolvePgToolPath(
  name: PgClientToolName,
  opts?: {
    env?: NodeJS.Dict<string>;
    platform?: string;
    exists?: (filePath: string) => boolean;
  },
): string {
  const env = opts?.env ?? process.env;
  const platform = opts?.platform ?? process.platform;
  const exists = opts?.exists ?? ((p: string) => fs.existsSync(p));
  const fromEnv = String(env[envKeyFor(name)] || "").trim();
  if (fromEnv) return fromEnv;
  for (const candidate of pgToolCandidatePaths(name, platform)) {
    if (exists(candidate)) return candidate;
  }
  return name;
}

export function formatPgToolSpawnError(
  name: PgClientToolName,
  resolved: string,
  result: { error?: NodeJS.ErrnoException; stderr?: string; status?: number | null },
): string {
  const stderr = String(result.stderr || "").trim();
  if (result.error?.code === "ENOENT") {
    return [
      `Не найден ${name} (${resolved}).`,
      "На сервере задайте",
      name === "pg_dump" ? "PG_DUMP_PATH" : "PSQL_PATH",
      "или поставьте postgresql-client в образ.",
    ].join(" ");
  }
  if (stderr) return stderr;
  return `Не удалось запустить ${name} (${resolved}, код ${result.status ?? "?"}).`;
}

export function pgToolDisplayName(resolved: string): string {
  return path.basename(resolved);
}
