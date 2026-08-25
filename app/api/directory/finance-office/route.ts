import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  FINANCE_OFFICE_DEBT_DEFAULT_DAYS,
  FINANCE_OFFICE_DEBT_DEFAULT_SUBJECT,
  FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
  FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT,
  FINANCE_OFFICE_DOCUMENT_DEFAULT_TEMPLATE,
} from "@/lib/finance-office-debt-settings";

export const dynamic = "force-dynamic";

export async function GET() {
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
  const prisma = await getPrisma();
  const [tenant, accounts] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        financeOfficeDebtWorkingDays: true,
        financeOfficeDebtEmailSubject: true,
        financeOfficeDebtEmailTemplate: true,
        financeOfficeDocumentEmailSubject: true,
        financeOfficeDocumentEmailTemplate: true,
        financeOfficeDebtEmailAccountId: true,
      },
    }),
    prisma.emailAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { email: "asc" },
      select: { id: true, email: true, displayName: true },
    }),
  ]);
  return NextResponse.json({
    workingDays:
      tenant?.financeOfficeDebtWorkingDays ?? FINANCE_OFFICE_DEBT_DEFAULT_DAYS,
    subject:
      tenant?.financeOfficeDebtEmailSubject?.trim() ||
      FINANCE_OFFICE_DEBT_DEFAULT_SUBJECT,
    template:
      tenant?.financeOfficeDebtEmailTemplate?.trim() ||
      FINANCE_OFFICE_DEBT_DEFAULT_TEMPLATE,
    documentSubject:
      tenant?.financeOfficeDocumentEmailSubject?.trim() ||
      FINANCE_OFFICE_DOCUMENT_DEFAULT_SUBJECT,
    documentTemplate:
      tenant?.financeOfficeDocumentEmailTemplate?.trim() ||
      FINANCE_OFFICE_DOCUMENT_DEFAULT_TEMPLATE,
    accountId: tenant?.financeOfficeDebtEmailAccountId ?? null,
    accounts,
  });
}

export async function PATCH(req: Request) {
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
    workingDays?: unknown;
    subject?: unknown;
    template?: unknown;
    documentSubject?: unknown;
    documentTemplate?: unknown;
    accountId?: unknown;
  };
  const days = Math.trunc(Number(body.workingDays));
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: "Срок долга — от 1 до 365 рабочих дней." },
      { status: 400 },
    );
  }
  const subject = typeof body.subject === "string" ? body.subject : "";
  if (subject.length > 500) {
    return NextResponse.json(
      { error: "Тема письма слишком длинная." },
      { status: 400 },
    );
  }
  const template =
    typeof body.template === "string" ? body.template : "";
  if (template.length > 20000) {
    return NextResponse.json(
      { error: "Шаблон письма слишком длинный." },
      { status: 400 },
    );
  }
  const documentSubject =
    typeof body.documentSubject === "string" ? body.documentSubject : "";
  if (documentSubject.length > 500) {
    return NextResponse.json(
      { error: "Тема письма с документами слишком длинная." },
      { status: 400 },
    );
  }
  const documentTemplate =
    typeof body.documentTemplate === "string" ? body.documentTemplate : "";
  if (documentTemplate.length > 20000) {
    return NextResponse.json(
      { error: "Шаблон письма с документами слишком длинный." },
      { status: 400 },
    );
  }
  const accountId =
    typeof body.accountId === "string" && body.accountId.trim()
      ? body.accountId.trim()
      : null;
  const prisma = await getPrisma();
  if (accountId) {
    const acc = await prisma.emailAccount.findFirst({
      where: { id: accountId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!acc) {
      return NextResponse.json(
        { error: "Выбранный почтовый ящик не найден." },
        { status: 400 },
      );
    }
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      financeOfficeDebtWorkingDays: days,
      financeOfficeDebtEmailSubject: subject.trim() || null,
      financeOfficeDebtEmailTemplate: template.trim() || null,
      financeOfficeDocumentEmailSubject: documentSubject.trim() || null,
      financeOfficeDocumentEmailTemplate: documentTemplate.trim() || null,
      financeOfficeDebtEmailAccountId: accountId,
    },
  });
  return NextResponse.json({ ok: true });
}
