import { OrderRevisionKind, type Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  buildSnapshotFromOrder,
  parseSnapshotV1,
} from "@/lib/order-revision-snapshot";
import { summarizeOrderRevision } from "@/lib/order-revision-summary";
import { getActorForRevision } from "@/lib/actor-from-session";

export async function recordOrderRevision(
  orderId: string,
  opts?: {
    kind?: "CREATE" | "SAVE" | "RESTORE";
    summary?: string;
  },
): Promise<void> {
  const prisma = await getOrdersPrisma();
  const full = await prisma.order.findUnique({
    where: { id: orderId },
    include: { constructions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!full) return;

  const snap = buildSnapshotFromOrder(full);

  const prevRow = await prisma.orderRevision.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { snapshot: true },
  });
  const prev = prevRow?.snapshot
    ? parseSnapshotV1(prevRow.snapshot)
    : null;

  const isCreate = opts?.kind === "CREATE";
  const summary =
    opts?.summary ??
    summarizeOrderRevision(prev, snap, isCreate);

  const kind =
    opts?.kind === "CREATE"
      ? OrderRevisionKind.CREATE
      : opts?.kind === "RESTORE"
        ? OrderRevisionKind.RESTORE
        : OrderRevisionKind.SAVE;

  const actor = await getActorForRevision();

  await prisma.orderRevision.create({
    data: {
      orderId,
      actorLabel: actor.label,
      actorUserId: actor.userId,
      summary,
      kind,
      snapshot: snap as unknown as Prisma.InputJsonValue,
    },
  });
}
