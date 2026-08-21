import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { augmentDatasourceUrl } from "@/lib/sqlite-datasource-url";

const g = globalThis as unknown as {
  demoPrisma?: PrismaClient;
};

/** Отдельная Postgres-схема в той же БД, что и прод (без второго инстанса БД). */
export const DEMO_PG_SCHEMA = "crm_demo";

function splitUrlQuery(url: string): [string, string] {
  const q = url.indexOf("?");
  if (q < 0) return [url, ""];
  return [url.slice(0, q), url.slice(q + 1)];
}

/** Подставить/заменить `?schema=` в postgres URL. */
export function withPostgresSchema(url: string, schemaName: string): string {
  const [base, queryRaw] = splitUrlQuery(url.trim());
  const params = new URLSearchParams(queryRaw);
  params.set("schema", schemaName);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//i.test(url.trim());
}

export function isSqliteFileUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith("file:");
}

/**
 * URL демо-БД для Prisma и `db push`.
 * При postgres-проде всегда та же БД со схемой `crm_demo` (не public / не полный прайс прода).
 * `DEMO_DATABASE_URL=file:…` и тот же postgres URL что DATABASE_URL — игнорируются.
 * Отдельный postgres-хост в DEMO_DATABASE_URL допускается, тоже с schema=crm_demo.
 */
export function getDemoDatabaseUrl(): string {
  const u = process.env.DEMO_DATABASE_URL?.trim();
  const main = process.env.DATABASE_URL?.trim() ?? "";

  if (isPostgresUrl(main)) {
    if (u && isPostgresUrl(u)) {
      const mainBase = splitUrlQuery(main)[0];
      const demoBase = splitUrlQuery(u)[0];
      if (mainBase !== demoBase) {
        return withPostgresSchema(u, DEMO_PG_SCHEMA);
      }
    }
    return withPostgresSchema(main, DEMO_PG_SCHEMA);
  }

  if (u && !isSqliteFileUrl(u)) return u;
  if (u && isSqliteFileUrl(u)) return u;
  return "file:./prisma/demo.db";
}

function absoluteSqlitePathFromDatasourceUrl(u: string): string | null {
  const t = u.trim();
  if (!t.toLowerCase().startsWith("file:")) return null;
  let p = t.replace(/^file:(\/\/)?/i, "").trim();
  const qIdx = p.indexOf("?");
  if (qIdx >= 0) p = p.slice(0, qIdx);
  if (p.startsWith("./")) p = p.slice(2);
  if (!path.isAbsolute(p)) p = path.join(process.cwd(), p);
  return path.normalize(p);
}

function postgresSchemaOf(url: string): string | null {
  if (!isPostgresUrl(url)) return null;
  const [, queryRaw] = splitUrlQuery(url.trim());
  const schema = new URLSearchParams(queryRaw).get("schema");
  return schema?.trim() || "public";
}

/**
 * Защита от случайной настройки, когда демо указывает на ту же БД, что и CRM.
 * Вызывать до `db push` и до создания клиента демо.
 */
export function assertDemoDatabaseDistinctFromMain(): void {
  const mainRaw = process.env.DATABASE_URL?.trim();
  const demoRaw = getDemoDatabaseUrl().trim();

  if (isSqliteFileUrl(demoRaw) && isPostgresUrl(mainRaw ?? "")) {
    throw new Error(
      "Демо получило SQLite URL при PostgreSQL-схеме — внутренний сбой getDemoDatabaseUrl.",
    );
  }

  if (isSqliteFileUrl(demoRaw) && !isPostgresUrl(mainRaw ?? "")) {
    throw new Error(
      "DEMO_DATABASE_URL=file:… несовместим со схемой PostgreSQL в prisma/schema.prisma. " +
        "Нужен DATABASE_URL=postgresql://… (демо возьмёт schema=crm_demo).",
    );
  }

  if (!mainRaw) return;

  if (isPostgresUrl(mainRaw) && isPostgresUrl(demoRaw)) {
    const mainSchema = postgresSchemaOf(mainRaw);
    const demoSchema = postgresSchemaOf(demoRaw);
    const mainBase = splitUrlQuery(mainRaw)[0];
    const demoBase = splitUrlQuery(demoRaw)[0];
    if (mainBase === demoBase && mainSchema === demoSchema) {
      throw new Error(
        `DEMO_DATABASE_URL совпадает с DATABASE_URL (включая schema=${mainSchema}). ` +
          `Для демо укажите другую БД или schema=${DEMO_PG_SCHEMA}.`,
      );
    }
    return;
  }

  const am = absoluteSqlitePathFromDatasourceUrl(mainRaw);
  const ad = absoluteSqlitePathFromDatasourceUrl(demoRaw);
  if (am && ad) {
    if (am === ad) {
      throw new Error(
        "DEMO_DATABASE_URL указывает на тот же файл SQLite, что и DATABASE_URL — демо и основная БД должны быть разными.",
      );
    }
    return;
  }
  if (demoRaw === mainRaw) {
    throw new Error(
      "DEMO_DATABASE_URL совпадает с DATABASE_URL — демо и основная БД должны быть разными.",
    );
  }
}

/** Отдельный клиент Prisma → только демо-URL (не пересекается с боевой схемой). */
export function getDemoPrisma(): PrismaClient {
  if (!g.demoPrisma) {
    assertDemoDatabaseDistinctFromMain();
    g.demoPrisma = new PrismaClient({
      log: ["error"],
      datasources: {
        db: { url: augmentDatasourceUrl(getDemoDatabaseUrl()) },
      },
      transactionOptions: {
        maxWait: 30_000,
        timeout: 180_000,
      },
    });
  }
  return g.demoPrisma;
}

export async function disconnectDemoPrisma(): Promise<void> {
  if (!g.demoPrisma) return;
  await g.demoPrisma.$disconnect();
  g.demoPrisma = undefined;
}
