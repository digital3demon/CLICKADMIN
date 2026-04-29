/**
 * Виджет «солнце / луна / погода» в сайдбаре.
 * По умолчанию выключен; включить: `NEXT_PUBLIC_CRM_WORKDAY_SKY=1` в .env и пересборка dev.
 */
export function isWorkdaySkyWidgetEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_CRM_WORKDAY_SKY?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
