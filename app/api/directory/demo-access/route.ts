import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  demoAccessCodeStatus,
  formatDemoAccessCodePrefixForUi,
} from "@/lib/auth/demo-access-code";
import {
  demoAccessSessionExpiresAt,
  isDemoAccessSessionExpired,
} from "@/lib/auth/demo-access-session-policy";
import { createDemoAccessCode } from "@/lib/demo-access-consume";
import { getDemoAccessPrisma } from "@/lib/prisma-demo-access";
import { isCrmStandaloneDemo } from "@/lib/crm-standalone-demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Список кодов входа в общее демо (OWNER). Без тенантов. */
export async function GET() {
  if (isCrmStandaloneDemo()) {
    return NextResponse.json(
      { error: "Коды демо выдаются из рабочей CRM, не из демо-хоста" },
      { status: 403 },
    );
  }
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER" || session.demo) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const rows = await getDemoAccessPrisma().demoAccessCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      label: true,
      prefix: true,
      createdAt: true,
      revokedAt: true,
      consumedAt: true,
      boundUserAgent: true,
      boundIpAddress: true,
    },
  });

  return NextResponse.json({
    codes: rows.map((r) => {
      const status = demoAccessCodeStatus(r);
      const expiresAt = r.consumedAt
        ? demoAccessSessionExpiresAt(r.consumedAt).toISOString()
        : null;
      const sessionActive =
        Boolean(r.consumedAt) &&
        !isDemoAccessSessionExpired({
          consumedAt: r.consumedAt,
          revokedAt: r.revokedAt,
        });
      return {
        id: r.id,
        label: r.label,
        prefixLabel: formatDemoAccessCodePrefixForUi(r.prefix),
        createdAt: r.createdAt.toISOString(),
        revokedAt: r.revokedAt?.toISOString() ?? null,
        consumedAt: r.consumedAt?.toISOString() ?? null,
        expiresAt,
        sessionActive,
        boundHint: r.consumedAt
          ? [r.boundIpAddress, r.boundUserAgent?.slice(0, 48)]
              .filter(Boolean)
              .join(" · ") || "использован"
          : null,
        status,
        active: status === "unused" || sessionActive,
      };
    }),
  });
}

/** Создать код. Plaintext возвращается один раз. */
export async function POST(req: Request) {
  if (isCrmStandaloneDemo()) {
    return NextResponse.json(
      { error: "Коды демо выдаются из рабочей CRM, не из демо-хоста" },
      { status: 403 },
    );
  }
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER" || session.demo) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: { label?: unknown } = {};
  try {
    body = (await req.json()) as { label?: unknown };
  } catch {
    body = {};
  }

  const label =
    typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";

  const created = await createDemoAccessCode({
    label: label || null,
    createdByUserId: session.sub,
  });

  return NextResponse.json({
    id: created.id,
    label: created.label,
    prefixLabel: formatDemoAccessCodePrefixForUi(created.prefix),
    /** Показывается один раз — передайте гостю. */
    code: created.codePlain,
  });
}
