/** Единый лимит тела загрузки (вложения наряда, счёт с сверки и т.п.). */
export const CRM_UPLOAD_MAX_BYTES = 1024 * 1024 * 1024;

export const CRM_UPLOAD_TOO_LARGE_MESSAGE =
  "Слишком большой файл, воспользуйтесь почтой или мессенджером, спасибо";

/** Для подписей в UI («1 ГБ», «15 МБ»). */
export function formatCrmUploadMaxShortRu(): string {
  const n = CRM_UPLOAD_MAX_BYTES;
  const gib = n / (1024 * 1024 * 1024);
  if (gib >= 1 && Number.isInteger(gib)) return `${gib} ГБ`;
  const mib = n / (1024 * 1024);
  if (mib >= 1 && Number.isInteger(mib)) return `${mib} МБ`;
  return `${Math.round(mib)} МБ`;
}
