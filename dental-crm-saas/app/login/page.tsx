import { Suspense } from "react";
import { LoginPageClient } from "./LoginPageClient";

function LoginFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--app-text)]">Вход в CRM</h1>
      <p className="mt-8 text-sm text-[var(--text-muted)]">Загрузка…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
