import "server-only";

import type { PrismaClient } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";
import { orderShipmentListStatusLabel } from "@/lib/order-shipment-list-status-label";
import { telegramMiniAppOrderWebAppUrl } from "@/lib/telegram-mini-app-links";
import {
  addCalendarDaysYmd,
  moscowDayBoundsUtc,
  moscowTodayYmd,
  moscowWorkWeekFridayYmd,
} from "@/lib/shipments-date-range";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { endYmdKanbanDlinetm } from "@/lib/kanban-dline-end-ymd";
import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { fetchKanbanStageDlineTelegramItems } from "@/lib/telegram-bot-kanban-stage-dline";
import { isTelegramBotCardStageCommand } from "@/lib/telegram-bot-menu-commands";
import {
  formatTelegramBotWebAppList,
  type TelegramBotListReply,
  type TelegramHtmlListItem,
} from "@/lib/telegram-html-message";
import {
  compareOrdersByEffectiveAppointment,
  ordersShipmentListWhere,
} from "@/lib/orders-shipment-list-filter";
import { ordersShipmentModeLabel } from "@/lib/orders-shipment-list-query";
import {
  telegramRoleLinksToOrderPage,
  telegramRoleMayCardStageDline,
  telegramRoleMayDline,
  telegramRoleMayShip,
  telegramRoleUsesLabOrderDline,
  telegramRoleUsesPersonalCardStageDline,
} from "@/lib/telegram-bot-role-matrix";
import type { Prisma } from "@prisma/client";

export {
  isTelegramBotListCommand,
  resolveTelegramBotListCommand,
  telegramMenuLabelToCommand,
} from "@/lib/telegram-bot-menu-commands";

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

function orderListItemUrls(
  orderId: string,
  linkToOrderPage: boolean,
): { url: string; webAppUrl: string | null } {
  const webAppUrl = telegramMiniAppOrderWebAppUrl(orderId);
  const base = crmPublicBaseUrl().replace(/\/+$/, "");
  const url = linkToOrderPage
    ? `${base}${orderPathById(orderId)}`
    : `${base}${kanbanOrderDeepLinkPath(orderId)}`;
  return { url, webAppUrl };
}

const orderTelegramTitleSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  dueDate: true,
  appointmentDate: true,
  dueToAdminsAt: true,
  dueToAdminsHasTime: true,
  kaitenAdminDueHasTime: true,
  kaitenCardTitleLabel: true,
  doctorId: true,
  kaitenCardTypeId: true,
  kaitenCardId: true,
  isUrgent: true,
  urgentCoefficient: true,
  kaitenColumnTitle: true,
  demoKanbanColumn: true,
  labWorkStatus: true,
  kaitenBlocked: true,
} as const;

async function mapOrdersToTelegramLinkItems(
  dueRows: Array<{
    id: string;
    orderNumber: string;
    patientName: string | null;
    dueDate: Date | null;
    kaitenAdminDueHasTime: boolean | null;
    kaitenCardTitleLabel: string | null;
    doctorId: string;
    kaitenCardTypeId: string | null;
    isUrgent: boolean;
    urgentCoefficient: number | null;
    kaitenColumnTitle: string | null;
    demoKanbanColumn: string | null;
    labWorkStatus: string;
    kaitenBlocked: boolean | null;
  }>,
  linkToOrderPage: boolean,
): Promise<TelegramHtmlListItem[]> {
  if (dueRows.length === 0) return [];

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

  return dueRows.map((row) => {
    const doctor = doctorById.get(row.doctorId);
    const kt = row.kaitenCardTypeId
      ? cardTypeById.get(row.kaitenCardTypeId)
      : undefined;
    const status = orderShipmentListStatusLabel(row);
    const { url, webAppUrl } = orderListItemUrls(row.id, linkToOrderPage);
    return {
      url,
      webAppUrl,
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
      detail: `Статус: ${status}`,
    };
  });
}

/** Лёгкий запрос для бота — только поля заголовка карточки, без гидрации отгрузок. */
async function fetchOrderTelegramLinkItems(
  ordersDb: PrismaClient,
  tenantId: string,
  start: Date,
  endExclusive: Date,
  linkToOrderPage: boolean,
): Promise<TelegramHtmlListItem[]> {
  const dueRows = await ordersDb.order.findMany({
    where: {
      tenantId,
      archivedAt: null,
      dueDate: { not: null, gte: start, lt: endExclusive },
    },
    orderBy: [{ dueDate: "asc" }, { orderNumber: "asc" }],
    select: orderTelegramTitleSelect,
  });
  return mapOrdersToTelegramLinkItems(dueRows, linkToOrderPage);
}

/** То же окно «Актуальное» / дата записи, что на списке заказов. */
async function fetchOrderTelegramLinkItemsActualAppointment(
  ordersDb: PrismaClient,
  tenantId: string,
  linkToOrderPage: boolean,
): Promise<TelegramHtmlListItem[]> {
  const shipWhere = ordersShipmentListWhere({
    mode: "actual",
    shipFrom: null,
    shipTo: null,
  });
  const dueRows = await ordersDb.order.findMany({
    where: {
      AND: [{ tenantId, archivedAt: null }, shipWhere],
    } satisfies Prisma.OrderWhereInput,
    select: orderTelegramTitleSelect,
  });
  dueRows.sort(compareOrdersByEffectiveAppointment);
  return mapOrdersToTelegramLinkItems(dueRows, linkToOrderPage);
}

/** Нижняя клавиатура в чате: только кнопки, разрешённые роли (остальное — команды вручную). */
export function telegramReplyKeyboardMarkupForRole(
  role: UserRole,
): Record<string, unknown> | null {
  const rows: { text: string }[][] = [];
  if (telegramRoleMayShip(role)) {
    rows.push([{ text: "Актуальная запись" }]);
  }
  if (telegramRoleUsesLabOrderDline(role)) {
    rows.push([
      { text: "Срок на сегодня" },
      { text: "Срок на завтра" },
    ]);
    rows.push([{ text: "Срок до конца недели" }]);
  }
  if (telegramRoleUsesPersonalCardStageDline(role)) {
    rows.push([
      { text: "Мой срок на сегодня" },
      { text: "Мой срок на завтра" },
    ]);
    rows.push([{ text: "Мой срок до конца недели" }]);
  }
  if (telegramRoleMayCardStageDline(role)) {
    rows.push([
      { text: "Срок карточек на сегодня" },
      { text: "Срок карточек на завтра" },
    ]);
    rows.push([{ text: "Срок карточек до конца недели" }]);
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
  crmUserId?: string | null;
}): Promise<TelegramBotListReply | null> {
  const cmd = opts.command.toLowerCase();
  const { tenantId, role, crmUserId } = opts;

  const shipCmd =
    cmd === "/shipact" ||
    cmd === "/shiptd" ||
    cmd === "/shiptm" ||
    cmd === "/shipw";
  const dlineCmd =
    cmd === "/dlinew" ||
    cmd === "/dlinetd" ||
    cmd === "/dlinetm";
  const cardStageCmd = isTelegramBotCardStageCommand(cmd);

  if (!shipCmd && !dlineCmd && !cardStageCmd) return null;

  if (shipCmd && !telegramRoleMayShip(role)) {
    return {
      parseMode: "HTML",
      text: "Эта команда доступна старшему администратору, администратору, старшему технику, руководителю или владельцу.",
    };
  }
  if (dlineCmd && !telegramRoleMayDline(role)) {
    return {
      parseMode: "HTML",
      text: "Команды сроков недоступны для вашей роли.",
    };
  }
  if (cardStageCmd && !telegramRoleMayCardStageDline(role)) {
    return {
      parseMode: "HTML",
      text: "Срок карточек канбана сейчас недоступен. Используйте «Мой срок» или кнопки ниже.",
    };
  }

  const ordersDb = await resolveTenantPrismaClient(tenantId);
  const todayYmd = moscowTodayYmd();
  const linkToOrderPage = telegramRoleLinksToOrderPage(role);

  if (shipCmd) {
    const header = `Актуальная запись (${ordersShipmentModeLabel({
      mode: "actual",
      shipFrom: null,
      shipTo: null,
      periodError: null,
    })})`;
    const items = await fetchOrderTelegramLinkItemsActualAppointment(
      ordersDb,
      tenantId,
      linkToOrderPage,
    );
    return formatTelegramBotWebAppList(items, "Нарядов нет", header);
  }

  /* dline / card stage */
  if (cardStageCmd) {
    const stage = await fetchKanbanStageDlineTelegramItems(
      tenantId,
      cmd as "/cardtd" | "/cardtm" | "/cardw",
      { linkToOrderPage },
    );
    return formatTelegramBotWebAppList(
      stage.items,
      "Карточек не найдено",
      stage.header,
    );
  }

  if (dlineCmd && telegramRoleUsesPersonalCardStageDline(role)) {
    const stage = await fetchKanbanStageDlineTelegramItems(
      tenantId,
      cmd as "/dlinetd" | "/dlinetm" | "/dlinew",
      { crmUserId: crmUserId ?? null, linkToOrderPage },
    );
    const emptyRu = crmUserId
      ? "Карточек на вас (ответственный или участник) с этапным сроком в этом окне нет"
      : "Привяжите Telegram к пользователю CRM, чтобы видеть карточки на вас";
    return formatTelegramBotWebAppList(stage.items, emptyRu, stage.header);
  }

  /* dline — лабораторный срок наряда (админы) */
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

  const items = await fetchOrderTelegramLinkItems(
    ordersDb,
    tenantId,
    start,
    endExclusive,
    linkToOrderPage,
  );

  return formatTelegramBotWebAppList(items, "Работ не найдено", header);
}
