import nextDynamic from "next/dynamic";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

const InventoryWarehouseClient = nextDynamic(
  () =>
    import("@/components/inventory/InventoryWarehouseClient").then((m) => ({
      default: m.InventoryWarehouseClient,
    })),
  {
    loading: () => (
      <ModuleFrame
        title="Склад"
        description="Остатки, приход и расход, связь с нарядами. Закупка — средневзвешенная. Реализация позиции идёт в сверку как стоимость работы."
      >
        <p className="text-sm text-[var(--text-muted)]">
          Загрузка модуля склада…
        </p>
      </ModuleFrame>
    ),
  },
);

export default function WarehousePage() {
  return <InventoryWarehouseClient />;
}
