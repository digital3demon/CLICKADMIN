import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { formatLocalDayKey } from "@/lib/server/log-dir";

export function getAiDatasetDir(): string {
  const raw = process.env.AI_DATASET_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), "data", "ai-dataset");
}

export async function appendToDatasetFile(tenantId: string, jsonlLine: string): Promise<void> {
  const dir = getAiDatasetDir();
  await fs.mkdir(dir, { recursive: true });

  // Группируем по месяцам: tenantId-YYYY-MM.jsonl
  const monthKey = formatLocalDayKey(new Date()).slice(0, 7);
  const fileName = `${tenantId}-${monthKey}.jsonl`;
  const filePath = path.join(dir, fileName);

  await fs.appendFile(filePath, jsonlLine + "\n", "utf8");
}
