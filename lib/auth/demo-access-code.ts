import { randomBytes } from "node:crypto";
import { hashSecret, verifySecret } from "@/lib/auth/password";

/** Десять символов A–F0–9 — удобно передать голосом/мессенджером. */
export function generateDemoAccessCodePlain(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function normalizeDemoAccessCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-]/g, "");
}

/** Префикс для индекса поиска (без bcrypt по всей таблице). */
export function demoAccessCodePrefix(plain: string): string {
  return normalizeDemoAccessCodeInput(plain).slice(0, 4);
}

export function formatDemoAccessCodePrefixForUi(prefix: string): string {
  const p = prefix.trim().toUpperCase();
  if (p.length <= 2) return p || "—";
  return `${p.slice(0, 2)}……`;
}

export async function hashDemoAccessCode(plain: string): Promise<string> {
  return hashSecret(normalizeDemoAccessCodeInput(plain));
}

export async function verifyDemoAccessCode(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return verifySecret(normalizeDemoAccessCodeInput(plain), hash);
}

export type DemoAccessCodeStatus = "unused" | "used" | "revoked";

export function demoAccessCodeStatus(row: {
  revokedAt: Date | null;
  consumedAt: Date | null;
}): DemoAccessCodeStatus {
  if (row.revokedAt) return "revoked";
  if (row.consumedAt) return "used";
  return "unused";
}
