import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kaiten-user-directory", () => ({
  resolveCrmUserToKaitenUser: vi.fn(),
}));

vi.mock("@/lib/kanban/kaiten-members-inbound", () => ({
  updateLastPushedMembersFingerprintInKanbanState: vi.fn(async () => {}),
}));

vi.mock("@/lib/kaiten-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/kaiten-rest")>();
  return {
    ...actual,
    kaitenListCardMembers: vi.fn(),
    kaitenAddCardMember: vi.fn(),
    kaitenUpdateCardMemberRole: vi.fn(),
    kaitenRemoveCardMember: vi.fn(),
  };
});

import { resolveCrmUserToKaitenUser } from "@/lib/kaiten-user-directory";
import {
  kaitenAddCardMember,
  kaitenListCardMembers,
  kaitenRemoveCardMember,
} from "@/lib/kaiten-rest";
import { pushOrderMembersToKaiten } from "@/lib/kaiten-members-outbound";

const db = {} as never;
const auth = { apiBase: "https://x/api/v1", token: "t" };

describe("pushOrderMembersToKaiten", () => {
  beforeEach(() => {
    vi.mocked(resolveCrmUserToKaitenUser).mockReset();
    vi.mocked(kaitenListCardMembers).mockReset();
    vi.mocked(kaitenAddCardMember).mockReset();
    vi.mocked(kaitenRemoveCardMember).mockReset();
  });

  it("returns 422 when CRM user has no Kaiten match", async () => {
    vi.mocked(resolveCrmUserToKaitenUser).mockResolvedValue({
      ok: false,
      error: "Нет пользователя Kaiten",
    });
    const result = await pushOrderMembersToKaiten(db, auth, {
      tenantId: "t1",
      orderId: "o1",
      kaitenCardId: 100,
      assignees: ["u1"],
      participants: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });

  it("adds new member and removes stale", async () => {
    vi.mocked(resolveCrmUserToKaitenUser).mockResolvedValue({
      ok: true,
      kaitenUserId: 10,
    });
    vi.mocked(kaitenListCardMembers).mockResolvedValue({
      ok: true,
      status: 200,
      members: [{ userId: 99, type: 1 }],
      error: null,
    });
    vi.mocked(kaitenAddCardMember).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
    });
    vi.mocked(kaitenRemoveCardMember).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
    });

    const result = await pushOrderMembersToKaiten(db, auth, {
      tenantId: "t1",
      orderId: "o1",
      kaitenCardId: 100,
      assignees: ["u1"],
      participants: [],
    });
    expect(result.ok).toBe(true);
    expect(kaitenAddCardMember).toHaveBeenCalled();
    expect(kaitenRemoveCardMember).toHaveBeenCalledWith(
      auth,
      100,
      99,
      expect.objectContaining({ burst: true }),
    );
  });
});
