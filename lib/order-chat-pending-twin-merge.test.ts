import { describe, expect, it } from "vitest";
import { orderIdsPendingAfterTwinMerge } from "./order-chat-pending-twin-merge";

const key = (s: string) => s.replace(/^\s*!!!\s*/u, "").trim().toLowerCase();

describe("orderIdsPendingAfterTwinMerge", () => {
  it("закрытый inbox гасит pending legacy с тем же kid", () => {
    const pending = orderIdsPendingAfterTwinMerge(
      [
        {
          orderId: "o1",
          kaitenCommentId: 42,
          resolvedAt: new Date("2026-07-10T10:00:00Z"),
          rejectedAt: null,
          text: "!!! цвет 14",
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      [
        {
          orderId: "o1",
          kaitenCommentId: 42,
          resolvedAt: null,
          rejectedAt: null,
          text: "цвет 14",
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      key,
    );
    expect(pending.has("o1")).toBe(false);
  });

  it("закрытый legacy гасит pending inbox с тем же kid (заказы ↔ финотдел)", () => {
    const pending = orderIdsPendingAfterTwinMerge(
      [
        {
          orderId: "o1",
          kaitenCommentId: 42,
          resolvedAt: null,
          rejectedAt: null,
          text: "!!! цвет с вестибулярной стороны 14",
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      [
        {
          orderId: "o1",
          kaitenCommentId: 42,
          resolvedAt: new Date("2026-07-10T10:00:00Z"),
          rejectedAt: null,
          text: "цвет с вестибулярной стороны 14",
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      key,
    );
    expect(pending.has("o1")).toBe(false);
  });

  it("закрытый близнец того же сообщения (текст + тот же момент) гасит висящий pending", () => {
    const at = new Date("2026-07-01T10:00:00.200Z");
    const pending = orderIdsPendingAfterTwinMerge(
      [
        {
          orderId: "o1",
          kaitenCommentId: null,
          resolvedAt: null,
          rejectedAt: null,
          text: "!!! срок от 10.02.2026",
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
        },
      ],
      [
        {
          orderId: "o1",
          kaitenCommentId: null,
          resolvedAt: at,
          rejectedAt: null,
          text: "срок от 10.02.2026",
          createdAt: at,
        },
      ],
      key,
    );
    expect(pending.has("o1")).toBe(false);
  });

  it("тот же текст спустя несколько секунд — новая заявка, пилюля остаётся", () => {
    const pending = orderIdsPendingAfterTwinMerge(
      [
        {
          orderId: "o1",
          kaitenCommentId: null,
          resolvedAt: null,
          rejectedAt: null,
          text: "!!! срок от 10.02.2026",
          createdAt: new Date("2026-07-01T10:00:08Z"),
        },
      ],
      [
        {
          orderId: "o1",
          kaitenCommentId: null,
          resolvedAt: new Date("2026-07-01T10:00:09Z"),
          rejectedAt: null,
          text: "срок от 10.02.2026",
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      key,
    );
    expect(pending.has("o1")).toBe(true);
  });

  it("новая заявка с тем же текстом после закрытия остаётся pending", () => {
    const pending = orderIdsPendingAfterTwinMerge(
      [
        {
          orderId: "o1",
          kaitenCommentId: null,
          resolvedAt: null,
          rejectedAt: null,
          text: "!!! срок от 10.02.2026",
          createdAt: new Date("2026-07-20T10:00:00Z"),
        },
      ],
      [
        {
          orderId: "o1",
          kaitenCommentId: null,
          resolvedAt: new Date("2026-07-10T10:00:00Z"),
          rejectedAt: null,
          text: "срок от 10.02.2026",
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
      ],
      key,
    );
    expect(pending.has("o1")).toBe(true);
  });
});
