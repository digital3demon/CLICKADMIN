import { MessengersClient } from "@/components/messengers/MessengersClient";
import { ModuleFrame } from "@/components/layout/ModuleFrame";

export const dynamic = "force-dynamic";

export default function MessengersPage() {
  return (
    <ModuleFrame title="Мессенджеры" description="">
      <MessengersClient />
    </ModuleFrame>
  );
}
