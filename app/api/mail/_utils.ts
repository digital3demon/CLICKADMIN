import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";

export function mailErrorResponse(err: unknown, fallback = "Ошибка почты") {
  const message = err instanceof Error ? err.message : "";
  const known: Record<string, { status: number; error: string }> = {
    INVALID_EMAIL_ACCOUNT: { status: 400, error: "Укажите корректный email" },
    EMAIL_ACCOUNT_NOT_FOUND: { status: 404, error: "Почтовый аккаунт не найден" },
    EMAIL_FOLDER_NOT_FOUND: { status: 404, error: "Папка не найдена" },
    EMAIL_NOT_FOUND: { status: 404, error: "Письмо не найдено" },
    EMAIL_ATTACHMENT_NOT_FOUND: { status: 404, error: "Вложение не найдено" },
    EMPTY_FOLDER_NAME: { status: 400, error: "Укажите название папки" },
    EMPTY_LABEL_NAME: { status: 400, error: "Укажите название метки" },
    EMPTY_RULE_NAME: { status: 400, error: "Укажите название правила" },
    EMAIL_RULE_NOT_FOUND: { status: 404, error: "Правило не найдено" },
    MAIL_ACCOUNT_PASSWORD_NOT_CONFIGURED: {
      status: 400,
      error: "Для аккаунта не задан пароль приложения Яндекса",
    },
  };
  const mapped = known[message];
  if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  logger.error({ err }, fallback);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function jsonBody(req: Request): Promise<Record<string, unknown>> {
  return req.json().catch(() => ({}));
}

/** Prisma BigInt (uidValidity и др.) нельзя отдавать через NextResponse.json напрямую. */
export function mailJsonResponse(body: unknown, init?: ResponseInit): NextResponse {
  const text = JSON.stringify(body, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(text, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : init?.headers),
    },
  });
}
