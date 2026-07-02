import fs from "node:fs";
import readline from "node:readline";
import pino from "pino";
import {
  dailyCrmLogPath,
  listDaysInclusive,
  parseDayKey,
} from "@/lib/server/log-dir";

export const CRM_LOG_EXPORT_MAX_DAYS = 93;
export const CRM_LOG_EXPORT_MAX_BYTES = 24 * 1024 * 1024;
export const CRM_LOG_EXPORT_MAX_LINES = 200_000;

export type CrmLogExportLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_RANK: Record<CrmLogExportLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export function parseCrmLogExportLevel(
  value: string | null | undefined,
): CrmLogExportLevel | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v || v === "all") return null;
  if (v in LEVEL_RANK) return v as CrmLogExportLevel;
  return null;
}

export function parseCrmLogExportChannel(
  value: string | null | undefined,
): string | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v || v === "all") return null;
  return v;
}

export function validateCrmLogExportRange(
  from: string,
  to: string,
): { ok: true; from: string; to: string } | { ok: false; error: string } {
  const fromDay = parseDayKey(from);
  const toDay = parseDayKey(to);
  if (!fromDay) {
    return { ok: false, error: "Некорректная дата «с» (ожидается YYYY-MM-DD)" };
  }
  if (!toDay) {
    return { ok: false, error: "Некорректная дата «по» (ожидается YYYY-MM-DD)" };
  }
  if (fromDay.getTime() > toDay.getTime()) {
    return { ok: false, error: "Дата «с» не может быть позже даты «по»" };
  }
  const days = listDaysInclusive(from, to);
  if (days.length === 0) {
    return { ok: false, error: "Пустой период" };
  }
  if (days.length > CRM_LOG_EXPORT_MAX_DAYS) {
    return {
      ok: false,
      error: `Период не больше ${CRM_LOG_EXPORT_MAX_DAYS} дней`,
    };
  }
  return { ok: true, from: days[0]!, to: days.at(-1)! };
}

function levelLabel(level: unknown): string {
  if (typeof level === "number") {
    return pino.levels.labels[level] ?? String(level);
  }
  if (typeof level === "string") return level;
  return "info";
}

/** Одна строка JSONL pino → читаемая строка для .txt. */
export function formatCrmLogRecordLine(obj: Record<string, unknown>): string {
  const timeMs = typeof obj.time === "number" ? obj.time : Date.now();
  const iso = new Date(timeMs).toISOString().replace("T", " ").replace("Z", " UTC");
  const level = levelLabel(obj.level);
  const channel =
    typeof obj.channel === "string" && obj.channel.trim()
      ? `[${obj.channel.trim()}] `
      : "";
  const msg = typeof obj.msg === "string" ? obj.msg : "";
  const rest: Record<string, unknown> = { ...obj };
  for (const key of ["time", "level", "msg", "pid", "hostname", "channel", "v"]) {
    delete rest[key];
  }
  const extra =
    Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `${iso} ${level.toUpperCase().padEnd(5)} ${channel}${msg}${extra}`;
}

function passesLevelFilter(
  obj: Record<string, unknown>,
  minLevel: CrmLogExportLevel | null,
): boolean {
  if (!minLevel) return true;
  const min = LEVEL_RANK[minLevel];
  if (typeof obj.level === "number") return obj.level >= min;
  const label = levelLabel(obj.level).toLowerCase();
  const rank = LEVEL_RANK[label as CrmLogExportLevel];
  return rank != null ? rank >= min : true;
}

function passesChannelFilter(
  obj: Record<string, unknown>,
  channel: string | null,
): boolean {
  if (!channel) return true;
  const ch = typeof obj.channel === "string" ? obj.channel.trim().toLowerCase() : "";
  return ch === channel;
}

export type CrmLogExportResult =
  | {
      ok: true;
      text: string;
      lineCount: number;
      truncated: boolean;
      filesRead: number;
    }
  | { ok: false; error: string };

/**
 * Собирает логи за период из суточных файлов `crm-YYYY-MM-DD.log`.
 * Файлы, созданные до включения записи на диск, в выгрузку не попадут.
 */
export async function buildCrmLogExportText(opts: {
  from: string;
  to: string;
  minLevel?: CrmLogExportLevel | null;
  channel?: string | null;
}): Promise<CrmLogExportResult> {
  const range = validateCrmLogExportRange(opts.from, opts.to);
  if (!range.ok) return range;

  const days = listDaysInclusive(range.from, range.to);
  const minLevel = opts.minLevel ?? null;
  const channel = opts.channel ?? null;
  const lines: string[] = [];
  let bytes = 0;
  let truncated = false;
  let filesRead = 0;

  for (const day of days) {
    const filePath = dailyCrmLogPath(day);
    if (!fs.existsSync(filePath)) continue;
    filesRead += 1;

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const raw of rl) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      let obj: Record<string, unknown>;
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
          continue;
        }
        obj = parsed as Record<string, unknown>;
      } catch {
        lines.push(`(не JSON) ${trimmed}`);
        bytes += trimmed.length + 1;
        continue;
      }
      if (!passesLevelFilter(obj, minLevel)) continue;
      if (!passesChannelFilter(obj, channel)) continue;

      const formatted = formatCrmLogRecordLine(obj);
      const line = `${formatted}\n`;
      bytes += Buffer.byteLength(line, "utf8");
      if (bytes > CRM_LOG_EXPORT_MAX_BYTES || lines.length >= CRM_LOG_EXPORT_MAX_LINES) {
        truncated = true;
        break;
      }
      lines.push(formatted);
    }

    if (truncated) break;
  }

  if (lines.length === 0) {
    return {
      ok: false,
      error:
        filesRead === 0
          ? "За выбранный период файлов логов нет (запись на диск могла быть включена недавно)"
          : "За выбранный период записей не найдено",
    };
  }

  let text = lines.join("\n");
  if (truncated) {
    text += `\n\n--- Выгрузка обрезана: лимит ${CRM_LOG_EXPORT_MAX_LINES.toLocaleString("ru-RU")} строк или ${Math.round(CRM_LOG_EXPORT_MAX_BYTES / (1024 * 1024))} МБ ---\n`;
  }
  text += "\n";

  return {
    ok: true,
    text,
    lineCount: lines.length,
    truncated,
    filesRead,
  };
}
