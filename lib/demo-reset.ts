import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertDemoDatabaseDistinctFromMain,
  DEMO_PG_SCHEMA,
  disconnectDemoPrisma,
  getDemoDatabaseUrl,
  getDemoPrisma,
  isPostgresUrl,
  isSqliteFileUrl,
} from "@/lib/prisma-demo";
import { unlinkDemoSqliteFiles } from "@/lib/demo-db-path";
import { seedDemoDatabase } from "@/lib/demo-seed";
import { ensureFinanceOfficeDebtColumns } from "@/lib/ensure-finance-office-debt-columns";
import { resolvePrismaSchemaPath } from "@/lib/prisma-schema-path";

/**
 * Полностью пересоздаёт демо-данные.
 * Postgres: `db push --force-reset` только если схемы ещё нет — иначе сид сам чистит таблицы.
 * (Раньше push на каждый вход → на PaaS часто уходил в `npx prisma` и падал на fast-check.)
 */
export async function resetAndSeedDemoDatabase(): Promise<void> {
  assertDemoDatabaseDistinctFromMain();
  await disconnectDemoPrisma();
  /** На Windows файл SQLite иногда остаётся залоченным сразу после $disconnect. */
  await new Promise((r) => setTimeout(r, 400));

  const url = getDemoDatabaseUrl();

  if (isSqliteFileUrl(url)) {
    unlinkDemoSqliteFiles();
    await runPrismaDbPush(url);
    const demo = getDemoPrisma();
    await ensureFinanceOfficeDebtColumns(demo);
    await seedDemoDatabase(demo);
    return;
  }

  if (isPostgresUrl(url)) {
    const ready = await isDemoPostgresSchemaReady();
    if (ready) {
      const demo = getDemoPrisma();
      await ensureFinanceOfficeDebtColumns(demo);
      await seedDemoDatabase(demo);
      return;
    }
    await disconnectDemoPrisma();
    await runPrismaDbPush(url);
    await seedDemoDatabase(getDemoPrisma());
    return;
  }

  await runPrismaDbPush(url);
  await seedDemoDatabase(getDemoPrisma());
}

/** Есть ли в schema=crm_demo базовая таблица User (после первого успешного push). */
export async function isDemoPostgresSchemaReady(): Promise<boolean> {
  try {
    const db = getDemoPrisma();
    const rows = await db.$queryRaw<Array<{ ok: number }>>`
      SELECT 1 AS ok
      FROM information_schema.tables
      WHERE table_schema = ${DEMO_PG_SCHEMA}
        AND table_name = 'User'
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    await disconnectDemoPrisma().catch(() => {});
    return false;
  }
}

/**
 * Локальный `prisma/build/index.js` — без npx (на PaaS npx тянет битый кэш / MODULE_NOT_FOUND).
 * `PRISMA_CLI_JS` — явный override.
 */
export function resolveLocalPrismaCliJs(): string | null {
  const fromEnv = process.env.PRISMA_CLI_JS?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const fromMarker = path.join(process.cwd(), ".prisma-cli-js");
  if (existsSync(fromMarker)) {
    try {
      const p = readFileSync(fromMarker, "utf8").trim();
      if (p && existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }

  const candidates: string[] = [];
  const roots = [
    process.cwd(),
    path.join(process.cwd(), ".next", "standalone"),
  ];
  for (const root of roots) {
    candidates.push(
      path.join(root, "node_modules", "prisma", "build", "index.js"),
    );
    try {
      const req = createRequire(path.join(root, "package.json"));
      candidates.push(req.resolve("prisma/build/index.js"));
    } catch {
      /* no package.json / no prisma */
    }
  }

  for (const prismaJs of candidates) {
    if (existsSync(prismaJs)) return prismaJs;
  }
  return null;
}

function resolvePrismaDbPushSpawn(schemaPath: string): {
  command: string;
  args: string[];
  shell: boolean;
} {
  const pushArgs = [
    "db",
    "push",
    "--accept-data-loss",
    "--force-reset",
    "--skip-generate",
    `--schema=${schemaPath}`,
  ] as const;

  const localJs = resolveLocalPrismaCliJs();
  if (localJs) {
    return {
      command: process.execPath,
      args: [localJs, ...pushArgs],
      shell: false,
    };
  }

  throw new Error(
    "Не найден локальный Prisma CLI (node_modules/prisma/build/index.js). " +
      "На PaaS нельзя использовать npx prisma — падает MODULE_NOT_FOUND (fast-check). " +
      "Скопируйте пакет prisma в выкладку или задайте PRISMA_CLI_JS. " +
      `cwd=${process.cwd()}`,
  );
}

function runPrismaDbPush(databaseUrl: string): Promise<void> {
  const schemaPath = resolvePrismaSchemaPath();
  if (!schemaPath) {
    return Promise.reject(
      new Error(
        "Не найден prisma/schema.prisma (нужен для демо-БД). " +
          "На App Platform схема должна копироваться в standalone при build:platform. " +
          "Либо задайте PRISMA_SCHEMA_PATH.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let spawnSpec: { command: string; args: string[]; shell: boolean };
    try {
      spawnSpec = resolvePrismaDbPushSpawn(schemaPath);
    } catch (e) {
      reject(e);
      return;
    }
    const { command, args, shell } = spawnSpec;
    console.info(
      "[demo-reset] prisma db push via",
      command === process.execPath ? args[0] : command,
    );
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    let out = "";
    const append = (ch: Buffer) => {
      out += ch.toString();
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const tail = out.trim().slice(-800);
      reject(
        new Error(
          `prisma db push завершился с кодом ${code ?? "unknown"}${tail ? `: ${tail}` : ""}`,
        ),
      );
    });
  });
}
