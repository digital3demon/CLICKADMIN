import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { ClickMigBlockedFieldKey } from "./types";
import { getClickMigConfig } from "./config.server";
import { sendClickMigBlockedEmail } from "./email.server";
import { clickMigResubmitToken } from "./public-auth.server";

export async function blockClickMigOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  reason: string,
  blockedFields: ClickMigBlockedFieldKey[],
  origin: string,
): Promise<void> {
  const order = await prisma.clickMigOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { application: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const token = clickMigResubmitToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.clickMigOrder.update({
    where: { id: order.id },
    data: {
      status: "BLOCKED",
      blockedAt: new Date(),
      blockedReason: reason.trim(),
      blockedFields: blockedFields,
      timerFrozenAt: new Date(),
      resubmitToken: token,
      resubmitTokenExpiresAt: expires,
    },
  });

  const { row: configRow, json: config } = await getClickMigConfig(prisma, tenantId);
  const resubmitUrl = `${origin}/p/clickmig/resubmit/${token}`;
  const videoUrl = order.blockVideoFileId
    ? `${origin}/p/clickmig/video/${order.blockVideoFileId}`
    : `${origin}/p/clickmig/orders/${order.id}`;

  await sendClickMigBlockedEmail(
    configRow,
    config,
    order.application,
    reason.trim(),
    resubmitUrl,
    videoUrl,
  );
}

export async function clickMigStageCheckmark(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<void> {
  const order = await prisma.clickMigOrder.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const { json: config } = await getClickMigConfig(prisma, tenantId);
  const nextStage =
    order.stageKey === "data_check" ? "modeling" : order.stageKey;
  const { stageTimerDurationMs } = await import("./participant-assignment.server");
  const duration = stageTimerDurationMs(config, nextStage);
  const now = new Date();

  await prisma.clickMigOrder.update({
    where: { id: order.id },
    data: {
      status: order.status === "BLOCKED" ? "BLOCKED" : "ACTIVE",
      stageKey: nextStage,
      timerFrozenAt: null,
      timerStartedAt: duration ? now : null,
      timerDurationMs: duration,
    },
  });
}

export async function moveClickMigOrderColumn(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  kanbanColumnId: string,
): Promise<void> {
  const { json: config } = await getClickMigConfig(prisma, tenantId);
  const { columnTimerDurationMs } = await import("./participant-assignment.server");
  const duration = columnTimerDurationMs(config, kanbanColumnId);
  const now = new Date();
  const completed = kanbanColumnId === "col_done";

  await prisma.clickMigOrder.update({
    where: { id: orderId },
    data: {
      kanbanColumnId,
      timerFrozenAt: null,
      timerStartedAt: duration ? now : null,
      timerDurationMs: duration,
      ...(completed
        ? { status: "COMPLETED", completedAt: now, stageKey: "done" }
        : {}),
    },
  });
}
