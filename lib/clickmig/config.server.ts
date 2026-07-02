import "server-only";

import type { ClickMigConfig, PrismaClient } from "@prisma/client";
import { defaultClickMigConfigJson } from "./defaults";
import type { ClickMigConfigJson } from "./types";

function parseJsonConfig(row: ClickMigConfig): ClickMigConfigJson {
  const defaults = defaultClickMigConfigJson();
  return {
    constructionTypes:
      (row.constructionTypes as ClickMigConfigJson["constructionTypes"]) ??
      defaults.constructionTypes,
    scanbodyManufacturers:
      (row.scanbodyManufacturers as string[]) ?? defaults.scanbodyManufacturers,
    shadeOptions:
      (row.shadeOptions as ClickMigConfigJson["shadeOptions"]) ??
      defaults.shadeOptions,
    defaultAssigneeUserId: row.defaultAssigneeUserId,
    participantUserIds: (row.participantUserIds as string[]) ?? [],
    maxCardsPerParticipant: row.maxCardsPerParticipant,
    columnTimers:
      (row.columnTimers as ClickMigConfigJson["columnTimers"]) ??
      defaults.columnTimers,
    stageTimers:
      (row.stageTimers as ClickMigConfigJson["stageTimers"]) ??
      defaults.stageTimers,
    timerBehaviors:
      (row.timerBehaviors as ClickMigConfigJson["timerBehaviors"]) ??
      defaults.timerBehaviors,
    validationHints:
      (row.validationHints as ClickMigConfigJson["validationHints"]) ??
      defaults.validationHints,
    emailTemplates:
      (row.emailTemplates as ClickMigConfigJson["emailTemplates"]) ??
      defaults.emailTemplates,
    allowedOrigins: (row.allowedOrigins as string[]) ?? defaults.allowedOrigins,
  };
}

export async function getClickMigConfig(
  prisma: PrismaClient,
  tenantId: string,
): Promise<{ row: ClickMigConfig; json: ClickMigConfigJson }> {
  let row = await prisma.clickMigConfig.findUnique({ where: { tenantId } });
  if (!row) {
    const defaults = defaultClickMigConfigJson();
    row = await prisma.clickMigConfig.create({
      data: {
        tenantId,
        constructionTypes: defaults.constructionTypes,
        scanbodyManufacturers: defaults.scanbodyManufacturers,
        shadeOptions: defaults.shadeOptions,
        participantUserIds: defaults.participantUserIds,
        maxCardsPerParticipant: defaults.maxCardsPerParticipant,
        columnTimers: defaults.columnTimers,
        stageTimers: defaults.stageTimers,
        timerBehaviors: defaults.timerBehaviors,
        validationHints: defaults.validationHints,
        emailTemplates: defaults.emailTemplates,
        allowedOrigins: defaults.allowedOrigins,
      },
    });
  }
  return { row, json: parseJsonConfig(row) };
}

export async function upsertClickMigConfig(
  prisma: PrismaClient,
  tenantId: string,
  patch: Partial<ClickMigConfigJson> & {
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFromEmail?: string | null;
    smtpFromName?: string | null;
    publicApiKeyHash?: string | null;
  },
): Promise<ClickMigConfigJson> {
  const { json: current } = await getClickMigConfig(prisma, tenantId);
  const merged: ClickMigConfigJson = {
    ...current,
    ...patch,
    constructionTypes: patch.constructionTypes ?? current.constructionTypes,
    scanbodyManufacturers:
      patch.scanbodyManufacturers ?? current.scanbodyManufacturers,
    shadeOptions: patch.shadeOptions ?? current.shadeOptions,
    columnTimers: patch.columnTimers ?? current.columnTimers,
    stageTimers: patch.stageTimers ?? current.stageTimers,
    timerBehaviors: patch.timerBehaviors ?? current.timerBehaviors,
    validationHints: patch.validationHints ?? current.validationHints,
    emailTemplates: patch.emailTemplates ?? current.emailTemplates,
    allowedOrigins: patch.allowedOrigins ?? current.allowedOrigins,
    participantUserIds: patch.participantUserIds ?? current.participantUserIds,
  };

  const row = await prisma.clickMigConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      constructionTypes: merged.constructionTypes,
      scanbodyManufacturers: merged.scanbodyManufacturers,
      shadeOptions: merged.shadeOptions,
      defaultAssigneeUserId: merged.defaultAssigneeUserId,
      participantUserIds: merged.participantUserIds,
      maxCardsPerParticipant: merged.maxCardsPerParticipant,
      columnTimers: merged.columnTimers,
      stageTimers: merged.stageTimers,
      timerBehaviors: merged.timerBehaviors,
      validationHints: merged.validationHints,
      emailTemplates: merged.emailTemplates,
      allowedOrigins: merged.allowedOrigins,
      publicApiKeyHash: patch.publicApiKeyHash ?? null,
      smtpHost: patch.smtpHost ?? null,
      smtpPort: patch.smtpPort ?? null,
      smtpUser: patch.smtpUser ?? null,
      smtpPass: patch.smtpPass ?? null,
      smtpFromEmail: patch.smtpFromEmail ?? null,
      smtpFromName: patch.smtpFromName ?? null,
    },
    update: {
      constructionTypes: merged.constructionTypes,
      scanbodyManufacturers: merged.scanbodyManufacturers,
      shadeOptions: merged.shadeOptions,
      defaultAssigneeUserId: merged.defaultAssigneeUserId,
      participantUserIds: merged.participantUserIds,
      maxCardsPerParticipant: merged.maxCardsPerParticipant,
      columnTimers: merged.columnTimers,
      stageTimers: merged.stageTimers,
      timerBehaviors: merged.timerBehaviors,
      validationHints: merged.validationHints,
      emailTemplates: merged.emailTemplates,
      allowedOrigins: merged.allowedOrigins,
      ...(patch.publicApiKeyHash !== undefined
        ? { publicApiKeyHash: patch.publicApiKeyHash }
        : {}),
      ...(patch.smtpHost !== undefined ? { smtpHost: patch.smtpHost } : {}),
      ...(patch.smtpPort !== undefined ? { smtpPort: patch.smtpPort } : {}),
      ...(patch.smtpUser !== undefined ? { smtpUser: patch.smtpUser } : {}),
      ...(patch.smtpPass !== undefined ? { smtpPass: patch.smtpPass } : {}),
      ...(patch.smtpFromEmail !== undefined
        ? { smtpFromEmail: patch.smtpFromEmail }
        : {}),
      ...(patch.smtpFromName !== undefined
        ? { smtpFromName: patch.smtpFromName }
        : {}),
    },
  });
  return parseJsonConfig(row);
}

/** Публичный конфиг без секретов. */
export function publicClickMigConfigPayload(json: ClickMigConfigJson) {
  return {
    constructionTypes: json.constructionTypes,
    scanbodyManufacturers: json.scanbodyManufacturers,
    shadeOptions: json.shadeOptions,
    materials: ["ZIRCONIA", "EMAX", "PMMA", "COMPOSITE"],
    validationHints: json.validationHints,
  };
}
