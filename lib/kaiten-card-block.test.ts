import { describe, expect, it } from "vitest";
import { kaitenBlockedMetaFromCard } from "@/lib/kaiten-card-block";

describe("kaitenBlockedMetaFromCard", () => {
  it("prefers активный blocker по времени, не верхний block_reason", () => {
    const card = {
      blocked: true,
      block_reason: "моделим сплинт",
      blockers: [
        {
          released: false,
          reason: "сплинт на согласе",
          created: "2026-05-11T17:36:00.000Z",
        },
        {
          released: false,
          reason: "старый текст",
          created: "2026-05-08T12:43:00.000Z",
        },
      ],
    };
    const m = kaitenBlockedMetaFromCard(card);
    expect(m.blocked).toBe(true);
    expect(m.reason).toBe("сплинт на согласе");
    expect(m.blockedAtIso).toBe("2026-05-11T17:36:00.000Z");
  });

  it("явный blocked:false снимает блок даже при «висячих» blockers", () => {
    const card = {
      blocked: false,
      block_reason: "устаревшее на карточке",
      blockers: [
        { released: true, reason: "снято", created: "2026-05-10T10:00:00.000Z" },
        {
          released: false,
          reason: "устаревший хвост API",
          updated: "2026-05-12T08:00:00.000Z",
        },
      ],
    };
    const m = kaitenBlockedMetaFromCard(card);
    expect(m.blocked).toBe(false);
    expect(m.reason).toBeNull();
  });

  it("без явного флага берёт причину из неосвобождённых blockers", () => {
    const card = {
      blockers: [
        { released: true, reason: "снято", created: "2026-05-10T10:00:00.000Z" },
        {
          released: false,
          reason: "актуально в работе",
          updated: "2026-05-12T08:00:00.000Z",
        },
      ],
    };
    const m = kaitenBlockedMetaFromCard(card);
    expect(m.blocked).toBe(true);
    expect(m.reason).toBe("актуально в работе");
    expect(m.blockedAtIso).toBe("2026-05-12T08:00:00.000Z");
  });

  it("без blockers использует поля карточки", () => {
    const card = {
      blocked: true,
      block_reason: "ждём клиента",
      blocked_at: "2026-05-01T15:30:00.000Z",
    };
    const m = kaitenBlockedMetaFromCard(card);
    expect(m.reason).toBe("ждём клиента");
    expect(m.blockedAtIso).toBe("2026-05-01T15:30:00.000Z");
  });
});
