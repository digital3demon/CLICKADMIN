export function normalizeTelegramBotUsername(raw: string | null | undefined): string {
  const src = (raw ?? "").trim();
  if (!src) return "";

  let v = src
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^@+/, "")
    .trim();

  const stop = v.search(/[/?#]/);
  if (stop >= 0) {
    v = v.slice(0, stop);
  }

  return v.trim();
}

export function looksLikeTelegramBotUsername(v: string): boolean {
  return /^[A-Za-z0-9_]{3,}$/.test(v);
}

