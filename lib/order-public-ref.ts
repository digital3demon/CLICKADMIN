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

function toBase64(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64");
  }
  if (typeof btoa === "function") {
    return btoa(input);
  }
  return "";
}

function fromBase64(input: string): string | null {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(input, "base64").toString("utf8");
    }
    if (typeof atob === "function") {
      return atob(input);
    }
  } catch {
    return null;
  }
  return null;
}

function toBase64Url(input: string): string {
  const b64 = toBase64(input);
  if (!b64) return "";
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string | null {
  if (!input || /[^A-Za-z0-9_-]/.test(input)) return null;
  const padded = input + "=".repeat((4 - (input.length % 4 || 4)) % 4);
  return fromBase64(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

export function encodeOrderPublicRef(orderId: string): string {
  const raw = String(orderId || "").trim();
  if (!raw) return "";
  return `${ORDER_REF_PREFIX}${toBase64Url(raw)}`;
}

export function decodeOrderPublicRef(ref: string): string | null {
  const raw = String(ref || "").trim();
  if (!raw.startsWith(ORDER_REF_PREFIX)) return null;
  const body = raw.slice(ORDER_REF_PREFIX.length);
  // Backward compatibility: old links were hex-encoded.
  if (body.length % 2 === 0 && /^[0-9a-f]+$/i.test(body)) {
    return fromHex(body);
  }
  return fromBase64Url(body);
}

export function orderPathById(orderId: string): string {
  return `/orders/${encodeOrderPublicRef(orderId)}`;
}

/** Id наряда из пути `/orders/or_…` (или legacy hex). */
export function orderIdFromOrderPath(path: string): string | null {
  const raw = String(path || "").trim();
  const m = raw.match(/^\/orders\/([^/?#]+)/);
  if (!m?.[1]) return null;
  return decodeOrderPublicRef(m[1]);
}
