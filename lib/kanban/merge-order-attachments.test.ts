import { describe, expect, it } from "vitest";
import {
  createCard,
  mergeOrderAttachmentsIntoLinkedCard,
} from "@/lib/kanban/model";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";

function row(
  attachments: NonNullable<KaitenLinkedOrderForKanban["attachments"]>,
): KaitenLinkedOrderForKanban {
  return {
    id: "ord-1",
    orderNumber: "2608-214",
    patientName: "Лихачева",
    doctorFullName: "Амирханова",
    dueDate: null,
    appointmentDate: null,
    dueToAdminsAt: null,
    kaitenAdminDueHasTime: true,
    kaitenCardTitleLabel: null,
    kaitenCardTypeId: null,
    kaitenCardTypeName: null,
    kaitenTrackLane: "ORTHODONTICS",
    isUrgent: false,
    urgentCoefficient: null,
    kaitenCardId: 1,
    kaitenColumnTitle: null,
    kaitenCardSortOrder: null,
    kaitenCardTitleMirror: null,
    kaitenCardDescriptionMirror: null,
    kaitenBlocked: false,
    kaitenBlockReason: null,
    kaitenBlockedAt: null,
    demoKanbanColumn: null,
    primaryPriceListItemName: null,
    clientOrderText: null,
    notes: null,
    attachments,
  };
}

describe("mergeOrderAttachmentsIntoLinkedCard", () => {
  it("оставляет несколько image.png с кириллицей вокруг — разные id", () => {
    const card = createCard({ id: "c1", title: "2608-214 Лихачева М." });
    mergeOrderAttachmentsIntoLinkedCard(
      card,
      "ord-1",
      row([
        {
          id: "att-a",
          fileName: "image.png",
          mimeType: "image/png",
          size: 28000,
          createdAt: "2026-08-17T09:50:00.000Z",
        },
        {
          id: "att-b",
          fileName: "image.png",
          mimeType: "image/png",
          size: 31000,
          createdAt: "2026-08-17T09:51:00.000Z",
        },
        {
          id: "att-c",
          fileName: "IMG_2026_08_17_12_55_57S.jpg",
          mimeType: "image/jpeg",
          size: 90000,
          createdAt: "2026-08-17T09:55:00.000Z",
        },
      ]),
    );
    expect(card.files.map((f) => f.orderAttachmentId)).toEqual([
      "att-a",
      "att-b",
      "att-c",
    ]);
    expect(card.files.filter((f) => f.name === "image.png")).toHaveLength(2);
  });

  it("не выкидывает второй image.png из канбана, если он уже с orderAttachmentId", () => {
    const card = createCard({
      id: "c2",
      title: "2608-214 Лихачева М.",
      files: [
        {
          id: "oa-att-a",
          name: "image.png",
          mime: "image/png",
          size: 28000,
          dataUrl: "/api/orders/ord-1/attachments/att-a",
          addedAt: "2026-08-17T09:50:00.000Z",
          addedByUserId: "",
          orderAttachmentId: "att-a",
        },
        {
          id: "oa-att-b",
          name: "image.png",
          mime: "image/png",
          size: 31000,
          dataUrl: "/api/orders/ord-1/attachments/att-b",
          addedAt: "2026-08-17T09:51:00.000Z",
          addedByUserId: "",
          orderAttachmentId: "att-b",
        },
      ],
    });
    mergeOrderAttachmentsIntoLinkedCard(
      card,
      "ord-1",
      row([
        {
          id: "att-a",
          fileName: "image.png",
          mimeType: "image/png",
          size: 28000,
          createdAt: "2026-08-17T09:50:00.000Z",
        },
      ]),
    );
    expect(card.files.map((f) => f.orderAttachmentId)).toEqual(["att-a", "att-b"]);
  });

  it("пустой снимок не стирает уже подтянутые вложения наряда", () => {
    const card = createCard({
      id: "c3",
      title: "тест",
      files: [
        {
          id: "oa-att-a",
          name: "снимок.png",
          mime: "image/png",
          size: 100,
          dataUrl: "/api/orders/ord-1/attachments/att-a",
          addedAt: "2026-08-17T09:50:00.000Z",
          addedByUserId: "",
          orderAttachmentId: "att-a",
        },
      ],
    });
    mergeOrderAttachmentsIntoLinkedCard(card, "ord-1", row([]));
    expect(card.files).toHaveLength(1);
    expect(card.files[0]!.orderAttachmentId).toBe("att-a");
  });
});
