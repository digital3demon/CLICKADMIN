import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export default function ClientNotFound() {
  return (
    <ModuleFrame title="Клиент не найден" description="">
      <p className="text-sm text-[var(--text-secondary)]">
        Такой клиники нет в базе или ссылка устарела.
      </p>
      <Link
        href="/clients"
        className="mt-4 inline-block text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
      >
        ← К списку клиентов
      </Link>
    </ModuleFrame>
  );
}
