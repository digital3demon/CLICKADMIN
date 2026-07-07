import {
  KAITEN_MEMBER_TYPE_RESPONSIBLE,
  type KaitenCardMemberRow,
} from "@/lib/kaiten-rest";

export function normalizeKaitenMatchEmail(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
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
