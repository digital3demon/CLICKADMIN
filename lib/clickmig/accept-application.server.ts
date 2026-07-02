import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getClickMigConfig } from "./config.server";
import { sendClickMigAcceptedEmail } from "./email.server";
import {
  pickClickMigParticipantUserId,
  stageTimerDurationMs,
} from "./participant-assignment.server";
import { clickMigResubmitToken } from "./public-auth.server";

export async function acceptClickMigApplication(
  prisma: PrismaClient,
  tenantId: string,
  applicationId: string,
  acceptedByUserId: string,
): Promise<{ orderId: string }> {
  const app = await prisma.clickMigApplication.findFirst({
    where: { id: applicationId, tenantId },
    include: { order: true },
  });
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "PENDING") throw new Error("APPLICATION_NOT_PENDING");
  if (app.order) throw new Error("ORDER_ALREADY_EXISTS");

  const { row: configRow, json: config } = await getClickMigConfig(prisma, tenantId);
  const participantUserId = await pickClickMigParticipantUserId(
    prisma,
    tenantId,
    config,
  );
  const dataCheckMs = stageTimerDurationMs(config, "data_check");
  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    await tx.clickMigApplication.update({
      where: { id: app.id },
      data: { status: "ACCEPTED" },
    });
    return tx.clickMigOrder.create({
      data: {
        tenantId,
        applicationId: app.id,
        publicNumber: app.publicNumber,
        assigneeUserId: config.defaultAssigneeUserId,
        participantUserId,
        kanbanColumnId: "col_queue",
        stageKey: "data_check",
        timerStartedAt: dataCheckMs ? now : null,
        timerDurationMs: dataCheckMs,
        acceptedAt: now,
        acceptedByUserId,
        resubmitToken: clickMigResubmitToken(),
        resubmitTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  });

  await sendClickMigAcceptedEmail(configRow, config, app);

  return { orderId: order.id };
}

export async function rejectClickMigApplication(
  prisma: PrismaClient,
  tenantId: string,
  applicationId: string,
  reason: string,
  rejectedByUserId: string,
): Promise<void> {
  const app = await prisma.clickMigApplication.findFirst({
    where: { id: applicationId, tenantId },
  });
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  if (app.status !== "PENDING") throw new Error("APPLICATION_NOT_PENDING");

  const { row: configRow, json: config } = await getClickMigConfig(prisma, tenantId);

  await prisma.clickMigApplication.update({
    where: { id: app.id },
    data: {
      status: "REJECTED",
      rejectedReason: reason.trim(),
      rejectedAt: new Date(),
      rejectedByUserId,
    },
  });

  const { sendClickMigRejectedEmail } = await import("./email.server");
  await sendClickMigRejectedEmail(configRow, config, app, reason.trim());
}
