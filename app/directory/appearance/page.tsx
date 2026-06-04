import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { DesignAppearanceClient } from "@/components/directory/DesignAppearanceClient";

export const dynamic = "force-dynamic";

export default function DirectoryAppearancePage() {
  return (
    <ModuleFrame
      title="Оформление"
      description="Переключение между классическим интерфейсом и новым дизайном «Гармония»."
    >
      <DesignAppearanceClient />
    </ModuleFrame>
  );
}
