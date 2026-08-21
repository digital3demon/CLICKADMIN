"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

export default function ClickMigCabinetPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [applications, setApplications] = useState<
    Array<{ publicNumber: string; patientName: string; status: string; createdAt: string }>
  >([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");

  const loadApps = useCallback(async () => {
    const res = await fetch("/api/clickmig/public/cabinet/applications", {
      credentials: "include",
      headers: jsonHeaders(),
    });
    if (res.ok) {
      const data = (await res.json()) as { applications: typeof applications };
      setApplications(data.applications ?? []);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  async function authSubmit(e: React.FormEvent) {
    e.preventDefault();
    const path =
      mode === "login"
        ? "/api/clickmig/public/auth/login"
        : "/api/clickmig/public/auth/register";
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password, fullName }),
    });
    if (res.ok) await loadApps();
  }

  async function addClinic(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/clickmig/public/cabinet/clinics", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders(),
      body: JSON.stringify({ name: clinicName, address: clinicAddress, isDefault: true }),
    });
    setClinicName("");
    setClinicAddress("");
  }

  if (!loggedIn) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-xl font-semibold">Личный кабинет КликМиг</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "font-bold" : ""}>
            Вход
          </button>
          <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "font-bold" : ""}>
            Регистрация
          </button>
        </div>
        <form className="space-y-3" onSubmit={(e) => void authSubmit(e)}>
          {mode === "register" && (
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="ФИО"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input
            type="email"
            required
            className="w-full rounded border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={8}
            className="w-full rounded border px-3 py-2"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white">
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        <Link href="/p/clickmig/form" className="text-sm text-blue-600 hover:underline">
          Новый заказ без входа
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Мои заявки</h1>
      <Link href="/p/clickmig/form" className="text-sm text-blue-600 hover:underline">
        + Новый заказ
      </Link>
      <ul className="space-y-2">
        {applications.map((a) => (
          <li key={a.publicNumber} className="rounded border p-3 text-sm">
            <strong>{a.publicNumber}</strong> · {a.patientName} · {a.status}
            <div className="text-[var(--muted)]">
              {new Date(a.createdAt).toLocaleString("ru-RU")}
            </div>
          </li>
        ))}
      </ul>
      <form className="space-y-2 rounded border p-4" onSubmit={(e) => void addClinic(e)}>
        <h2 className="font-medium">Сохранить клинику</h2>
        <input
          className="w-full rounded border px-2 py-1.5"
          placeholder="Название"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
        />
        <input
          className="w-full rounded border px-2 py-1.5"
          placeholder="Адрес"
          value={clinicAddress}
          onChange={(e) => setClinicAddress(e.target.value)}
        />
        <button type="submit" className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white">
          Сохранить
        </button>
      </form>
    </main>
  );
}
