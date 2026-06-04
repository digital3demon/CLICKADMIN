import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  DEFAULT_UI_DESIGN,
  UI_DESIGN_CLIENT_STATE_KEY,
  isUiDesign,
  type UiDesign,
} from "@/lib/ui-design";

export const dynamic = "force-dynamic";

type PutBody = {
  design?: unknown;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const prisma = await getPrisma();
  const row = await prisma.userClientState.findUnique({
    where: {
      userId_key: {
        userId: session.sub,
        key: UI_DESIGN_CLIENT_STATE_KEY,
      },
    },
    select: { value: true, updatedAt: true },
  });

  const raw =
    row?.value != null &&
    typeof row.value === "object" &&
    row.value !== null &&
    "design" in row.value
      ? String((row.value as { design?: unknown }).design)
      : null;
  const design: UiDesign = isUiDesign(raw) ? raw : DEFAULT_UI_DESIGN;

  return NextResponse.json({
    found: row != null && isUiDesign(raw),
    design,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const designRaw =
    typeof body.design === "string" ? body.design : String(body.design ?? "");
  if (!isUiDesign(designRaw)) {
    return NextResponse.json(
      { error: 'design должен быть "classic" или "harmony"' },
      { status: 400 },
    );
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const prisma = await getPrisma();
  await prisma.userClientState.upsert({
    where: {
      userId_key: {
        userId: session.sub,
        key: UI_DESIGN_CLIENT_STATE_KEY,
      },
    },
    create: {
      userId: session.sub,
      tenantId,
      key: UI_DESIGN_CLIENT_STATE_KEY,
      value: { design: designRaw } as never,
    },
    update: {
      tenantId,
      value: { design: designRaw } as never,
    },
  });

  return NextResponse.json({ ok: true, design: designRaw });
}
