import type { Prisma } from "@prisma/client";
import type { ParsedListTag } from "@/lib/order-list-tag-filter";

function searchWhere(q: string): Prisma.OrderWhereInput {
  const contains = q.trim();
  if (!contains) return {};
  return {
    OR: [
      { orderNumber: { contains, mode: "insensitive" } },
      { patientName: { contains, mode: "insensitive" } },
    ],
  };
}

export function financeOfficeScopeWhere(
  tenantId: string,
  opts: {
    search?: string | null;
    start?: Date | null;
    endExclusive?: Date | null;
  } = {},
): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [{ tenantId, archivedAt: null }];
  const search = searchWhere(opts.search ?? "");
  if (Object.keys(search).length > 0) parts.push(search);
  if (opts.start || opts.endExclusive) {
    parts.push({
      dueDate: {
        ...(opts.start ? { gte: opts.start } : {}),
        ...(opts.endExclusive ? { lt: opts.endExclusive } : {}),
      },
    });
  }
  return parts.length === 1 ? parts[0] : { AND: parts };
}

/** Корректировки и заказ протетики — по всем нарядам, не только в окне dueDate. ЧАТ — в рамках вкладки. */
export function financeOfficeListTagSkipsDueDateWindow(
  parsed: ParsedListTag | null | undefined,
): boolean {
  return (
    parsed?.kind === "orderAttention" ||
    parsed?.kind === "prostheticsPending"
  );
}
