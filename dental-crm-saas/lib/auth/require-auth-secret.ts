import { NextResponse } from "next/server";
import { getAuthSecretKey } from "@/lib/auth/jwt";

/** Сообщение для UI при отсутствии секрета (вместо 500 «Ошибка входа»). */
export const AUTH_SECRET_MISSING_MESSAGE =
  "В файле .env задайте AUTH_SECRET не короче 16 символов (скопируйте из .env.example или придумайте свой) и перезапустите сервер.";

/** Если секрета нет — готовый JSON-ответ для API входа / bootstrap. */
export function jsonResponseIfAuthSecretMissing(): NextResponse | null {
  if (getAuthSecretKey()) return null;
  return NextResponse.json({ error: AUTH_SECRET_MISSING_MESSAGE }, {
    status: 503,
  });
}
