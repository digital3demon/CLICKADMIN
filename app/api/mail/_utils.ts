import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";

export function mailErrorResponse(err: unknown, fallback = "Ошибка почты") {
  const message = err instanceof Error ? err.message : "";
  const prismaCode =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  if (
    message.includes("uidValidity") &&
    (message.includes("does not exist") || message.includes("Unknown column") || prismaCode === "P2022")
  ) {
    return NextResponse.json(
      {
        error:
          "База данных не обновлена: отсутствует колонка uidValidity. Выполните на сервере: node scripts/prisma-migrate-deploy.cjs",
      },
      { status: 500 },
    );
  }
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
    MAIL_ACCOUNT_ACCESS_FORBIDDEN: {
      status: 403,
      error: "Нет доступа к этому почтовому ящику",
    },
    EMAIL_REPLY_TEMPLATE_ASSET_NOT_FOUND: {
      status: 404,
      error: "Файл шаблона не найден",
    },
  };
  const mapped = known[message];
  if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  logger.error({ err }, fallback);
  const detail = message.trim();
  return NextResponse.json({ error: detail || fallback }, { status: 500 });
}

export function jsonBody(req: Request): Promise<Record<string, unknown>> {
  return req.json().catch(() => ({}));
}

/** BigInt/Date из Prisma и IMAP нельзя отдавать через NextResponse.json напрямую. */
export function sanitizeForMailJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v instanceof Date) return v.toISOString();
      return v;
    }),
  ) as T;
}

export function mailJsonResponse(body: unknown, init?: ResponseInit): NextResponse {
  const text = JSON.stringify(sanitizeForMailJson(body));
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
