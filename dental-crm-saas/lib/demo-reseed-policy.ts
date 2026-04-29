/**
 * `DEMO_RESEED_ON_START=0` (или `false` / `no`): не пересоздавать файл демо при каждом входе
 * и не сбрасывать его при выходе — можно настраивать демо-данные в CRM и заходить в демо снова.
 *
 * По умолчанию (переменная не задана): при каждом входе в демо и при выходе — полный reseed.
 */
export function isDemoPersistentStorage(): boolean {
  const v = process.env.DEMO_RESEED_ON_START?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "no";
}
