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

export type ScannerOrderResolveOk = {
  ok: true;
  orderId: string;
  orderNumber: string;
  tenantId: string;
  qrKind: "hub" | "kaiten" | "ocr";
};

export type ScannerOrderResolveFail = {
  ok: false;
  reason: "unknown_qr" | "order_not_found" | "tenant_mismatch" | "no_text_match";
};

export type ScannerOrderResolve = ScannerOrderResolveOk | ScannerOrderResolveFail;
