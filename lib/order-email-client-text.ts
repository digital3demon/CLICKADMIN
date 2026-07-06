/**
 * Очистка текста письма для поля «Заказ от клиента»:
 * дословные слова клиента, без подписей и служебных блоков.
 */

const SIGNATURE_MARKERS = [
  /^--\s*$/m,
  /^с уважением/miu,
  /^best regards/mi,
  /^regards,/mi,
  /^отправлено с (iphone|android|mail)/miu,
  /^получите outlook/miu,
];

export function stripEmailSignatures(text: string): string {
  let out = text.trim();
  for (const re of SIGNATURE_MARKERS) {
    const m = out.match(re);
    if (m && m.index != null && m.index > 0) {
      out = out.slice(0, m.index).trim();
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Убрать явные строки шапки пересылки, если ИИ их оставил. */
export function stripEmailHeaderLines(text: string): string {
  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (/^письмо\s*:/iu.test(t)) return false;
    if (/^от\s*:/iu.test(t) && t.includes("@")) return false;
    if (/^дата\s*:/iu.test(t)) return false;
    if (/^fwd\s*:/iu.test(t)) return false;
    if (/^пересл/i.test(t) && t.length < 80) return false;
    return true;
  });
  return filtered.join("\n").trim();
}

export function normalizeClientOrderText(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return stripEmailHeaderLines(stripEmailSignatures(raw.trim()));
}
