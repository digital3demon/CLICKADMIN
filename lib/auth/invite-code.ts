import { randomBytes } from "node:crypto";

/** Десять символов A–F0–9 — удобно передавать голосом/мессенджером. */
export function generateInviteCodePlain(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

export function normalizeInviteCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
