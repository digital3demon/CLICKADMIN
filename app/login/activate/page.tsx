import { Suspense } from "react";
import { ActivateInviteClient } from "./ActivateInviteClient";

function Fallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
    </div>
  );
}

export default function ActivateInvitePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ActivateInviteClient />
    </Suspense>
  );
}
