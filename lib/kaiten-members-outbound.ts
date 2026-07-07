import "server-only";

import type { PrismaClient } from "@prisma/client";
import {
  kaitenMembersFingerprint,
  targetKaitenMemberType,
} from "@/lib/kaiten-members-parse";
import {
  updateLastPushedMembersFingerprintInKanbanState,
} from "@/lib/kanban/kaiten-members-inbound";
import { resolveCrmUserToKaitenUser } from "@/lib/kaiten-user-directory";
import {
  kaitenAddCardMember,
  kaitenListCardMembers,
  kaitenRemoveCardMember,
  kaitenUpdateCardMemberRole,
  type KaitenAuth,
} from "@/lib/kaiten-rest";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";

export type PushMembersToKaitenResult =
  | { ok: true; fingerprint: string }
  | { ok: false; error: string; status: 400 | 422 | 429 | 502 };

async function mapCrmIdsToKaiten(
  db: PrismaClient,
  tenantId: string,
  auth: KaitenAuth,
  crmIds: string[],
): Promise<{ kaitenIds: number[]; errors: string[] }> {
  const kaitenIds: number[] = [];
  const errors: string[] = [];
  for (const id of crmIds) {
    const hit = await resolveCrmUserToKaitenUser(db, tenantId, id, auth);
    if (hit.ok) {
      kaitenIds.push(hit.kaitenUserId);
    } else {
      errors.push(hit.error);
    }
  }
  return { kaitenIds, errors };
}

/** Outbound: CRM assignees/participants → diff в Kaiten card members. */
export async function pushOrderMembersToKaiten(
  db: PrismaClient,
  auth: KaitenAuth,
  input: {
    tenantId: string;
    orderId: string;
    kaitenCardId: number;
    assignees: string[];
    participants: string[];
  },
): Promise<PushMembersToKaitenResult> {
  const assigneeCrm = [...new Set(input.assignees.map((x) => x.trim()).filter(Boolean))];
  const participantCrm = [
    ...new Set(
      input.participants.map((x) => x.trim()).filter((x) => x && !assigneeCrm.includes(x)),
    ),
  ];

  const assignMapped = await mapCrmIdsToKaiten(db, input.tenantId, auth, assigneeCrm);
  const partMapped = await mapCrmIdsToKaiten(db, input.tenantId, auth, participantCrm);
  const mapErrors = [...assignMapped.errors, ...partMapped.errors];
  if (mapErrors.length > 0) {
    return {
      ok: false,
      error: mapErrors[0]!,
      status: 422,
    };
  }

  const assigneeKaitenIds = new Set(assignMapped.kaitenIds);
  const targetKaitenIds = new Set([
    ...assignMapped.kaitenIds,
    ...partMapped.kaitenIds,
  ]);

  const current = await kaitenListCardMembers(auth, input.kaitenCardId, {
    burst: true,
  });
  if (!current.ok) {
    return {
      ok: false,
      error: current.error ?? "Не удалось прочитать участников Kaiten",
      status: isKaitenRateLimitedStatus(current.status) ? 429 : 502,
    };
  }

  const currentByUserId = new Map(current.members.map((m) => [m.userId, m]));

  for (const uid of targetKaitenIds) {
    const wantType = targetKaitenMemberType(uid, assigneeKaitenIds);
    const cur = currentByUserId.get(uid);
    if (!cur) {
      const add = await kaitenAddCardMember(auth, input.kaitenCardId, uid, wantType, {
        burst: true,
      });
      if (!add.ok) {
        return {
          ok: false,
          error: add.error ?? "Не удалось добавить участника в Kaiten",
          status: isKaitenRateLimitedStatus(add.status) ? 429 : 502,
        };
      }
      continue;
    }
    if (cur.type !== wantType) {
      const patch = await kaitenUpdateCardMemberRole(
        auth,
        input.kaitenCardId,
        uid,
        wantType,
        { burst: true },
      );
      if (!patch.ok) {
        return {
          ok: false,
          error: patch.error ?? "Не удалось обновить роль в Kaiten",
          status: isKaitenRateLimitedStatus(patch.status) ? 429 : 502,
        };
      }
    }
  }

  for (const cur of current.members) {
    if (targetKaitenIds.has(cur.userId)) continue;
    const del = await kaitenRemoveCardMember(auth, input.kaitenCardId, cur.userId, {
      burst: true,
    });
    if (!del.ok) {
      return {
        ok: false,
        error: del.error ?? "Не удалось снять участника в Kaiten",
        status: isKaitenRateLimitedStatus(del.status) ? 429 : 502,
      };
    }
  }

  const targetMembers = [...targetKaitenIds].map((uid) => ({
    userId: uid,
    type: targetKaitenMemberType(uid, assigneeKaitenIds),
  }));
  const fingerprint = kaitenMembersFingerprint(targetMembers);

  await updateLastPushedMembersFingerprintInKanbanState({
    tenantId: input.tenantId,
    orderId: input.orderId,
    fingerprint,
  });

  return { ok: true, fingerprint };
}
