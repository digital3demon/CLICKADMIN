/**
 * Карта дампа CRM (месяц):
 * - READ-ONLY к прод-БД (только findMany / findUnique / findFirst)
 * - Сырой срез для выгрузки в storage; обезличивание — отдельным шагом
 * - Вложения: только картинки (байты в zip `attachments/`); PDF/документы не включаем
 * - Без aiApiKey и tenantDatabaseUrl
 */
import "server-only";

import type { PrismaClient } from "@prisma/client";
import JSZip from "jszip";
import {
  crmDumpAttachmentExt,
  isCrmDumpImageAttachment,
} from "@/lib/crm-dump/attachment-kinds";
import { parseMonthKey, type MonthBounds } from "@/lib/crm-dump/month-bounds";
import { scrubRowForDump, scrubRowsForDump } from "@/lib/crm-dump/serialize";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";

export const CRM_DUMP_VERSION = 1;
export const CRM_DUMP_KIND = "crm-month-dump";

export type BuildCrmMonthDumpResult = {
  zipBytes: Buffer;
  fileName: string;
  meta: {
    version: number;
    kind: string;
    tenantId: string;
    month: string;
    exportedAt: string;
    filter: "createdAt";
    orderCount: number;
    userCount: number;
    clinicCount: number;
    doctorCount: number;
    roleModuleAccessCount: number;
    imageAttachmentCount: number;
    skippedNonImageAttachments: number;
  };
};

function asRecords(rows: unknown[]): Record<string, unknown>[] {
  return rows as Record<string, unknown>[];
}

export async function buildCrmMonthDumpZip(params: {
  db: PrismaClient;
  tenantId: string;
  monthKey: string;
}): Promise<BuildCrmMonthDumpResult> {
  const bounds = parseMonthKey(params.monthKey);
  if (!bounds) {
    throw new Error("Некорректный месяц (нужен YYYY-MM)");
  }
  return buildCrmMonthDumpZipWithBounds({
    db: params.db,
    tenantId: params.tenantId,
    bounds,
  });
}

async function buildCrmMonthDumpZipWithBounds(params: {
  db: PrismaClient;
  tenantId: string;
  bounds: MonthBounds;
}): Promise<BuildCrmMonthDumpResult> {
  const { db, tenantId, bounds } = params;
  const t0 = Date.now();

  const tenantRaw = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenantRaw) {
    throw new Error("Тенант не найден");
  }

  const tenant = scrubRowForDump({
    ...(tenantRaw as unknown as Record<string, unknown>),
  });
  delete tenant.aiApiKey;
  delete tenant.tenantDatabaseUrl;
  delete tenant.adminSharedTelegramChatId;

  const [
    usersRaw,
    roleModuleAccess,
    couriers,
    kaitenCardTypes,
    constructionTypes,
    materials,
    priceLists,
    priceListItems,
    clinicOverrides,
    doctorOverrides,
    doctorClinicOverrides,
    orderNumberSettings,
    priceListWorkspaceSettings,
    tenantClientState,
    kanbanStandaloneCards,
    payrollConfigs,
    orders,
  ] = await Promise.all([
    db.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        payrollTrack: true,
        passwordHash: true,
        inviteCodeHash: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        telegramId: true,
        telegramUsername: true,
        telegramKanbanNotifyPrefs: true,
        phone: true,
        avatarPresetId: true,
        avatarCustomMime: true,
        avatarCustomUploadedAt: true,
        mentionHandle: true,
        kaitenUserId: true,
        ordersListPageSize: true,
        orderToastsPersonalOnly: true,
      },
    }),
    db.roleModuleAccess.findMany({ where: { tenantId } }),
    db.courier.findMany({ where: { tenantId } }),
    db.kaitenCardType.findMany({ where: { tenantId } }),
    db.constructionType.findMany(),
    db.material.findMany(),
    db.priceList.findMany(),
    db.priceListItem.findMany(),
    db.clinicPriceOverride.findMany({
      where: { clinic: { tenantId } },
    }),
    db.doctorPriceOverride.findMany({
      where: { doctor: { tenantId } },
    }),
    db.doctorClinicPriceOverride.findMany({
      where: { doctor: { tenantId } },
    }),
    db.orderNumberSettings.findUnique({
      where: { id: tenantId },
    }),
    db.priceListWorkspaceSettings.findUnique({ where: { id: "default" } }),
    db.tenantClientState.findMany({ where: { tenantId } }),
    db.kanbanStandaloneCard.findMany({ where: { tenantId } }),
    db.payrollPriceItemConfig.findMany({ where: { tenantId } }),
    db.order.findMany({
      where: {
        tenantId,
        archivedAt: null,
        createdAt: {
          gte: bounds.fromInclusive,
          lt: bounds.toExclusive,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Users already selected without avatar bytes
  const users = scrubRowsForDump(asRecords(usersRaw));

  const orderIds = orders.map((o) => o.id);

  // Справочники клиентов — целиком по тенанту (не только задействованные в месяце).
  const [
    clinicsOut,
    doctorsOut,
    doctorLinks,
    suppressions,
    constructions,
    attachmentsMeta,
    revisions,
    chatCorrections,
    prostheticsRequests,
    chatInbox,
    customTags,
    memoEvents,
    payrollEntries,
  ] = await Promise.all([
    db.clinic.findMany({ where: { tenantId } }),
    db.doctor.findMany({ where: { tenantId } }),
    db.doctorOnClinic.findMany({
      where: { doctor: { tenantId } },
    }),
    db.doctorClinicLinkSuppression.findMany({
      where: { doctor: { tenantId } },
    }),
    orderIds.length
      ? db.orderConstruction.findMany({
          where: { orderId: { in: orderIds } },
        })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderAttachment.findMany({
          where: { orderId: { in: orderIds } },
          select: {
            id: true,
            orderId: true,
            fileName: true,
            mimeType: true,
            size: true,
            scope: true,
            createdAt: true,
            diskRelPath: true,
            uploadedToKaitenAt: true,
            kaitenFileId: true,
            data: true,
          },
        })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderRevision.findMany({ where: { orderId: { in: orderIds } } })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderChatCorrection.findMany({
          where: { orderId: { in: orderIds } },
        })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderProstheticsRequest.findMany({
          where: { orderId: { in: orderIds } },
        })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderChatInboxItem.findMany({
          where: { orderId: { in: orderIds } },
        })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderCustomTag.findMany({ where: { orderId: { in: orderIds } } })
      : Promise.resolve([]),
    orderIds.length
      ? db.orderListAdminMemoEvent.findMany({
          where: { orderId: { in: orderIds } },
        })
      : Promise.resolve([]),
    orderIds.length
      ? db.payrollWorkEntry.findMany({
          where: { tenantId, orderId: { in: orderIds } },
        })
      : Promise.resolve([]),
  ]);

  const linked = {
    constructions,
    attachmentsMeta,
    revisions,
    chatCorrections,
    prostheticsRequests,
    chatInbox,
    customTags,
    memoEvents,
    payrollEntries,
  };

  /** Картинки → байты в zip; PDF/docs пропускаем. */
  const imageAttachmentRows: Array<{
    id: string;
    orderId: string;
    fileName: string;
    mimeType: string;
    size: number;
    scope: string;
    createdAt: Date;
    zipPath: string;
  }> = [];
  const attachmentFiles: Array<{ zipPath: string; bytes: Buffer }> = [];
  let skippedNonImageAttachments = 0;
  let skippedImageReadErrors = 0;

  for (const row of attachmentsMeta) {
    if (
      !isCrmDumpImageAttachment({
        mimeType: row.mimeType,
        fileName: row.fileName,
      })
    ) {
      skippedNonImageAttachments += 1;
      continue;
    }
    try {
      const bytes = await readOrderAttachmentBytes({
        data: row.data,
        diskRelPath: row.diskRelPath,
      });
      const ext = crmDumpAttachmentExt(row.mimeType, row.fileName);
      const zipPath = `attachments/${row.id}.${ext}`;
      attachmentFiles.push({ zipPath, bytes });
      imageAttachmentRows.push({
        id: row.id,
        orderId: row.orderId,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: bytes.length,
        scope: row.scope,
        createdAt: row.createdAt,
        zipPath,
      });
    } catch (e) {
      skippedImageReadErrors += 1;
      console.warn(
        JSON.stringify({
          msg: "crm_dump_attachment_skip",
          attachmentId: row.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  const exportedAt = new Date().toISOString();
  const meta = {
    version: CRM_DUMP_VERSION,
    kind: CRM_DUMP_KIND,
    tenantId,
    month: bounds.monthKey,
    exportedAt,
    filter: "createdAt" as const,
    orderCount: orders.length,
    userCount: users.length,
    clinicCount: clinicsOut.length,
    doctorCount: doctorsOut.length,
    roleModuleAccessCount: roleModuleAccess.length,
    imageAttachmentCount: imageAttachmentRows.length,
    skippedNonImageAttachments,
    skippedImageReadErrors,
    durationMs: Date.now() - t0,
    note: "Сырой срез. Картинки вложений в attachments/*. PDF и документы не включены. aiApiKey/tenantDatabaseUrl вырезаны. Обезличивание — отдельно.",
  };

  const payload = {
    meta,
    tables: {
      tenant,
      users,
      roleModuleAccess: scrubRowsForDump(asRecords(roleModuleAccess)),
      clinics: scrubRowsForDump(asRecords(clinicsOut)),
      doctors: scrubRowsForDump(asRecords(doctorsOut)),
      doctorOnClinic: scrubRowsForDump(asRecords(doctorLinks)),
      doctorClinicLinkSuppression: scrubRowsForDump(asRecords(suppressions)),
      couriers: scrubRowsForDump(asRecords(couriers)),
      kaitenCardTypes: scrubRowsForDump(asRecords(kaitenCardTypes)),
      constructionTypes: scrubRowsForDump(asRecords(constructionTypes)),
      materials: scrubRowsForDump(asRecords(materials)),
      priceLists: scrubRowsForDump(asRecords(priceLists)),
      priceListItems: scrubRowsForDump(asRecords(priceListItems)),
      clinicPriceOverrides: scrubRowsForDump(asRecords(clinicOverrides)),
      doctorPriceOverrides: scrubRowsForDump(asRecords(doctorOverrides)),
      doctorClinicPriceOverrides: scrubRowsForDump(
        asRecords(doctorClinicOverrides),
      ),
      orderNumberSettings: orderNumberSettings
        ? scrubRowForDump(orderNumberSettings as unknown as Record<string, unknown>)
        : null,
      priceListWorkspaceSettings: priceListWorkspaceSettings
        ? scrubRowForDump(
            priceListWorkspaceSettings as unknown as Record<string, unknown>,
          )
        : null,
      tenantClientState: scrubRowsForDump(asRecords(tenantClientState)),
      kanbanStandaloneCards: scrubRowsForDump(
        asRecords(kanbanStandaloneCards),
      ),
      payrollPriceItemConfigs: scrubRowsForDump(asRecords(payrollConfigs)),
      orders: scrubRowsForDump(asRecords(orders)),
      orderConstructions: scrubRowsForDump(asRecords(linked.constructions)),
      orderAttachmentsMeta: scrubRowsForDump(
        asRecords(imageAttachmentRows),
      ),
      orderRevisions: scrubRowsForDump(asRecords(linked.revisions)),
      orderChatCorrections: scrubRowsForDump(
        asRecords(linked.chatCorrections),
      ),
      orderProstheticsRequests: scrubRowsForDump(
        asRecords(linked.prostheticsRequests),
      ),
      orderChatInboxItems: scrubRowsForDump(asRecords(linked.chatInbox)),
      orderCustomTags: scrubRowsForDump(asRecords(linked.customTags)),
      orderListAdminMemoEvents: scrubRowsForDump(asRecords(linked.memoEvents)),
      payrollWorkEntries: scrubRowsForDump(asRecords(linked.payrollEntries)),
    },
  };

  const zip = new JSZip();
  zip.file("meta.json", JSON.stringify(meta, null, 2));
  zip.file("dump.json", JSON.stringify(payload));
  for (const f of attachmentFiles) {
    zip.file(f.zipPath, f.bytes);
  }

  const zipBytes = Buffer.from(
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );

  const stamp = exportedAt.replace(/[:.]/g, "-");
  const fileName = `crm-dump-${bounds.monthKey}-${stamp}.zip`;

  console.info(
    JSON.stringify({
      msg: "crm_dump_built",
      tenantId,
      month: bounds.monthKey,
      orderCount: orders.length,
      userCount: users.length,
      imageAttachmentCount: imageAttachmentRows.length,
      skippedNonImageAttachments,
      bytes: zipBytes.length,
      durationMs: Date.now() - t0,
    }),
  );

  return { zipBytes, fileName, meta };
}
