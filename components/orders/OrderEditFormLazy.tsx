"use client";

import nextDynamic from "next/dynamic";

export const OrderEditFormLazy = nextDynamic(
  () =>
    import("@/components/orders/OrderEditForm").then((m) => ({
      default: m.OrderEditForm,
    })),
  {
    loading: () => (
      <p className="px-4 py-8 text-sm text-[var(--text-muted)]">
        Загрузка наряда…
      </p>
    ),
  },
);
