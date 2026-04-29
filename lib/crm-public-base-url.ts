import "server-only";

/** Публичный URL CRM (ссылки в письмах, в боте). См. `CRM_PUBLIC_BASE_URL`. */
export function crmPublicBaseUrl(): string {
  const raw = process.env.CRM_PUBLIC_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
