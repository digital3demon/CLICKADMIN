import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { augmentSqliteDatasourceUrl } from "@/lib/sqlite-datasource-url";

const g = globalThis as unknown as {
  demoPrisma?: PrismaClient;
};

/** URL демо-БД для Prisma и `db push` (по умолчанию отдельный файл SQLite). */
export function getDemoDatabaseUrl(): string {
  const u = process.env.DEMO_DATABASE_URL?.trim();
  if (u) return u;
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

/**
 * Защита от случайной настройки, когда демо указывает на ту же БД, что и CRM.
 * Вызывать до `db push` и до создания клиента демо.
 */
export function assertDemoDatabaseDistinctFromMain(): void {
  const mainRaw = process.env.DATABASE_URL?.trim();
  if (!mainRaw) return;
  const demoRaw = getDemoDatabaseUrl().trim();
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

/** Отдельный клиент Prisma → только файл демо-БД (не пересекается с DATABASE_URL). */
export function getDemoPrisma(): PrismaClient {
  if (!g.demoPrisma) {
    assertDemoDatabaseDistinctFromMain();
    g.demoPrisma = new PrismaClient({
      log: ["error"],
      datasources: {
        db: { url: augmentSqliteDatasourceUrl(getDemoDatabaseUrl()) },
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
