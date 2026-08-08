import {
  decodeOrderPublicRef,
  encodeOrderPublicRef,
} from "@/lib/order-public-ref";

const STARTAPP_SAFE = /^[\w-]{0,512}$/;

export type TelegramMiniAppStartTarget =
  | { kind: "order"; orderId: string; orderRef: string }
  | { kind: "card"; cardId: string };

/** startapp для наряда: o_<publicRef>, только [A-Za-z0-9_-]. */
export function encodeTelegramMiniAppStartParamOrder(orderId: string): string {
  const ref = encodeOrderPublicRef(orderId);
  const param = `o_${ref}`;
  if (!STARTAPP_SAFE.test(param)) {
    throw new Error("startapp order param has invalid characters");
  }
  return param;
}

/** startapp для карточки канбана без наряда: c_<safeId>. */
export function encodeTelegramMiniAppStartParamCard(cardId: string): string {
  const safe = String(cardId || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 500);
  const param = `c_${safe || "unknown"}`;
  if (!STARTAPP_SAFE.test(param)) {
    throw new Error("startapp card param has invalid characters");
  }
  return param;
}

export function parseTelegramMiniAppStartParam(
  raw: string | null | undefined,
): TelegramMiniAppStartTarget | null {
  const p = String(raw ?? "").trim();
  if (!p || !STARTAPP_SAFE.test(p)) return null;

  if (p.startsWith("o_")) {
    const orderRef = p.slice(2);
    const orderId = decodeOrderPublicRef(orderRef);
    if (!orderId) return null;
    return { kind: "order", orderId, orderRef };
  }

  if (p.startsWith("c_")) {
    const cardId = p.slice(2);
    if (!cardId) return null;
    return { kind: "card", cardId };
  }

  return null;
}
