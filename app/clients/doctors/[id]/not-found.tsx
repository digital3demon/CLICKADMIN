import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export default function DoctorNotFound() {
  return (
    <ModuleFrame title="Врач не найден" description="">
      <p className="text-sm text-[var(--text-secondary)]">
        Такого врача нет в базе или ссылка устарела.
      </p>
      <Link
        href="/clients?view=doctor"
        className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
      >
        ← К списку врачей
      </Link>
    </ModuleFrame>
  );
}
