"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { orderPathById } from "@/lib/order-public-ref";
import { parseTelegramMiniAppStartParam } from "@/lib/telegram-mini-app-start-param";

type AuthOk = {
  ok: true;
  role: string;
  linksToOrderPage: boolean;
  userId: string;
  startParam: string | null;
};

type LiteOrder = {
  kind: "order";
  orderNumber: string;
  patientName: string | null;
  doctorName: string;
  workLabel: string | null;
  statusLabel: string;
  dueLabel: string | null;
  kanbanRelPath: string;
  orderPath: string;
};

type LiteCard = {
  kind: "card";
  title: string;
  statusLabel: string;
  kanbanRelPath: string;
};

type Lite = LiteOrder | LiteCard;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { start_param?: string };
        ready: () => void;
        expand: () => void;
        close?: () => void;
        openLink?: (url: string) => void;
      };
    };
  }
}

const BOOT_TIMEOUT_MS = 12_000;
const WEBAPP_POLL_MS = 40;
const WEBAPP_WAIT_MS = 2500;

function readStartParam(): string | null {
  if (typeof window === "undefined") return null;
  const fromUnsafe = window.Telegram?.WebApp?.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;
  const q = new URLSearchParams(window.location.search);
  return q.get("tgWebAppStartParam")?.trim() || q.get("startapp")?.trim() || null;
}

function browserFallbackHref(
  target: ReturnType<typeof parseTelegramMiniAppStartParam>,
): string {
  if (!target) return "/";
  if (target.kind === "order") return orderPathById(target.orderId);
  return `/kanban?${new URLSearchParams({ card: target.cardId }).toString()}`;
}

/** Ждём инжект Telegram (без загрузки telegram.org — в РФ часто таймаут). */
function waitForTelegramWebApp(maxMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      resolve(true);
      return;
    }
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      if (window.Telegram?.WebApp) {
        window.clearInterval(id);
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= maxMs) {
        window.clearInterval(id);
        resolve(false);
      }
    }, WEBAPP_POLL_MS);
  });
}

export function TelegramMiniAppBootstrap() {
  const started = useRef(false);
  const settled = useRef(false);
  const fallbackRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<"boot" | "error" | "lite">("boot");
  const [message, setMessage] = useState("Открываем…");
  const [fallbackHref, setFallbackHref] = useState<string | null>(null);
  const [lite, setLite] = useState<Lite | null>(null);

  const setFallback = useCallback((href: string | null) => {
    fallbackRef.current = href;
    setFallbackHref(href);
  }, []);

  const fail = useCallback((text: string, href: string | null) => {
    settled.current = true;
    if (href) {
      fallbackRef.current = href;
      setFallbackHref(href);
    }
    setPhase("error");
    setMessage(text);
  }, []);

  const run = useCallback(async () => {
    if (started.current) return;
    started.current = true;

    const startParamEarly = readStartParam();
    const targetEarly = parseTelegramMiniAppStartParam(startParamEarly);
    const fallback = browserFallbackHref(targetEarly);
    setFallback(fallback);

    setMessage("Подключение к Telegram…");
    const hasWa = await waitForTelegramWebApp(WEBAPP_WAIT_MS);
    if (!hasWa || !window.Telegram?.WebApp) {
      fail(
        "Telegram WebApp не ответил. Откройте ссылку из чата с ботом или перейдите в браузер.",
        fallback,
      );
      return;
    }

    const wa = window.Telegram.WebApp;
    try {
      wa.ready();
      wa.expand();
    } catch {
      /* ignore */
    }

    const startParam = readStartParam() ?? startParamEarly;
    const target = parseTelegramMiniAppStartParam(startParam) ?? targetEarly;
    setFallback(browserFallbackHref(target));

    const initData = wa.initData?.trim() || "";
    if (!initData) {
      fail(
        "Нет данных Telegram (initData). Откройте Mini App из Telegram, не из браузера.",
        browserFallbackHref(target),
      );
      return;
    }

    setMessage("Вход в CRM…");
    let authRes: Response;
    try {
      authRes = await fetch("/api/auth/telegram-webapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ initData }),
      });
    } catch {
      fail("Сеть: не удалось связаться с CRM.", browserFallbackHref(target));
      return;
    }

    const authJson = (await authRes.json().catch(() => ({}))) as AuthOk & {
      error?: string;
      code?: string;
    };

    if (!authRes.ok || !authJson.ok) {
      fail(
        authJson.error ||
          "Не удалось войти. Привяжите Telegram в профиле CRM.",
        browserFallbackHref(target),
      );
      return;
    }

    if (authJson.linksToOrderPage && target?.kind === "order") {
      setMessage("Открываем наряд…");
      settled.current = true;
      window.location.replace(orderPathById(target.orderId));
      return;
    }

    const qs = new URLSearchParams();
    if (target?.kind === "order") qs.set("orderId", target.orderId);
    else if (target?.kind === "card") qs.set("cardId", target.cardId);
    else {
      fail("В ссылке нет наряда или карточки.", fallback);
      return;
    }

    setMessage("Загрузка карточки…");
    let cardRes: Response;
    try {
      cardRes = await fetch(`/api/tg-app/card?${qs.toString()}`, {
        credentials: "same-origin",
      });
    } catch {
      fail("Сеть: не удалось загрузить карточку.", browserFallbackHref(target));
      return;
    }

    const cardJson = (await cardRes.json().catch(() => ({}))) as Lite & {
      error?: string;
    };
    if (!cardRes.ok) {
      fail(cardJson.error || "Карточка не найдена", browserFallbackHref(target));
      return;
    }

    settled.current = true;
    setLite(cardJson as Lite);
    setPhase("lite");
  }, [fail, setFallback]);

  useEffect(() => {
    void run();
    const t = window.setTimeout(() => {
      if (!settled.current) {
        fail(
          "Долго нет ответа от CRM. Откройте карточку в браузере или повторите позже.",
          fallbackRef.current,
        );
      }
    }, BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- однократный старт Mini App
  }, []);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-4 px-4 py-6 text-[var(--app-text)]">
      {phase === "boot" ? (
        <p className="text-sm text-[var(--text-muted)]">{message}</p>
      ) : null}

      {phase === "error" ? (
        <div className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="text-sm">{message}</p>
          {fallbackHref ? (
            <a
              className="inline-flex text-sm font-medium text-sky-600 underline dark:text-sky-400"
              href={fallbackHref}
              target="_blank"
              rel="noreferrer"
            >
              Открыть в браузере
            </a>
          ) : null}
        </div>
      ) : null}

      {phase === "lite" && lite ? (
        <article className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
          {lite.kind === "order" ? (
            <>
              <h1 className="text-lg font-semibold leading-snug">
                {lite.orderNumber}
              </h1>
              <p className="text-sm">
                {lite.doctorName}
                {lite.patientName ? ` · ${lite.patientName}` : ""}
              </p>
              {lite.workLabel ? (
                <p className="text-sm opacity-90">{lite.workLabel}</p>
              ) : null}
              <p className="text-sm">
                <span className="opacity-60">Статус: </span>
                {lite.statusLabel}
              </p>
              {lite.dueLabel ? (
                <p className="text-sm">
                  <span className="opacity-60">Срок: </span>
                  {lite.dueLabel}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold leading-snug">{lite.title}</h1>
              <p className="text-sm">
                <span className="opacity-60">Статус: </span>
                {lite.statusLabel}
              </p>
            </>
          )}
          <a
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-sky-600 px-3 py-2.5 text-sm font-medium text-white"
            href={lite.kanbanRelPath}
          >
            Открыть канбан
          </a>
        </article>
      ) : null}
    </div>
  );
}
