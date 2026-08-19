import "server-only";

import { randomUUID } from "node:crypto";
import {
  demoAccessCodePrefix,
  generateDemoAccessCodePlain,
  hashDemoAccessCode,
  normalizeDemoAccessCodeInput,
  verifyDemoAccessCode,
} from "@/lib/auth/demo-access-code";
import { getDemoAccessPrisma } from "@/lib/prisma-demo-access";

function cleanText(v: string | null, max: number): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  const fromXff = xff?.split(",")[0]?.trim() ?? "";
  return (
    cleanText(fromXff, 64) ??
    cleanText(headers.get("x-real-ip"), 64) ??
    cleanText(headers.get("cf-connecting-ip"), 64) ??
    null
  );
}

export class DemoAccessCodeError extends Error {
  readonly code: "MISSING" | "INVALID" | "USED" | "REVOKED" | "RACE";

  constructor(code: DemoAccessCodeError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Проверить и «сжечь» код: один код = один вход / одна машина.
 * Возвращает sid для JWT демо-сессии.
 */
export async function consumeDemoAccessCodeOrThrow(input: {
  codePlain: string;
  headers: Headers;
}): Promise<{ codeId: string; sid: string }> {
  const plain = normalizeDemoAccessCodeInput(input.codePlain);
  if (!plain || plain.length < 8) {
    throw new DemoAccessCodeError("MISSING", "Введите код доступа к демо");
  }

  const db = getDemoAccessPrisma();
  const prefix = demoAccessCodePrefix(plain);
  const candidates = await db.demoAccessCode.findMany({
    where: {
      prefix,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      codeHash: true,
      consumedAt: true,
      boundSid: true,
    },
  });

  let matched: (typeof candidates)[number] | null = null;
  for (const row of candidates) {
    if (await verifyDemoAccessCode(plain, row.codeHash)) {
      matched = row;
      break;
    }
  }

  if (!matched) {
    throw new DemoAccessCodeError("INVALID", "Неверный код доступа");
  }
  if (matched.consumedAt || matched.boundSid) {
    throw new DemoAccessCodeError(
      "USED",
      "Этот код уже использован. Нужен новый код от владельца.",
    );
  }

  const sid = randomUUID();
  const now = new Date();
  const userAgent = cleanText(input.headers.get("user-agent"), 1000);
  const ipAddress = clientIpFromHeaders(input.headers);

  const updated = await db.demoAccessCode.updateMany({
    where: {
      id: matched.id,
      consumedAt: null,
      boundSid: null,
      revokedAt: null,
    },
    data: {
      consumedAt: now,
      boundSid: sid,
      boundUserAgent: userAgent,
      boundIpAddress: ipAddress,
    },
  });

  if (updated.count !== 1) {
    throw new DemoAccessCodeError(
      "RACE",
      "Этот код уже использован. Нужен новый код от владельца.",
    );
  }

  return { codeId: matched.id, sid };
}

export async function createDemoAccessCode(input: {
  label?: string | null;
  createdByUserId?: string | null;
}): Promise<{
  id: string;
  codePlain: string;
  prefix: string;
  label: string | null;
}> {
  const codePlain = generateDemoAccessCodePlain();
  const codeHash = await hashDemoAccessCode(codePlain);
  const prefix = demoAccessCodePrefix(codePlain);
  const label = cleanText(input.label ?? null, 80);

  const db = getDemoAccessPrisma();
  const row = await db.demoAccessCode.create({
    data: {
      label,
      codeHash,
      prefix,
      createdByUserId: input.createdByUserId ?? null,
    },
    select: { id: true, label: true, prefix: true },
  });

  return {
    id: row.id,
    codePlain,
    prefix: row.prefix,
    label: row.label,
  };
}
