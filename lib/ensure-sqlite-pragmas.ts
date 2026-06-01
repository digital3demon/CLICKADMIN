import type { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as {
  sqlitePragmasApplied?: WeakSet<PrismaClient>;
};

/**
 * WAL + busy_timeout: читатели (списки заказов, sidebar) не ждут долгую запись почтового sync.
 * Вызывается один раз на экземпляр PrismaClient.
 */
export async function ensureSqlitePragmas(client: PrismaClient): Promise<void> {
  if (!g.sqlitePragmasApplied) {
    g.sqlitePragmasApplied = new WeakSet();
  }
  if (g.sqlitePragmasApplied.has(client)) return;
  try {
    const busyMs = Math.max(
      5_000,
      Math.min(120_000, Number(process.env.SQLITE_BUSY_TIMEOUT_MS) || 30_000),
    );
    await client.$executeRawUnsafe(`PRAGMA busy_timeout = ${Math.floor(busyMs)}`);
    await client.$executeRawUnsafe("PRAGMA journal_mode = WAL");
    g.sqlitePragmasApplied.add(client);
  } catch {
    /* не SQLite или read-only — игнорируем */
  }
}
