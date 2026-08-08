"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";
import { parseTelegramMiniAppStartParam } from "@/lib/telegram-mini-app-start-param";
import {
  readTelegramWebAppInitData,
  readTelegramWebAppStartParam,
  tryTelegramWebAppReadyExpand,
} from "@/lib/telegram-webapp-launch-params";

type AuthOk = {
  ok: true;
  role: string;
  linksToOrderPage: boolean;
  userId: string;
  startParam: string | null;
};

const BOOT_TIMEOUT_MS = 15_000;

function kanbanHrefForTarget(
  target: ReturnType<typeof parseTelegramMiniAppStartParam>,
): string {
  if (!target) return "/kanban";
  if (target.kind === "order") return kanbanOrderDeepLinkPath(target.orderId);
  return `/kanban?${new URLSearchParams({ card: target.cardId }).toString()}`;
}

function browserFallbackHref(
  target: ReturnType<typeof parseTelegramMiniAppStartParam>,
  linksToOrderPage: boolean,
): string {
  if (!target) return "/";
  if (target.kind === "order" && linksToOrderPage) {
    return orderPathById(target.orderId);
  }
  return kanbanHrefForTarget(target);
}

export function TelegramMiniAppBootstrap() {
  const started = useRef(false);
  const settled = useRef(false);
  const fallbackRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<"boot" | "error">("boot");
  const [message, setMessage] = useState("Открываем…");
  const [fallbackHref, setFallbackHref] = useState<string | null>(null);

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

    tryTelegramWebAppReadyExpand();

    const startParam = readTelegramWebAppStartParam();
    const target = parseTelegramMiniAppStartParam(startParam);
    setFallback(browserFallbackHref(target, false));

    const initData = readTelegramWebAppInitData();
    if (!initData) {
      fail(
        "Нет данных Telegram (initData). Откройте Mini App из чата с ботом, не из обычного браузера.",
        browserFallbackHref(target, false),
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
      fail("Сеть: не удалось связаться с CRM.", browserFallbackHref(target, false));
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
        browserFallbackHref(target, false),
      );
      return;
    }

    if (!target) {
      fail("В ссылке нет наряда или карточки.", "/kanban");
      return;
    }

    setFallback(browserFallbackHref(target, authJson.linksToOrderPage));

    if (authJson.linksToOrderPage && target.kind === "order") {
      setMessage("Открываем наряд…");
      settled.current = true;
      window.location.replace(orderPathById(target.orderId));
      return;
    }

    setMessage("Открываем канбан…");
    settled.current = true;
    window.location.replace(kanbanHrefForTarget(target));
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
    </div>
  );
}
