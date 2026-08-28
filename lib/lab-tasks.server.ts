import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import { attachLabTaskChatStats } from "@/lib/lab-task-chat.server";
import {
  labTaskAttachmentUrl,
  type LabTaskJson,
  type LabTaskKind,
} from "@/lib/lab-tasks";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

type LoadOpts = {
  tenantId: string;
  kind: LabTaskKind;
  /** pending = только нерешённые; all = все */
  status?: "pending" | "all";
  limit?: number;
  q?: string;
  viewerUserId?: string | null;
};

export async function countPendingLabTasks(
  tenantId: string,
  kind: LabTaskKind = "TASK",
): Promise<number> {
  const prisma = await getPrisma();
  return prisma.labTask.count({
    where: { tenantId, kind, resolvedAt: null },
  });
}

export async function loadLabTasks(opts: LoadOpts): Promise<LabTaskJson[]> {
  const prisma = await getPrisma();
  const limit = Math.min(Math.max(opts.limit ?? 80, 1), 150);
  const q = (opts.q ?? "").trim();
  const rows = await prisma.labTask.findMany({
    where: {
      tenantId: opts.tenantId,
      kind: opts.kind,
      ...(opts.status === "pending" ? { resolvedAt: null } : {}),
      ...(q
        ? {
            OR: [
              { text: { contains: q, mode: "insensitive" } },
              { authorLabel: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
        },
        orderBy: { createdAt: "asc" },
      },
      resolvedBy: {
        select: { displayName: true, email: true, mentionHandle: true },
      },
    },
  });

  const items: LabTaskJson[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    text: row.text,
    authorLabel: row.authorLabel,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedByName: row.resolvedBy
      ? userActivityDisplayLabel(row.resolvedBy)
      : null,
    attachments: row.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      url: labTaskAttachmentUrl(row.id, a.id),
    })),
    chatMessageCount: 0,
    hasUnreadChat: false,
  }));
  return attachLabTaskChatStats(opts.viewerUserId, items);
}
