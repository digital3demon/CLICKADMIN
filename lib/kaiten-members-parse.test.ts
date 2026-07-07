import { describe, expect, it } from "vitest";
import {
  kaitenMembersFingerprint,
  splitKaitenMembersByRole,
  targetKaitenMemberType,
} from "@/lib/kaiten-members-parse";
import {
  KAITEN_MEMBER_TYPE_RESPONSIBLE,
  parseKaitenCardMemberRow,
  parseKaitenSpaceUserRow,
} from "@/lib/kaiten-rest";
import { normalizeKaitenMatchEmail } from "@/lib/kaiten-members-parse";

describe("normalizeKaitenMatchEmail", () => {
  it("trim and lowercase", () => {
    expect(normalizeKaitenMatchEmail("  Admin@Lab.RU ")).toBe("admin@lab.ru");
  });
});

describe("parseKaitenCardMemberRow", () => {
  it("parses responsible member with nested user email", () => {
    const row = parseKaitenCardMemberRow({
      user_id: 42,
      type: 2,
      user: { full_name: "Иван", email: "ivan@lab.ru" },
    });
    expect(row).toEqual({
      userId: 42,
      type: 2,
      email: "ivan@lab.ru",
      fullName: "Иван",
    });
  });
});

describe("parseKaitenSpaceUserRow", () => {
  it("parses space user", () => {
    const row = parseKaitenSpaceUserRow({
      id: 7,
      email: "tech@lab.ru",
      full_name: "Техник",
    });
    expect(row?.id).toBe(7);
    expect(row?.email).toBe("tech@lab.ru");
  });
});

describe("kaitenMembersFingerprint", () => {
  it("stable regardless of order", () => {
    const a = kaitenMembersFingerprint([
      { userId: 2, type: 1 },
      { userId: 1, type: 2 },
    ]);
    const b = kaitenMembersFingerprint([
      { userId: 1, type: 2 },
      { userId: 2, type: 1 },
    ]);
    expect(a).toBe(b);
    expect(a).toBe("1:2|2:1");
  });
});

describe("splitKaitenMembersByRole", () => {
  it("type 2 → responsible, rest → participants without duplicate", () => {
    const split = splitKaitenMembersByRole([
      { userId: 1, type: KAITEN_MEMBER_TYPE_RESPONSIBLE },
      { userId: 2, type: 1 },
      { userId: 1, type: 1 },
    ]);
    expect(split.responsibleUserIds).toEqual([1]);
    expect(split.participantUserIds).toEqual([2]);
  });
});

describe("targetKaitenMemberType", () => {
  it("assignee set uses responsible type", () => {
    expect(targetKaitenMemberType(5, new Set([5]))).toBe(KAITEN_MEMBER_TYPE_RESPONSIBLE);
    expect(targetKaitenMemberType(5, new Set())).toBe(1);
  });
});
