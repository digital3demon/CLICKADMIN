import {
  KAITEN_MEMBER_TYPE_RESPONSIBLE,
  type KaitenCardMemberRow,
} from "@/lib/kaiten-rest";

export function normalizeKaitenMatchEmail(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

/** ФИО для match Kaiten↔CRM: trim, lowercase, ё→е, схлопнуть пробелы. */
export function normalizeKaitenMatchFullName(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

/**
 * Однозначное совпадение по нормализованному имени.
 * 0 или >1 hit → null (не угадываем при дублях ФИО).
 */
export function findUniqueIdByNormalizedFullName(
  items: ReadonlyArray<{ id: string; name: string }>,
  needleRaw: string | null | undefined,
): string | null {
  const needle = normalizeKaitenMatchFullName(needleRaw);
  if (!needle) return null;
  const hits = items.filter(
    (x) => normalizeKaitenMatchFullName(x.name) === needle,
  );
  return hits.length === 1 ? hits[0]!.id : null;
}

export type KaitenUnmappedMember = {
  kaitenUserId: number;
  label: string;
};

/** Стабильный отпечаток состава members для anti-loop и skip unchanged. */
export function kaitenMembersFingerprint(members: KaitenCardMemberRow[]): string {
  return members
    .map((m) => `${m.userId}:${m.type}`)
    .sort()
    .join("|");
}

export function formatKaitenUnmappedMemberLabel(m: KaitenCardMemberRow): string {
  const name = m.fullName?.trim() || `user-${m.userId}`;
  const email = m.email?.trim();
  return email ? `${name} (${email})` : name;
}

export function splitKaitenMembersByRole(members: KaitenCardMemberRow[]): {
  responsibleUserIds: number[];
  participantUserIds: number[];
} {
  const responsible = new Set<number>();
  const participants = new Set<number>();
  for (const m of members) {
    if (m.type === KAITEN_MEMBER_TYPE_RESPONSIBLE) {
      responsible.add(m.userId);
    } else {
      participants.add(m.userId);
    }
  }
  for (const uid of responsible) {
    participants.delete(uid);
  }
  return {
    responsibleUserIds: [...responsible],
    participantUserIds: [...participants],
  };
}

export function targetKaitenMemberType(
  kaitenUserId: number,
  assigneeKaitenIds: Set<number>,
): number {
  return assigneeKaitenIds.has(kaitenUserId)
    ? KAITEN_MEMBER_TYPE_RESPONSIBLE
    : 1;
}
