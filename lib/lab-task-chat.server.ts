import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import {
  canMutateLabTaskChatMessage,
  labTaskChatHasUnread,
  labTaskChatPreviewText,
  type LabTaskChatCommentJson,
} from "@/lib/lab-task-chat";
import type { LabTaskJson } from "@/lib/lab-tasks";

export async function attachLabTaskChatStats(
  viewerUserId: string | null | undefined,
  items: LabTaskJson[],
): Promise<LabTaskJson[]> {
  const ids = items.map((x) => x.id);
  if (ids.length === 0) return items;
  const prisma = await getPrisma();
  const viewer = String(viewerUserId || "").trim();
  let comments: Array<{
    taskId: string;
    authorUserId: string | null;
    createdAt: Date;
  }>;
  let reads: Array<{ taskId: string; seenAt: Date }>;
  try {
    const [commentRows, readRows] = await Promise.all([
      prisma.labTaskComment.findMany({
        where: { taskId: { in: ids }, deletedAt: null },
        select: { taskId: true, authorUserId: true, createdAt: true },
      }),
      viewer
        ? prisma.labTaskCommentRead.findMany({
            where: { userId: viewer, taskId: { in: ids } },
            select: { taskId: true, seenAt: true },
          })
        : Promise.resolve([]),
    ]);
    comments = commentRows;
    reads = readRows;
  } catch (e) {
    const msg = String(e);
    if (
      msg.includes("LabTaskComment") ||
      msg.includes("P2021") ||
      msg.includes("no such table")
    ) {
      return items;
    }
    throw e;
  }
  const seenByTask = new Map(reads.map((r) => [r.taskId, r.seenAt]));
  const byTask = new Map<
    string,
    Array<{ authorUserId: string | null; createdAt: Date }>
  >();
  for (const c of comments) {
    const list = byTask.get(c.taskId) ?? [];
    list.push({ authorUserId: c.authorUserId, createdAt: c.createdAt });
    byTask.set(c.taskId, list);
  }
  return items.map((item) => {
    const rows = byTask.get(item.id) ?? [];
    return {
      ...item,
      chatMessageCount: rows.length,
      hasUnreadChat: viewer
        ? labTaskChatHasUnread({
            viewerUserId: viewer,
            seenAt: seenByTask.get(item.id) ?? null,
            comments: rows,
          })
        : false,
    };
  });
}

export async function markLabTaskChatSeen(opts: {
  taskId: string;
  userId: string;
}): Promise<void> {
  const taskId = opts.taskId.trim();
  const userId = opts.userId.trim();
  if (!taskId || !userId) return;
  const prisma = await getPrisma();
  await prisma.labTaskCommentRead.upsert({
    where: { userId_taskId: { userId, taskId } },
    create: { userId, taskId, seenAt: new Date() },
    update: { seenAt: new Date() },
  });
}

export async function loadLabTaskComments(opts: {
  taskId: string;
  viewerUserId: string;
}): Promise<LabTaskChatCommentJson[]> {
  const prisma = await getPrisma();
  const rows = await prisma.labTaskComment.findMany({
    where: { taskId: opts.taskId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorUserId: true,
      authorLabel: true,
      text: true,
      parentId: true,
      createdAt: true,
      editedAt: true,
      deletedAt: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((row) => {
    const parent = row.parentId ? byId.get(row.parentId) : null;
    const deleted = Boolean(row.deletedAt);
    const parentDeleted = Boolean(parent?.deletedAt);
    return {
      id: row.id,
      authorUserId: row.authorUserId,
      authorLabel: row.authorLabel,
      text: deleted ? "" : row.text,
      parentId: row.parentId,
      parentPreview: parent
        ? parentDeleted
          ? "Сообщение удалено"
          : labTaskChatPreviewText(parent.text)
        : null,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      canMutate: canMutateLabTaskChatMessage({
        authorUserId: row.authorUserId,
        viewerUserId: opts.viewerUserId,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt,
      }),
    };
  });
}
