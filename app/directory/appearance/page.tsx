import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { DesignAppearanceClient } from "@/components/directory/DesignAppearanceClient";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

export const dynamic = "force-dynamic";

export default async function DirectoryAppearancePage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) redirect("/login?next=/directory/appearance");
  if (access?.CONFIG_APPEARANCE !== true) redirect("/directory");

  return (
    <ModuleFrame
      title="Оформление"
      description="Переключение между классическим интерфейсом и новым дизайном «Гармония»."
    >
      <DesignAppearanceClient />
      <p className="mt-8 text-sm">
        <Link
          href="/directory"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
