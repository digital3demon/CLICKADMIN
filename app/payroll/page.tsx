import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { PayrollPageClient } from "@/components/payroll/PayrollPageClient";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { isPayrollUserRole } from "@/lib/payroll";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session) redirect("/login?next=/payroll");
  if (!isPayrollUserRole(session.role) || access?.PAYROLL !== true) {
    redirect("/");
  }

  return (
    <ModuleFrame
      title="Зарплата"
      description="Ручные сделочные начисления по плашкам «Что сделано» в карточках канбана."
    >
      <PayrollPageClient role={session.role} currentUserId={session.sub} />
    </ModuleFrame>
  );
}
