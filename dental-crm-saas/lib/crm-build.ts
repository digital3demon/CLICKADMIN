import "server-only";

/**
 * `lab` — внутренняя лаборатория (kaiten.ru) — **по умолчанию** при `npm run dev` / `npm run build`.
 * `commercial` — только в артефакте из `npm run build:commercial` (или в runtime env **отдельного** деплоя), не в вашей ежедневной .env с лаб-БД.
 */
export type CrmBuild = "lab" | "commercial";

export function getCrmBuild(): CrmBuild {
  const v = process.env.CRM_BUILD?.trim().toLowerCase();
  if (v === "commercial" || v === "prod" || v === "saas") return "commercial";
  return "lab";
}

export function isCommercialBuild(): boolean {
  return getCrmBuild() === "commercial";
}

/** В lab можно вызывать kaiten.ru; в commercial — нет. */
export function isKaitenExternalEnabled(): boolean {
  return (
    getCrmBuild() === "lab" && Boolean(process.env.KAITEN_API_TOKEN?.trim())
  );
}
