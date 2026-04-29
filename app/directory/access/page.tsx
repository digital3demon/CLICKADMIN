import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { RoleModuleAccessMatrix } from "@/components/directory/RoleModuleAccessMatrix";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

export default async function DirectoryAccessPage() {
  if (isSingleUserPortable()) redirect("/directory");
  const s = await getSessionFromCookies();
  if (!s) redirect("/login?next=/directory/access");
  if (s.role !== "OWNER") redirect("/directory");

  return (
    <ModuleFrame
      title="Доступ к разделам по ролям"
      description="Владелец настраивает, какие модули CRM видны каждой роли. Сотрудникам с уже открытой сессией может понадобиться обновить страницу. Владелец всегда с полным доступом."
    >
      <RoleModuleAccessMatrix />
      <p className="mt-8 text-sm text-[var(--text-secondary)]">
        <Link
          href="/directory/users"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← К пользователям
        </Link>{" "}
        ·{" "}
        <Link
          href="/directory"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          К конфигурации
        </Link>
      </p>
    </ModuleFrame>
  );
}
