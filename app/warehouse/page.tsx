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
      <p className="text-sm text-[var(--text-muted)]">Загрузка модуля склада…</p>
    ),
  },
);

export default function WarehousePage() {
  return (
    <ModuleFrame
      title="Склад"
      description="Остатки, приход и расход, связь с нарядами. Себестоимость — средневзвешенная по закупкам. Склады и позиции заводятся в конфигурации."
    >
      <InventoryWarehouseClient />
    </ModuleFrame>
  );
}
