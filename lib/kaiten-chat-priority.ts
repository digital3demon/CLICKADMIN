/** Колонки Kaiten с высоким приоритетом фонового импорта чата («!!!» / «???»). */
const DEFAULT_PRIORITY_COLUMN_TITLES = [
  "К исполнению",
  "Очередь",
  "Производство",
  "Согласование",
  "На проверку",
  "Сборка",
  "Обработка",
  "НА СКАН",
] as const;

/** Колонки, которые опрашиваем реже (раз в N циклов курсора). */
const DEFAULT_LOW_PRIORITY_COLUMN_TITLES = [
  "Сдана админам",
  "Сдана",
] as const;

const LOW_PRIORITY_EVERY_N_CYCLES = 4;

function parseEnvColumnList(raw: string | undefined): string[] | null {
  const t = raw?.trim();
  if (!t) return null;
  return t
    .split(/[|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function kaitenChatPriorityColumnTitles(): string[] {
  const fromEnv = parseEnvColumnList(process.env.KAITEN_CHAT_PRIORITY_COLUMN_TITLES);
  return fromEnv ?? [...DEFAULT_PRIORITY_COLUMN_TITLES];
}

export function kaitenChatLowPriorityColumnTitles(): string[] {
  const fromEnv = parseEnvColumnList(process.env.KAITEN_CHAT_LOW_PRIORITY_COLUMN_TITLES);
  return fromEnv ?? [...DEFAULT_LOW_PRIORITY_COLUMN_TITLES];
}

export function kaitenChatLowPriorityCycleModulo(): number {
  const n = Number(process.env.KAITEN_CHAT_LOW_PRIORITY_EVERY_N_CYCLES ?? LOW_PRIORITY_EVERY_N_CYCLES);
  if (!Number.isFinite(n) || n < 2) return LOW_PRIORITY_EVERY_N_CYCLES;
  return Math.min(Math.trunc(n), 20);
}

export function shouldIncludeLowPriorityChatSyncCycle(cycle: number): boolean {
  const mod = kaitenChatLowPriorityCycleModulo();
  return cycle % mod === 0;
}
