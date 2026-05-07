const ORDER_REF_PREFIX = "or_";

function toHex(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    out += value.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return out;
}

function fromHex(hex: string): string | null {
  if (!hex || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    const code = Number.parseInt(hex.slice(i, i + 2), 16);
    if (!Number.isFinite(code)) return null;
    out += String.fromCharCode(code);
  }
  return out;
}

export function encodeOrderPublicRef(orderId: string): string {
  const raw = String(orderId || "").trim();
  if (!raw) return "";
  return `${ORDER_REF_PREFIX}${toHex(raw)}`;
}

export function decodeOrderPublicRef(ref: string): string | null {
  const raw = String(ref || "").trim();
  if (!raw.startsWith(ORDER_REF_PREFIX)) return null;
  return fromHex(raw.slice(ORDER_REF_PREFIX.length));
}

export function orderPathById(orderId: string): string {
  return `/orders/${encodeOrderPublicRef(orderId)}`;
}
