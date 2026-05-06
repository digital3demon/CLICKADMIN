import { describe, expect, it } from "vitest";
import { kaitenLabMentionPendingForUser } from "@/lib/order-kaiten-lab-mention-pending";

describe("kaitenLabMentionPendingForUser", () => {
  const t0 = new Date("2026-01-01T12:00:00.000Z");
  const t1 = new Date("2026-02-01T12:00:00.000Z");

  it("нет упоминания — не показываем", () => {
    expect(
      kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: false,
        kaitenLabMentionSignalAt: t1,
        ackAt: null,
      }),
    ).toBe(false);
  });

  it("есть упоминание и не было ack — показываем", () => {
    expect(
      kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: null,
        ackAt: null,
      }),
    ).toBe(true);
  });

  it("есть ack без signalAt — снято", () => {
    expect(
      kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: null,
        ackAt: t0,
      }),
    ).toBe(false);
  });

  it("signal новее ack — снова показываем", () => {
    expect(
      kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: t1,
        ackAt: t0,
      }),
    ).toBe(true);
  });

  it("ack не старше signal — не показываем", () => {
    expect(
      kaitenLabMentionPendingForUser({
        kaitenChatHasLabMention: true,
        kaitenLabMentionSignalAt: t0,
        ackAt: t1,
      }),
    ).toBe(false);
  });
});
