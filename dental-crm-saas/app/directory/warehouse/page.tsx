import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { DirectoryWarehouseSettingsClient } from "@/components/inventory/DirectoryWarehouseSettingsClient";

export const dynamic = "force-dynamic";

export default function DirectoryWarehousePage() {
  return (
    <ModuleFrame
      title="Склад: настройки"
      description="Склады и складские позиции (производитель, артикул, поставка, цена за единицу учёта). Операции прихода и расхода — в разделе «Склад» меню."
    >
      <DirectoryWarehouseSettingsClient />
    </ModuleFrame>
  );
}
