import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitAllow } from "@/lib/server/rate-limit-edge";

const RESERVED = new Set([
  "www",
  "api",
  "crm",
  "app",
  "mail",
  "cllb",
  "static",
  "default",
  "admin",
  "demo",
]);

function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown"
  );
}

function isValidSlug(s: string) {
  if (s.length < 2 || s.length > 48) return false;
  return /^[a-z0-9-]+$/.test(s);
}

/**
 * POST { slug } → { url: "https://slug... } если тенант есть. Иначе 404.
 * Защита: отдельный лимит (через key portal:ip) от перебора префиксов.
 */
export async function POST(req: Request) {
  if (!rateLimitAllow(`portal:${clientIp(req)}`)) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  let body: { slug?: string };
  try {
    body = (await req.json()) as { slug?: string };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const raw = String(body.slug ?? "")
    .trim()
    .toLowerCase();
  if (!isValidSlug(raw) || RESERVED.has(raw)) {
    return NextResponse.json(
      { error: "Некорректный префикс" },
      { status: 400 },
    );
  }

  const row = await prisma.tenant.findUnique({
    where: { slug: raw },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  const hostBase =
    process.env.CRM_TENANT_BASE_HOST?.trim() || "click-lab.online";
  const proto = req.headers.get("x-forwarded-proto") === "https" ? "https" : "https";
  const url = `${proto}://${raw}.${hostBase}/login`;

  return NextResponse.json({ url });
}
