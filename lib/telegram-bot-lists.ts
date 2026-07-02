import "server-only";

import { UserRole } from "@prisma/client";
import { fetchShipmentOrdersInDueRange } from "@/lib/fetch-shipments-orders";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import {
  addCalendarDaysYmd,
  moscowDayBoundsUtc,
  moscowShipmentDayBoundsUtc,
  moscowShipmentInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  moscowTomorrowYmd,
  moscowWorkWeekFridayYmd,
} from "@/lib/shipments-date-range";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { endYmdKanbanDlinetm } from "@/lib/kanban-dline-end-ymd";
import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import type { ShipmentOrderRow } from "@/lib/fetch-shipments-orders";
import { getClientsPrisma } from "@/lib/get-domain-prisma";

export {
  isTelegramBotListCommand,
  resolveTelegramBotListCommand,
  telegramMenuLabelToCommand,
} from "@/lib/telegram-bot-menu-commands";

const MAX_LINK_LINES = 120;

const SHIP_COMMAND_ROLES = new Set<UserRole>([
  UserRole.SENIOR_ADMINISTRATOR,
  UserRole.ADMINISTRATOR,
  UserRole.SENIOR_TECHNICIAN,
  UserRole.MANAGER,
  UserRole.OWNER,
]);

const DLINE_EXCLUDED_ROLES = new Set<UserRole>([
  UserRole.ADMINISTRATOR,
  UserRole.SENIOR_ADMINISTRATOR,
]);

function telegramEscapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function telegramEscapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Одна строка, как в списке Kaiten/канбана (две строки шапки склеиваются пробелом). */
function telegramOrderCardTitleOneLineFromShipmentRow(o: ShipmentOrderRow): string {
  return buildKaitenCardTitle({
    orderNumber: o.orderNumber,
    patientName: o.patientName,
    doctor: o.doctor,
    dueDate: o.dueDate,
    kaitenLabDueHasTime: o.kaitenAdminDueHasTime !== false,
    kaitenCardTitleLabel: o.kaitenCardTitleLabel,
    kaitenCardType: o.kaitenCardType,
    isUrgent: o.isUrgent,
    urgentCoefficient: o.urgentCoefficient,
  })
    .replace(/\n/g, " ")
    .trim();
}

function telegramOrderCardTitleOneLineFromParts(p: {
  orderNumber: string;
  patientName: string | null;
  dueDate: Date | null;
  kaitenAdminDueHasTime: boolean | null;
  kaitenCardTitleLabel: string | null;
  doctor: { fullName: string };
  kaitenCardType: { name: string } | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
}): string {
  return buildKaitenCardTitle({
    orderNumber: p.orderNumber,
    patientName: p.patientName,
    doctor: p.doctor,
    dueDate: p.dueDate,
    kaitenLabDueHasTime: p.kaitenAdminDueHasTime !== false,
    kaitenCardTitleLabel: p.kaitenCardTitleLabel,
    kaitenCardType: p.kaitenCardType,
    isUrgent: p.isUrgent,
    urgentCoefficient: p.urgentCoefficient,
  })
    .replace(/\n/g, " ")
    .trim();
}

function orderCardHref(kaitenCardId: number | null, orderId: string): string {
  if (kaitenCardId != null) {
    const k = getKaitenCardWebUrl(kaitenCardId);
    if (k) return k;
  }
  const base = crmPublicBaseUrl().replace(/\/+$/, "");
  return `${base}${kanbanOrderDeepLinkPath(orderId)}`;
}

function formatHtmlLinkList(
  items: { url: string; label: string }[],
  emptyRu: string,
  header: string,
): string {
  if (items.length === 0) {
    return `<b>${telegramEscapeHtmlText(header)}</b>\n${telegramEscapeHtmlText(emptyRu)}`;
  }
  const slice = items.slice(0, MAX_LINK_LINES);
  const extra =
    items.length > MAX_LINK_LINES
      ? `\n… ещё ${items.length - MAX_LINK_LINES}`
      : "";
  const lines = slice.map(
    (x) =>
      `<a href="${telegramEscapeHtmlAttr(x.url)}">${telegramEscapeHtmlText(x.label)}</a>`,
  );
  return `<b>${telegramEscapeHtmlText(header)}</b>\n${lines.join("\n")}${extra}`;
}

export function telegramRoleMayShip(role: UserRole): boolean {
  return SHIP_COMMAND_ROLES.has(role);
}

export function telegramRoleMayDline(role: UserRole): boolean {
  return !DLINE_EXCLUDED_ROLES.has(role);
}

/** Нижняя клавиатура в чате: только кнопки, разрешённые роли (остальное — команды вручную). */
export function telegramReplyKeyboardMarkupForRole(
  role: UserRole,
): Record<string, unknown> | null {
  const rows: { text: string }[][] = [];
  if (telegramRoleMayShip(role)) {
    rows.push([
      { text: "Отгрузки на сегодня" },
      { text: "Отгрузки на завтра" },
    ]);
    rows.push([{ text: "Отгрузки до конца недели" }]);
  }
  if (telegramRoleMayDline(role)) {
    rows.push([
      { text: "Срок на сегодня" },
      { text: "Срок на завтра" },
    ]);
    rows.push([{ text: "Срок до конца недели" }]);
  }
  if (rows.length === 0) return null;
  return {
    keyboard: rows,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export async function tryTelegramBotListCommand(opts: {
  command: string;
  tenantId: string;
  role: UserRole;
}): Promise<{ text: string; parseMode: "HTML" } | null> {
  const cmd = opts.command.toLowerCase();
  const { tenantId, role } = opts;

  const shipCmd =
    cmd === "/shiptd" || cmd === "/shiptm" || cmd === "/shipw";
  const dlineCmd =
    cmd === "/dlinew" ||
    cmd === "/dlinetd" ||
    cmd === "/dlinetm";

  if (!shipCmd && !dlineCmd) return null;

  if (shipCmd && !telegramRoleMayShip(role)) {
    return {
      parseMode: "HTML",
      text: "Эта команда доступна старшему администратору, администратору, старшему технику, руководителю или владельцу.",
    };
  }
  if (dlineCmd && !telegramRoleMayDline(role)) {
    return {
      parseMode: "HTML",
      text: "Эта команда не предназначена для роли администратора.",
    };
  }

  const ordersDb = await resolveTenantPrismaClient(tenantId);
  const todayYmd = moscowTodayYmd();

  if (shipCmd) {
    let start: Date;
    let endExclusive: Date;
    let header: string;

    if (cmd === "/shiptd") {
      const b = moscowShipmentDayBoundsUtc(todayYmd);
      start = b.start;
      endExclusive = b.endExclusive;
      header = `Отгрузки на сегодня (${todayYmd} 00:00 — ${addCalendarDaysYmd(todayYmd, 1)} 12:00 МСК)`;
    } else if (cmd === "/shiptm") {
      const ymd = moscowTomorrowYmd();
      const b = moscowShipmentDayBoundsUtc(ymd);
      start = b.start;
      endExclusive = b.endExclusive;
      header = `Отгрузки на завтра (${ymd} 00:00 — ${addCalendarDaysYmd(ymd, 1)} 12:00 МСК)`;
    } else {
      const fri = moscowWorkWeekFridayYmd(todayYmd);
      const b = moscowShipmentInclusiveRangeBoundsUtc(todayYmd, fri);
      start = b.start;
      endExclusive = b.endExclusive;
      header = `Отгрузки до конца рабочей недели (${todayYmd} … ${fri}, окна срока лаборатории как на странице «Отгрузки»)`;
    }

    const rows = await fetchShipmentOrdersInDueRange(
      ordersDb,
      tenantId,
      start,
      endExclusive,
    );
    const items = rows.map((o) => ({
      url: orderCardHref(o.kaitenCardId, o.id),
      label: telegramOrderCardTitleOneLineFromShipmentRow(o),
    }));
    return {
      parseMode: "HTML",
      text: formatHtmlLinkList(items, "Отгрузок нет", header),
    };
  }

  /* dline */
  let start: Date;
  let endExclusive: Date;
  let header: string;

  if (cmd === "/dlinetd") {
    const b = moscowDayBoundsUtc(todayYmd);
    start = b.start;
    endExclusive = b.endExclusive;
    header = `Срок лабораторный (канбан) на сегодня (${todayYmd}, МСК)`;
  } else if (cmd === "/dlinetm") {
    const endYmd = endYmdKanbanDlinetm(todayYmd);
    start = moscowDayBoundsUtc(todayYmd).start;
    endExclusive = moscowDayBoundsUtc(addCalendarDaysYmd(endYmd, 1)).start;
    header = `Срок лабораторный (канбан), по ${endYmd} включительно (${todayYmd}…${endYmd}, МСК)`;
  } else {
    const fri = moscowWorkWeekFridayYmd(todayYmd);
    start = moscowDayBoundsUtc(todayYmd).start;
    endExclusive = moscowDayBoundsUtc(addCalendarDaysYmd(fri, 1)).start;
    header = `Срок лабораторный до конца рабочей недели (${todayYmd}…${fri}, МСК)`;
  }

  const dueRows = await ordersDb.order.findMany({
    where: {
      tenantId,
      archivedAt: null,
      dueDate: { not: null, gte: start, lt: endExclusive },
    },
    orderBy: [{ dueDate: "asc" }, { orderNumber: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      dueDate: true,
      kaitenAdminDueHasTime: true,
      kaitenCardTitleLabel: true,
      doctorId: true,
      kaitenCardTypeId: true,
      kaitenCardId: true,
      isUrgent: true,
      urgentCoefficient: true,
    },
  });

  const clientsPrisma = await getClientsPrisma();
  const doctorIds = Array.from(new Set(dueRows.map((x) => x.doctorId)));
  const cardTypeIds = Array.from(
    new Set(dueRows.map((x) => x.kaitenCardTypeId).filter(Boolean)),
  ) as string[];
  const [doctors, cardTypes] = await Promise.all([
    clientsPrisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, fullName: true },
    }),
    cardTypeIds.length
      ? clientsPrisma.kaitenCardType.findMany({
          where: { id: { in: cardTypeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const doctorById = new Map(doctors.map((d) => [d.id, d]));
  const cardTypeById = new Map(cardTypes.map((t) => [t.id, t]));

  const items = dueRows.map((row) => {
    const doctor = doctorById.get(row.doctorId);
    const kt = row.kaitenCardTypeId
      ? cardTypeById.get(row.kaitenCardTypeId)
      : undefined;
    return {
      url: orderCardHref(row.kaitenCardId, row.id),
      label: telegramOrderCardTitleOneLineFromParts({
        orderNumber: row.orderNumber,
        patientName: row.patientName,
        dueDate: row.dueDate,
        kaitenAdminDueHasTime: row.kaitenAdminDueHasTime,
        kaitenCardTitleLabel: row.kaitenCardTitleLabel,
        doctor: { fullName: doctor?.fullName ?? "—" },
        kaitenCardType: kt ? { name: kt.name } : null,
        isUrgent: row.isUrgent,
        urgentCoefficient: row.urgentCoefficient,
      }),
    };
  });

  return {
    parseMode: "HTML",
    text: formatHtmlLinkList(items, "Работ не найдено", header),
  };
}
