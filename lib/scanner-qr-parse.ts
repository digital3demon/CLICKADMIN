/**
 * Разбор QR со скана наряда/этикетки → заказ.
 * Источники: витрина `/p/t/{slug}/s/{token}` (канон) и legacy URL карточки Kaiten.
 */

export type ParsedScannerQr =
  | { kind: "hub"; tenantSlug: string; token: string }
  | { kind: "kaiten"; cardId: number }
  | { kind: "unknown" };

/**
 * Достаёт первый URL/путь витрины или Kaiten из текста QR.
 * Границы без `\b` — кириллица до/после URL не ломает матч.
 */
export function parseScannerQrPayload(raw: string): ParsedScannerQr {
  const text = String(raw ?? "").trim();
  if (!text) return { kind: "unknown" };

  // Hub: абсолютный или относительный путь. Lookahead/behind вместо \b (кириллица).
  const hubRe =
    /(?:^|[\s"'<>(])((?:https?:\/\/[^\s"'<>]+)?\/p\/t\/([^/?#\s]+)\/s\/([^/?#\s]+))/iu;
  const hub = hubRe.exec(text);
  if (hub) {
    const tenantSlug = decodeURIComponent(hub[2] ?? "").trim();
    const token = decodeURIComponent(hub[3] ?? "").trim();
    if (tenantSlug && token) {
      return { kind: "hub", tenantSlug, token };
    }
  }

  // Только path без origin
  const hubPathRe = /(?:^|[\s"'<>(])(\/p\/t\/([^/?#\s]+)\/s\/([^/?#\s]+))/iu;
  const hubPath = hubPathRe.exec(text);
  if (hubPath) {
    const tenantSlug = decodeURIComponent(hubPath[2] ?? "").trim();
    const token = decodeURIComponent(hubPath[3] ?? "").trim();
    if (tenantSlug && token) {
      return { kind: "hub", tenantSlug, token };
    }
  }

  // Legacy Kaiten: …kaiten…/{digits} или шаблон /card/{id}
  const kaitenCardRe =
    /(?:^|[\s"'<>(])(https?:\/\/[^\s"'<>]*kaiten[^\s"'<>]*\/(?:card\/)?(\d{4,}))(?:[/?#\s"'<>]|$)/iu;
  const kaiten = kaitenCardRe.exec(text);
  if (kaiten) {
    const cardId = Number(kaiten[2]);
    if (Number.isFinite(cardId) && cardId > 0) {
      return { kind: "kaiten", cardId };
    }
  }

  // clicklab.kaiten.ru/68081570 без слова card
  const plainIdRe =
    /(?:^|[\s"'<>(])(https?:\/\/(?:[\w.-]+\.)?kaiten\.ru\/(\d{4,}))(?:[/?#\s"'<>]|$)/iu;
  const plain = plainIdRe.exec(text);
  if (plain) {
    const cardId = Number(plain[2]);
    if (Number.isFinite(cardId) && cardId > 0) {
      return { kind: "kaiten", cardId };
    }
  }

  // QR целиком — только URL
  if (/^https?:\/\//i.test(text)) {
    try {
      const u = new URL(text);
      const pathHub = /^\/p\/t\/([^/]+)\/s\/([^/]+)\/?$/i.exec(u.pathname);
      if (pathHub) {
        const tenantSlug = decodeURIComponent(pathHub[1] ?? "").trim();
        const token = decodeURIComponent(pathHub[2] ?? "").trim();
        if (tenantSlug && token) return { kind: "hub", tenantSlug, token };
      }
      const pathCard = /\/(?:card\/)?(\d{4,})\/?$/i.exec(u.pathname);
      if (pathCard && /kaiten/i.test(u.hostname)) {
        const cardId = Number(pathCard[1]);
        if (Number.isFinite(cardId) && cardId > 0) {
          return { kind: "kaiten", cardId };
        }
      }
    } catch {
      /* ignore */
    }
  }

  return { kind: "unknown" };
}

/** Hub / Kaiten / голый YYMM-NNN — то, что CRM умеет резолвить. */
export function isCrmUsefulScannerQr(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;
  const parsed = parseScannerQrPayload(t);
  if (parsed.kind === "hub" || parsed.kind === "kaiten") return true;
  if (/^\d{4}-\d{3}$/.test(t)) return true;
  return false;
}

/**
 * DataMatrix/GS1 производителя (абатмент Geo и т.п.) — не наряд.
 * Пример с фото: (01)08800028717599(10)260429-LS80(11)260429
 */
export function isManufacturerOrNoiseBarcode(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return true;
  if (isCrmUsefulScannerQr(t)) return false;
  if (t.startsWith("(01)") || /^01\d{13}/.test(t)) return true;
  if (/^\d{6}-[A-Za-z0-9]{2,}$/.test(t)) return true;
  if (/^\d{12,}$/.test(t)) return true;
  return false;
}

/** Среди нескольких QR на кадре берём витрину/Kaiten, не GS1. */
export function pickPreferredScannerQr(texts: string[]): string | null {
  const cleaned = texts.map((t) => String(t ?? "").trim()).filter(Boolean);
  for (const t of cleaned) {
    if (isCrmUsefulScannerQr(t)) return t;
  }
  for (const t of cleaned) {
    if (!isManufacturerOrNoiseBarcode(t)) return t;
  }
  return null;
}

export type ScannerOrderResolveOk = {
  ok: true;
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  tenantId: string;
  qrKind: "hub" | "kaiten" | "ocr";
};

export type ScannerOrderResolveFail = {
  ok: false;
  reason:
    | "unknown_qr"
    | "order_not_found"
    | "tenant_mismatch"
    | "no_text_match"
    | "ambiguous_order_number";
  candidates?: string[];
};

export type ScannerOrderResolve = ScannerOrderResolveOk | ScannerOrderResolveFail;
