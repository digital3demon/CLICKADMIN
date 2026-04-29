/** Запасная подпись без сессии (только фоновые сценарии). На главной см. {@link getHomeGreetingDisplayName}. */
export const currentEmployeeDisplayName = "коллега";

/**
 * Подпись без сессии (фоновые сценарии). Для HTTP-запросов с пользователем используйте
 * {@link getActorForRevision} из `lib/actor-from-session.ts`.
 */
export function getCurrentActorLabel(): string {
  const env = process.env.CRM_ACTOR_NAME?.trim();
  if (env) return env;
  return currentEmployeeDisplayName;
}
