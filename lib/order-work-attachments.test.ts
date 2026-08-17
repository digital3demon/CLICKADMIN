import { describe, expect, it } from "vitest";
import { OrderAttachmentScope } from "@prisma/client";
import {
  isOrderWorkAttachment,
  orderAttachmentLooksLikeImage,
  orderWorkAttachmentToChatImage,
} from "@/lib/order-work-attachments";

describe("isOrderWorkAttachment", () => {
  it("прячет счёт, платёжку и скан сканера", () => {
    expect(
      isOrderWorkAttachment(
        { id: "inv", scope: OrderAttachmentScope.GENERAL },
        "inv",
      ),
    ).toBe(false);
    expect(
      isOrderWorkAttachment(
        { id: "p", scope: OrderAttachmentScope.PAYMENT_SLIP },
        null,
      ),
    ).toBe(false);
    expect(
      isOrderWorkAttachment(
        { id: "s", scope: OrderAttachmentScope.SCANNER },
        null,
      ),
    ).toBe(false);
    expect(
      isOrderWorkAttachment(
        { id: "ok", scope: OrderAttachmentScope.GENERAL },
        null,
      ),
    ).toBe(true);
  });
});

describe("orderAttachmentLooksLikeImage", () => {
  it("видит png при octet-stream и кириллице в имени", () => {
    expect(
      orderAttachmentLooksLikeImage({
        mimeType: "application/octet-stream",
        fileName: "снимок image.png",
      }),
    ).toBe(true);
    expect(
      orderAttachmentLooksLikeImage({
        mimeType: "application/pdf",
        fileName: "счёт.pdf",
      }),
    ).toBe(false);
  });
});

describe("orderWorkAttachmentToChatImage", () => {
  it("строит url по id, не по имени — два image.png не схлопываются", () => {
    const a = orderWorkAttachmentToChatImage("ord-1", {
      id: "att-a",
      fileName: "image.png",
      mimeType: "image/png",
      size: 10,
      createdAt: "2026-08-17T09:50:00.000Z",
    });
    const b = orderWorkAttachmentToChatImage("ord-1", {
      id: "att-b",
      fileName: "image.png",
      mimeType: "image/png",
      size: 11,
      createdAt: "2026-08-17T09:51:00.000Z",
    });
    expect(a?.id).toBe("oa-att-a");
    expect(b?.id).toBe("oa-att-b");
    expect(a?.url).toContain("/attachments/att-a");
    expect(b?.url).toContain("/attachments/att-b");
  });
});
