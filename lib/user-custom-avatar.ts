import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 600_000;

export type CustomAvatarMime = "image/jpeg" | "image/png" | "image/webp";

function detectMime(buf: Buffer): CustomAvatarMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function avatarStorageDir(demo: boolean): string {
  return path.join(process.cwd(), "data", demo ? "demo-user-avatars" : "user-avatars");
}

function avatarFilePath(userId: string, demo: boolean): string {
  return path.join(avatarStorageDir(demo), userId);
}

export async function ensureAvatarDir(demo: boolean): Promise<void> {
  await fs.mkdir(avatarStorageDir(demo), { recursive: true });
}

export function validateAvatarBuffer(buf: Buffer): { mime: CustomAvatarMime } | { error: string } {
  if (buf.length > MAX_BYTES) {
    return { error: `Файл слишком большой (макс. ${Math.round(MAX_BYTES / 1000)} КБ).` };
  }
  const mime = detectMime(buf);
  if (!mime) return { error: "Допустимы только JPEG, PNG или WebP." };
  return { mime };
}

export async function writeUserAvatarFile(
  userId: string,
  demo: boolean,
  buf: Buffer,
): Promise<{ mime: CustomAvatarMime } | { error: string }> {
  const v = validateAvatarBuffer(buf);
  if ("error" in v) return v;
  await ensureAvatarDir(demo);
  await fs.writeFile(avatarFilePath(userId, demo), buf, { mode: 0o600 });
  return { mime: v.mime };
}

export async function readUserAvatarFile(
  userId: string,
  demo: boolean,
): Promise<Buffer | null> {
  try {
    return await fs.readFile(avatarFilePath(userId, demo));
  } catch {
    return null;
  }
}

export function nonEmptyAvatarCustomData(
  raw: Uint8Array | Buffer | null | undefined,
): boolean {
  if (raw == null) return false;
  return Buffer.isBuffer(raw) ? raw.length > 0 : raw.byteLength > 0;
}

/** Сначала байты из БД, иначе файл на диске (legacy). */
export async function readUserCustomAvatarBuffer(
  userId: string,
  demo: boolean,
  row: { avatarCustomData?: Uint8Array | Buffer | null },
): Promise<Buffer | null> {
  if (nonEmptyAvatarCustomData(row.avatarCustomData ?? null)) {
    const d = row.avatarCustomData!;
    return Buffer.isBuffer(d) ? d : Buffer.from(d);
  }
  return readUserAvatarFile(userId, demo);
}

export async function deleteUserAvatarFile(userId: string, demo: boolean): Promise<void> {
  try {
    await fs.unlink(avatarFilePath(userId, demo));
  } catch {
    /* ignore */
  }
}
