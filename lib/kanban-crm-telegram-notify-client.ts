"use client";

/** Лёгкий клиентский вызов `/api/kanban/telegram-notify` (ошибки не пробрасываются). */
export function postKanbanTelegramNotify(payload: Record<string, unknown>): void {
  void fetch("/api/kanban/telegram-notify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
