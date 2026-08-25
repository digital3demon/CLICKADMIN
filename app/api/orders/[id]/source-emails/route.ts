import { NextResponse } from "next/server";
import { canLinkEmailsToOrder } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { filterOrderDocumentMailEmails } from "@/lib/mail/order-document-mail-filter";
import { fetchOrderSourceEmails } from "@/lib/mail/order-source-emails";
import { linkEmailsToOrder } from "@/lib/mail/link-emails-to-order.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

function canReadOrderMail(access: Record<string, boolean> | null | undefined) {
  return access?.ORDERS === true || access?.FINANCE_OFFICE === true;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Тенант не найден" }, { status: 403 });
  }
  const access = await getEffectiveModuleAccess(tenantId, session.role);
  if (!canReadOrderMail(access)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const { id: orderId } = await params;
  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  const emails = await fetchOrderSourceEmails(prisma, tenantId, orderId);
  const kind = new URL(req.url).searchParams.get("kind");
  return NextResponse.json({
    emails:
      kind === "documents" ? filterOrderDocumentMailEmails(emails) : emails,
  });
}

type PostBody = {
  emailIds?: unknown;
  comment?: unknown;
  unblock?: unknown;
};

/**
 * Привязать письма к наряду.
 * Body: { emailIds: string[], comment?: string, unblock?: boolean }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Тенант не найден" }, { status: 403 });
  }
  const moduleAccess = await getEffectiveModuleAccess(tenantId, session.role);
  if (!canLinkEmailsToOrder(session.role, moduleAccess)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const { id: orderId } = await params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    body = {};
  }

  const prisma = await getOrdersPrisma();
  const result = await linkEmailsToOrder({
    prisma,
    tenantId,
    orderId,
    emailIds: body.emailIds,
    comment: typeof body.comment === "string" ? body.comment : null,
    unblock: Boolean(body.unblock),
    actor: {
      name: session.name,
      email: session.email,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    linked: result.linked,
    alreadyLinked: result.alreadyLinked,
    unblock: result.unblock,
    unblockError: result.unblockError ?? null,
    commentPosted: result.commentPosted,
    commentError: result.commentError ?? null,
    orderNumber: result.orderNumber,
    kaitenBlockedBefore: result.kaitenBlockedBefore,
  });
}
