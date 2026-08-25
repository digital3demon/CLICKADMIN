import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  applyFinanceOfficeDebtTemplate,
  FINANCE_OFFICE_DEBT_DEFAULT_DAYS,
  FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
  financeOfficeDebtEmailHtml,
} from "@/lib/finance-office-debt-settings";
import { sendSmtpMessage } from "@/lib/mail/smtp-client";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import {
  FINANCE_OFFICE_DEBT_NOTIFY_MAX,
  financeOfficeDebtScopeWhere,
  looksLikeDebtNotifyEmail,
} from "@/lib/finance-office-debts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.FINANCE_OFFICE !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    items?: Array<{ orderId?: unknown; email?: unknown }>;
  };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Выберите долги." }, { status: 400 });
  }
  if (items.length > FINANCE_OFFICE_DEBT_NOTIFY_MAX) {
    return NextResponse.json(
      {
        error: `За один раз не больше ${FINANCE_OFFICE_DEBT_NOTIFY_MAX} писем.`,
      },
      { status: 400 },
    );
  }

  const prisma = await getPrisma();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      financeOfficeDebtEmailTemplate: true,
      financeOfficeDebtEmailAccountId: true,
      financeOfficeDebtWorkingDays: true,
    },
  });
  const workingDays =
    tenant?.financeOfficeDebtWorkingDays ?? FINANCE_OFFICE_DEBT_DEFAULT_DAYS;
  const preferredId = tenant?.financeOfficeDebtEmailAccountId ?? null;
  const account =
    (preferredId
      ? await prisma.emailAccount.findFirst({
          where: { id: preferredId, tenantId, isActive: true },
        })
      : null) ??
    (await prisma.emailAccount.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    }));
  if (!account?.encryptedAppPassword) {
    return NextResponse.json(
      {
        error:
          "Нет настроенного почтового ящика. Выберите ящик в Конфигурация → ФинОтдел.",
      },
      { status: 400 },
    );
  }

  const template =
    tenant?.financeOfficeDebtEmailTemplate?.trim() ||
    FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE;

  const results: Array<{
    orderId: string;
    orderNumber?: string;
    ok: boolean;
    message: string;
  }> = [];

  for (const raw of items) {
    const orderId = typeof raw.orderId === "string" ? raw.orderId.trim() : "";
    const email = typeof raw.email === "string" ? raw.email.trim() : "";
    if (!orderId) {
      results.push({ orderId: "", ok: false, message: "Нет id наряда" });
      continue;
    }
    if (!email || !looksLikeDebtNotifyEmail(email)) {
      results.push({
        orderId,
        ok: false,
        message: "Укажите почтовый адрес",
      });
      continue;
    }
    const order = await prisma.order.findFirst({
      where: {
        AND: [
          { id: orderId },
          financeOfficeDebtScopeWhere({ tenantId, workingDays }),
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        patientName: true,
        clinic: { select: { name: true } },
        invoiceAttachment: {
          select: { fileName: true, mimeType: true, data: true, diskRelPath: true },
        },
        updAttachment: {
          select: { fileName: true, mimeType: true, data: true, diskRelPath: true },
        },
      },
    });
    if (!order) {
      results.push({
        orderId,
        ok: false,
        message: "Наряд не в долгах (оплачен или срок ещё не вышел)",
      });
      continue;
    }
    const attachments: Array<{
      filename: string;
      contentType: string;
      content: Buffer;
    }> = [];
    const warnings: string[] = [];
    for (const [label, row] of [
      ["счёт", order.invoiceAttachment],
      ["УПД", order.updAttachment],
    ] as const) {
      if (!row) {
        warnings.push(`нет файла ${label}`);
        continue;
      }
      try {
        const content = await readOrderAttachmentBytes(row);
        attachments.push({
          filename: row.fileName,
          contentType: row.mimeType || "application/octet-stream",
          content,
        });
      } catch {
        warnings.push(`не удалось прочитать ${label}`);
      }
    }
    const text = applyFinanceOfficeDebtTemplate(template, {
      номер: order.orderNumber,
      пациент: order.patientName?.trim() || "—",
      клиника: order.clinic?.name?.trim() || "—",
    });
    try {
      await sendSmtpMessage(account, {
        to: email,
        subject: `Напоминание об оплате ${order.orderNumber}`,
        text,
        html: financeOfficeDebtEmailHtml(text),
        attachments,
      });
      results.push({
        orderId,
        orderNumber: order.orderNumber,
        ok: true,
        message: warnings.length
          ? `Отправлено (${warnings.join("; ")})`
          : "Отправлено",
      });
    } catch (e) {
      results.push({
        orderId,
        orderNumber: order.orderNumber,
        ok: false,
        message: e instanceof Error ? e.message : "Ошибка отправки",
      });
    }
  }

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
