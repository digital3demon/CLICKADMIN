import { Prisma } from "@prisma/client";

export const ORDER_PROSTHETICS_VERSION = 1 as const;

/** Строка «предоставлено клиентом» — свободное описание + количество */
export type ProstheticsClientLine = {
  description: string;
  quantity: number;
};

/** Строка «наше» — позиция склада + количество (списание при сохранении наряда) */
export type ProstheticsOurLine = {
  inventoryItemId: string;
  quantity: number;
};

export type OrderProstheticsV1 = {
  v: typeof ORDER_PROSTHETICS_VERSION;
  clientProvided: ProstheticsClientLine[];
  ourLines: ProstheticsOurLine[];
};

export function emptyProsthetics(): OrderProstheticsV1 {
  return {
    v: ORDER_PROSTHETICS_VERSION,
    clientProvided: [],
    ourLines: [],
  };
}

function clampQty(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x < 1) return 1;
  return Math.min(1_000_000, Math.floor(x));
}

/** Нормализация из тела запроса / формы */
export function normalizeProstheticsInput(raw: unknown): OrderProstheticsV1 {
  if (raw == null || typeof raw !== "object") {
    return emptyProsthetics();
  }
  const o = raw as {
    v?: unknown;
    clientProvided?: unknown;
    ourLines?: unknown;
  };

  const clientProvided: ProstheticsClientLine[] = [];
  if (Array.isArray(o.clientProvided)) {
    for (const row of o.clientProvided) {
      if (row == null || typeof row !== "object") continue;
      const r = row as { description?: unknown; quantity?: unknown };
      const description = String(r.description ?? "").trim();
      if (!description) continue;
      clientProvided.push({
        description,
        quantity: clampQty(r.quantity),
      });
    }
  }

  const ourLines: ProstheticsOurLine[] = [];
  if (Array.isArray(o.ourLines)) {
    for (const row of o.ourLines) {
      if (row == null || typeof row !== "object") continue;
      const r = row as { inventoryItemId?: unknown; quantity?: unknown };
      const inventoryItemId = String(r.inventoryItemId ?? "").trim();
      if (!inventoryItemId) continue;
      ourLines.push({
        inventoryItemId,
        quantity: clampQty(r.quantity),
      });
    }
  }

  return {
    v: ORDER_PROSTHETICS_VERSION,
    clientProvided,
    ourLines,
  };
}

export function prostheticsFromDb(raw: unknown): OrderProstheticsV1 {
  if (raw == null) return emptyProsthetics();
  const n = normalizeProstheticsInput(raw);
  if (n.clientProvided.length > 0 || n.ourLines.length > 0) return n;
  return emptyProsthetics();
}

export function prostheticsToJson(
  p: OrderProstheticsV1,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (p.clientProvided.length === 0 && p.ourLines.length === 0) {
    return Prisma.JsonNull;
  }
  return {
    v: ORDER_PROSTHETICS_VERSION,
    clientProvided: p.clientProvided,
    ourLines: p.ourLines,
  } as unknown as Prisma.InputJsonValue;
}

/** Суммарное количество по позиции склада (несколько строк с одним id складываются) */
export function aggregateOurQuantities(
  state: OrderProstheticsV1 | null,
): Map<string, number> {
  const m = new Map<string, number>();
  if (!state) return m;
  for (const row of state.ourLines) {
    const id = row.inventoryItemId?.trim();
    if (!id) continue;
    const q = row.quantity;
    if (!Number.isFinite(q) || q <= 0) continue;
    m.set(id, (m.get(id) ?? 0) + q);
  }
  return m;
}
