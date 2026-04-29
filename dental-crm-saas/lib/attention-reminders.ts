import "server-only";

import type { PrismaClient } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import { prisma } from "@/lib/prisma";
import { getDemoPrisma } from "@/lib/prisma-demo";
export type AttentionReminderKind = "clinic" | "doctor" | "reconciliation";

export type AttentionReminder = {
  id: string;
  kind: AttentionReminderKind;
  href: string;
  /** Заголовок строки */
  primary: string;
  /** Подробности / текст уведомления */
  detail: string;
};

function isBlank(s: string | null | undefined): boolean {
  return s == null || !String(s).trim();
}

function clinicIncompleteReason(c: {
  address: string | null;
  legalFullName: string | null;
  inn: string | null;
}): string | null {
  const parts: string[] = [];
  if (isBlank(c.address)) parts.push("адрес");
  if (isBlank(c.legalFullName)) parts.push("юр. наименование");
  if (isBlank(c.inn)) parts.push("ИНН");
  return parts.length ? `Не заполнено: ${parts.join(", ")}` : null;
}

function doctorIncompleteReason(d: {
  phone: string | null;
  telegramUsername: string | null;
  preferredContact: string | null;
}): string | null {
  if (
    isBlank(d.phone) &&
    isBlank(d.telegramUsername) &&
    isBlank(d.preferredContact)
  ) {
    return "Нет телефона и способа связи";
  }
  return null;
}

const MAX_CLINICS = 12;
const MAX_DOCTORS = 12;
const MAX_RECONCILIATION = 24;
const FETCH_CAP = 250;

async function fetchReconciliationAttentionReminders(
  db: PrismaClient,
): Promise<AttentionReminder[]> {
  try {
    const rows = await db.clinicReconciliationSnapshot.findMany({
      where: { dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: MAX_RECONCILIATION,
      select: {
        id: true,
        clinicId: true,
        periodFromStr: true,
        periodToStr: true,
        periodLabelRu: true,
        legalEntityLabel: true,
        clinic: { select: { name: true } },
      },
    });
    return rows.map((r) => {
      const clinicName =
        r.clinic.name.split("\n")[0]?.trim() || "Клиника";
      return {
        id: `recon-${r.id}`,
        kind: "reconciliation" as const,
        href: `/clients/${r.clinicId}?tab=finance&from=${encodeURIComponent(
          r.periodFromStr,
        )}&to=${encodeURIComponent(r.periodToStr)}&reconSnapshot=${encodeURIComponent(
          r.id,
        )}`,
        primary: clinicName,
        detail: `Сверка для «${clinicName}» — ${r.legalEntityLabel} за ${r.periodLabelRu} готова`,
      };
    });
  } catch (e) {
    console.error("[attention-reconciliation]", e);
    return [];
  }
}

async function fetchIncompleteCardReminders(
  db: PrismaClient,
): Promise<AttentionReminder[]> {
  const [clinicRows, doctorRows] = await Promise.all([
    db.clinic.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        legalFullName: true,
        inn: true,
      },
      orderBy: { name: "asc" },
      take: FETCH_CAP,
    }),
    db.doctor.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        phone: true,
        telegramUsername: true,
        preferredContact: true,
      },
      orderBy: { fullName: "asc" },
      take: FETCH_CAP,
    }),
  ]);

  const clinicOut: AttentionReminder[] = [];
  for (const c of clinicRows) {
    const reason = clinicIncompleteReason(c);
    if (!reason) continue;
    clinicOut.push({
      id: `clinic-${c.id}`,
      kind: "clinic",
      href: `/clients/${c.id}?tab=requisites`,
      primary: c.name.split("\n")[0]?.trim() || "Клиника",
      detail: reason,
    });
    if (clinicOut.length >= MAX_CLINICS) break;
  }

  const doctorOut: AttentionReminder[] = [];
  for (const d of doctorRows) {
    const reason = doctorIncompleteReason(d);
    if (!reason) continue;
    doctorOut.push({
      id: `doctor-${d.id}`,
      kind: "doctor",
      href: `/clients/doctors/${d.id}`,
      primary: d.fullName,
      detail: reason,
    });
    if (doctorOut.length >= MAX_DOCTORS) break;
  }

  return [...clinicOut, ...doctorOut];
}

async function fetchNonOrderAttentionRemindersWithDb(
  db: PrismaClient,
): Promise<AttentionReminder[]> {
  try {
    const [recons, cards] = await Promise.all([
      fetchReconciliationAttentionReminders(db),
      fetchIncompleteCardReminders(db),
    ]);
    return [...recons, ...cards];
  } catch (e) {
    console.error("[attention-reminders]", e);
    return [];
  }
}

/**
 * Неполные карточки + готовые автосверки (без заказов).
 * Вне `unstable_cache`: выбор БД по cookie/сессии запроса.
 */
export async function fetchNonOrderAttentionReminders(): Promise<
  AttentionReminder[]
> {
  return fetchNonOrderAttentionRemindersWithDb(await getPrisma());
}

/**
 * В колбэке `unstable_cache` нельзя полагаться на `cookies()` / `getPrisma()` —
 * иначе снимок может собраться с основной БД и закэшироваться под ключом «demo».
 * Здесь явно передаём синглтоны Prisma на нужную БД.
 */
const getAttentionRemindersLive = unstable_cache(
  async () => fetchNonOrderAttentionRemindersWithDb(prisma),
  ["attention-reminders-v5", "live"],
  { revalidate: 45, tags: ["attention-reminders"] },
);

const getAttentionRemindersDemo = unstable_cache(
  async () => fetchNonOrderAttentionRemindersWithDb(getDemoPrisma()),
  ["attention-reminders-v5", "demo"],
  { revalidate: 45, tags: ["attention-reminders"] },
);

/** Одна загрузка на RSC-запрос; между запросами — два раздельных снимка ~45 с. */
export const getAttentionReminders = cache(async () => {
  const session = await getSessionFromCookies();
  if (session?.demo) {
    return getAttentionRemindersDemo();
  }
  return getAttentionRemindersLive();
});
