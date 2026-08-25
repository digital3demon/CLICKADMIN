import { describe, expect, it, vi } from "vitest";
import { createOrderProstheticsRequestIfNeeded } from "./order-prosthetics-request-db";
import { normalizeProstheticsTwinKey } from "./order-prosthetics-request";
import {
  collapsePendingProstheticsTextTwins,
  preferPendingProstheticsTwin,
} from "./order-prosthetics-requests-read";

describe("normalizeProstheticsTwinKey", () => {
  it("схлопывает переносы и пробелы", () => {
    const a = "Артикул: 01124 -1шт\nАртикул: 01460 -1шт\n3D-ACR -1шт";
    const b = "Артикул: 01124 -1шт Артикул: 01460 -1шт 3D-ACR -1шт";
    expect(normalizeProstheticsTwinKey(a)).toBe(normalizeProstheticsTwinKey(b));
  });
});

describe("collapsePendingProstheticsTextTwins", () => {
  it("оставляет DEMO_KANBAN при дубле с legacy KAITEN", () => {
    const rows = collapsePendingProstheticsTextTwins([
      {
        id: "demo",
        text: "Артикул: 01124 -1шт Артикул: 01460 -1шт",
        source: "DEMO_KANBAN",
        authorLabel: "Roman",
        createdAt: new Date("2026-08-13T08:17:00Z"),
        resolvedAt: null,
        rejectedAt: null,
        arrivedAt: null,
      },
      {
        id: "kaiten",
        text: "Артикул: 01124 -1шт\nАртикул: 01460 -1шт",
        source: "KAITEN",
        authorLabel: "Roman",
        createdAt: new Date("2026-08-13T08:15:00Z"),
        resolvedAt: null,
        rejectedAt: null,
        arrivedAt: null,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("demo");
  });
});

describe("preferPendingProstheticsTwin", () => {
  it("предпочитает DEMO_KANBAN", () => {
    const a = {
      id: "a",
      text: "x",
      source: "DEMO_KANBAN" as const,
      authorLabel: null,
      createdAt: new Date("2026-08-13T10:00:00Z"),
      resolvedAt: null,
      rejectedAt: null,
      arrivedAt: null,
    };
    const b = {
      ...a,
      id: "b",
      source: "KAITEN" as const,
      createdAt: new Date("2026-08-13T09:00:00Z"),
    };
    expect(preferPendingProstheticsTwin(a, b).id).toBe("a");
  });
});

describe("createOrderProstheticsRequestIfNeeded", () => {
  it("binds kid onto pending twin and keeps DEMO_KANBAN (not KAITEN)", async () => {
    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(null);
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "crm-1",
          text: "Артикул: 01124 -1шт Артикул: 01460 -1шт",
          kaitenCommentId: null,
        },
      ])
      .mockResolvedValue([]);
    const deleteMany = vi.fn();

    const db = {
      orderProstheticsRequest: {
        findUnique,
        findMany,
        update,
        create,
        deleteMany,
      },
    };

    await createOrderProstheticsRequestIfNeeded(
      db as never,
      "order-1",
      "???\nАртикул: 01124 -1шт\nАртикул: 01460 -1шт",
      "KAITEN",
      { kaitenCommentId: 99, authorLabel: "Roman" },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: "crm-1" },
      data: {
        kaitenCommentId: 99,
        source: "DEMO_KANBAN",
        text: "Артикул: 01124 -1шт\nАртикул: 01460 -1шт",
        authorLabel: "Roman",
      },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates DEMO_KANBAN even when caller passes KAITEN", async () => {
    const create = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(null);
    const findMany = vi.fn().mockResolvedValue([]);

    const db = {
      orderProstheticsRequest: {
        findUnique,
        findMany,
        create,
      },
    };

    await createOrderProstheticsRequestIfNeeded(
      db as never,
      "order-1",
      "??? нужна коронка",
      "KAITEN",
      { kaitenCommentId: 7, authorLabel: "Roman" },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        source: "DEMO_KANBAN",
        text: "нужна коронка",
        kaitenCommentId: 7,
        authorLabel: "Roman",
      },
    });
  });

  it("skips DEMO create when pending twin already exists", async () => {
    const create = vi.fn();
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "k1",
        text: "Артикул: 01124 -1шт\nАртикул: 01460 -1шт",
      },
    ]);

    const db = {
      orderProstheticsRequest: {
        findMany,
        create,
      },
    };

    await createOrderProstheticsRequestIfNeeded(
      db as never,
      "order-1",
      "??? Артикул: 01124 -1шт Артикул: 01460 -1шт",
      "DEMO_KANBAN",
      { authorLabel: "Roman" },
    );

    expect(create).not.toHaveBeenCalled();
  });

  it("кнопка forceNew создаёт новую заявку при том же тексте спустя несколько секунд", async () => {
    const create = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "k1",
        text: "коронка на 16",
        createdAt: new Date(Date.now() - 8_000),
      },
    ]);

    const db = {
      orderProstheticsRequest: {
        findMany,
        create,
      },
    };

    await createOrderProstheticsRequestIfNeeded(
      db as never,
      "order-1",
      "??? коронка на 16",
      "DEMO_KANBAN",
      { forceNew: true, authorLabel: "Роман" },
    );

    expect(create).toHaveBeenCalled();
  });

  it("кнопка forceNew создаёт заявку после закрытой с тем же текстом", async () => {
    const create = vi.fn().mockResolvedValue({});
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "done-1", text: "коронка на 16" }]);

    const db = {
      orderProstheticsRequest: {
        findMany,
        create,
      },
    };

    await createOrderProstheticsRequestIfNeeded(
      db as never,
      "order-1",
      "??? коронка на 16",
      "DEMO_KANBAN",
      { forceNew: true, authorLabel: "Роман" },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: "order-1",
        source: "DEMO_KANBAN",
        text: "коронка на 16",
        kaitenCommentId: null,
        authorLabel: "Роман",
      },
    });
  });

  it("не поднимает исполненную заявку как новую при повторном синке Kaiten", async () => {
    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn();
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "done-1",
          text: "Артикул: 01126 -1шт 3D-DER -1шт",
          kaitenCommentId: null,
        },
      ]);

    const db = {
      orderProstheticsRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany,
        update,
        create,
        deleteMany: vi.fn(),
      },
    };

    await createOrderProstheticsRequestIfNeeded(
      db as never,
      "order-1",
      "???\nАртикул: 01126 -1шт\n3D-DER -1шт",
      "KAITEN",
      { kaitenCommentId: 88, authorLabel: "Марк" },
    );

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "done-1" },
      data: {
        kaitenCommentId: 88,
        source: "DEMO_KANBAN",
        text: "Артикул: 01126 -1шт\n3D-DER -1шт",
        authorLabel: "Марк",
      },
    });
  });
});
