import type { Prisma } from "@prisma/client";

/** Нормализация `q` в списке писем: trim + схлопывание пробелов. */
export function normalizeMailSearchQuery(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Токены для комбинированного поиска.
 * Пробелы разделяют слова; кавычки не поддерживаем (KISS).
 * Границы через пробел, не через JS `\b` — кириллица.
 */
export function mailSearchTokens(raw: string | null | undefined): string[] {
  const q = normalizeMailSearchQuery(raw);
  if (!q) return [];
  return q.split(" ").filter(Boolean);
}

/** Одно слово: тема / превью / отправитель (имя или адрес). */
function mailSearchTokenWhere(token: string): Prisma.EmailWhereInput {
  return {
    OR: [
      { subject: { contains: token, mode: "insensitive" } },
      { preview: { contains: token, mode: "insensitive" } },
      { fromName: { contains: token, mode: "insensitive" } },
      { fromAddress: { contains: token, mode: "insensitive" } },
    ],
  };
}

/**
 * Условие поиска: все слова должны встретиться (AND),
 * каждое — в любом из полей (OR). «федорова губин» находит письмо,
 * где в теме «Федорова», а в fromName — «Губин».
 */
export function mailSearchWhere(
  raw: string | null | undefined,
): Prisma.EmailWhereInput | undefined {
  const tokens = mailSearchTokens(raw);
  if (tokens.length === 0) return undefined;
  if (tokens.length === 1) return mailSearchTokenWhere(tokens[0]!);
  return { AND: tokens.map(mailSearchTokenWhere) };
}
