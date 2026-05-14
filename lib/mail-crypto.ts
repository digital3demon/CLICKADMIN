import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1";

function key(): Buffer {
  const secret = process.env.MAIL_CREDENTIALS_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("MAIL_CREDENTIALS_SECRET is required and must be at least 16 characters");
  }
  return createHash("sha256").update(secret).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function encryptMailSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, b64url(iv), b64url(tag), b64url(encrypted)].join(":");
}

export function decryptMailSecret(encrypted: string): string {
  const [version, ivRaw, tagRaw, bodyRaw] = encrypted.split(":");
  if (version !== PREFIX || !ivRaw || !tagRaw || !bodyRaw) {
    throw new Error("Unsupported encrypted mail secret format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), fromB64url(ivRaw));
  decipher.setAuthTag(fromB64url(tagRaw));
  return Buffer.concat([
    decipher.update(fromB64url(bodyRaw)),
    decipher.final(),
  ]).toString("utf8");
}
