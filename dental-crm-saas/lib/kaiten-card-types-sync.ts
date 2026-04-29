import type { PrismaClient } from "@prisma/client";
import { getKaitenRestAuth, kaitenListCardTypes } from "@/lib/kaiten-rest";

export function normKaitenCardTypeName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function normCardTypeName(s: string): string {
  return normKaitenCardTypeName(s);
}

/**
 * Найти числовой type_id в Kaiten по названию (как при «Обновить ID из Kaiten»).
 * При нескольких типах с одним нормализованным названием берётся первый по порядку в ответе API.
 */
export function resolveKaitenExternalTypeIdForCardTypeName(
  crmName: string,
  kaitenTypes: Array<{ id: number; name: string }>,
):
  | { ok: true; externalTypeId: number; ambiguousInKaiten: boolean }
  | { ok: false; error: string } {
  const key = normKaitenCardTypeName(crmName);
  if (!key) {
    return { ok: false, error: "Укажите непустое название типа." };
  }
  const matches: Array<{ id: number; name: string }> = [];
  for (const t of kaitenTypes) {
    if (normKaitenCardTypeName(t.name) === key) matches.push(t);
  }
  if (matches.length === 0) {
    return {
      ok: false,
      error: `В Kaiten нет типа с названием «${crmName.trim()}» (сравнение без учёта регистра и лишних пробелов).`,
    };
  }
  return {
    ok: true,
    externalTypeId: matches[0]!.id,
    ambiguousInKaiten: matches.length > 1,
  };
}

export type SyncKaitenCardTypesOk = {
  ok: true;
  kaitenTypesCount: number;
  updated: Array<{
    id: string;
    name: string;
    oldExternalTypeId: number;
    newExternalTypeId: number;
  }>;
  unchanged: string[];
  notFoundInKaiten: string[];
  /** В ответе Kaiten встретились ещё типы с тем же названием (после нормализации) — для CRM взят первый в списке */
  ambiguousKaitenNames: string[];
};

export type SyncKaitenCardTypesResult =
  | SyncKaitenCardTypesOk
  | { ok: false; error: string };

/**
 * GET /card-types в Kaiten → обновление externalTypeId в KaitenCardType по совпадению названия
 * (регистр и множественные пробелы не учитываются).
 */
export async function syncKaitenCardTypeIdsFromRemote(
  prisma: PrismaClient,
): Promise<SyncKaitenCardTypesResult> {
  const auth = getKaitenRestAuth();
  if (!auth) {
    return {
      ok: false,
      error:
        "Не настроен доступ к API Kaiten: задайте KAITEN_API_TOKEN (и при необходимости KAITEN_API_BASE_URL).",
    };
  }

  const listed = await kaitenListCardTypes(auth);
  if (!listed.ok) {
    return {
      ok: false,
      error: listed.error ?? "Не удалось получить список типов из Kaiten",
    };
  }

  const nameToId = new Map<string, number>();
  const ambiguousSet = new Set<string>();
  for (const t of listed.types) {
    const key = normCardTypeName(t.name);
    if (!key) continue;
    if (nameToId.has(key)) {
      ambiguousSet.add(t.name);
      continue;
    }
    nameToId.set(key, t.id);
  }
  const ambiguousKaitenNames = [...ambiguousSet].sort((a, b) => a.localeCompare(b, "ru"));

  const rows = await prisma.kaitenCardType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const updated: SyncKaitenCardTypesOk["updated"] = [];
  const unchanged: string[] = [];
  const notFoundInKaiten: string[] = [];

  for (const row of rows) {
    const key = normCardTypeName(row.name);
    const remoteId = key ? nameToId.get(key) : undefined;
    if (remoteId == null) {
      notFoundInKaiten.push(row.name);
      continue;
    }
    if (remoteId === row.externalTypeId) {
      unchanged.push(row.name);
      continue;
    }
    await prisma.kaitenCardType.update({
      where: { id: row.id },
      data: { externalTypeId: remoteId },
    });
    updated.push({
      id: row.id,
      name: row.name,
      oldExternalTypeId: row.externalTypeId,
      newExternalTypeId: remoteId,
    });
  }

  return {
    ok: true,
    kaitenTypesCount: listed.types.length,
    updated,
    unchanged,
    notFoundInKaiten,
    ambiguousKaitenNames,
  };
}
