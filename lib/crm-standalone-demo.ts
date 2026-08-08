/**
 * Standalone-демо (demo.click-lab.online): отдельный процесс, без прод-БД/Kaiten.
 * Задаётся CRM_STANDALONE_DEMO=1 (сервер) и при необходимости NEXT_PUBLIC_CRM_STANDALONE_DEMO=1 (клиент).
 */

function truthyEnv(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isCrmStandaloneDemo(): boolean {
  return (
    truthyEnv(process.env.CRM_STANDALONE_DEMO) ||
    truthyEnv(process.env.NEXT_PUBLIC_CRM_STANDALONE_DEMO)
  );
}

/** Отображаемое имя на канбане в демо/standalone. */
export const DEMO_KANBAN_PERSON_LABEL = "Пользователь";

/**
 * Fail-fast: standalone не должен смотреть в Postgres прода и не должен иметь Kaiten token.
 * Вызывать при старте API/страниц standalone (лениво).
 */
export function assertCrmStandaloneDemoSafe(): void {
  if (!isCrmStandaloneDemo()) return;
  const db = (process.env.DATABASE_URL ?? "").trim();
  if (/^postgres(ql)?:\/\//i.test(db)) {
    throw new Error(
      "CRM_STANDALONE_DEMO: DATABASE_URL указывает на PostgreSQL — демо должно использовать только локальный файл (file:…), без БД прода.",
    );
  }
  if ((process.env.KAITEN_API_TOKEN ?? "").trim()) {
    throw new Error(
      "CRM_STANDALONE_DEMO: KAITEN_API_TOKEN задан — в демо Kaiten запрещён. Удалите токен из env.",
    );
  }
}
