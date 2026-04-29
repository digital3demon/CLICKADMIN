import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  assertDemoDatabaseDistinctFromMain,
  disconnectDemoPrisma,
  getDemoDatabaseUrl,
  getDemoPrisma,
} from "@/lib/prisma-demo";
import { unlinkDemoSqliteFiles } from "@/lib/demo-db-path";
import { seedDemoDatabase } from "@/lib/demo-seed";

/**
 * Полностью пересоздаёт файл демо-БД и заполняет сидом (после выхода из демо или при первом старте).
 * `db push` с `--force-reset`: старый demo.db мог остаться со схемой без обязательных колонок —
 * без сброса Prisma не может добавить `warehouseId`, `priceListId` и т.п. к существующим строкам.
 */
export async function resetAndSeedDemoDatabase(): Promise<void> {
  assertDemoDatabaseDistinctFromMain();
  await disconnectDemoPrisma();
  /** На Windows файл SQLite иногда остаётся залоченным сразу после $disconnect. */
  await new Promise((r) => setTimeout(r, 400));
  unlinkDemoSqliteFiles();

  const url = getDemoDatabaseUrl();
  await runPrismaDbPush(url);

  const db = getDemoPrisma();
  await seedDemoDatabase(db);
}

/**
 * На проде (NetAngels и т.п.) в PATH часто нет `npx` → spawn ENOENT.
 * Надёжнее: тот же Node, что крутит приложение, + `prisma/build/index.js` из `node_modules`.
 * При необходимости: `PRISMA_CLI_JS=/abs/path/to/prisma/build/index.js` в .env.
 */
function resolvePrismaDbPushSpawn(): {
  command: string;
  args: string[];
  shell: boolean;
} {
  const pushArgs = ["db", "push", "--accept-data-loss", "--force-reset"] as const;
  const fromEnv = process.env.PRISMA_CLI_JS?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return {
      command: process.execPath,
      args: [fromEnv, ...pushArgs],
      shell: false,
    };
  }
  const prismaJs = path.join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );
  if (existsSync(prismaJs)) {
    return {
      command: process.execPath,
      args: [prismaJs, ...pushArgs],
      shell: false,
    };
  }
  const isWin = process.platform === "win32";
  return {
    command: "npx",
    args: ["prisma", ...pushArgs],
    shell: isWin,
  };
}

function runPrismaDbPush(databaseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const { command, args, shell } = resolvePrismaDbPushSpawn();
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
