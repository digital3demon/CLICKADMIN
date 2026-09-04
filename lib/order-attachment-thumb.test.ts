import { describe, expect, it } from "vitest";
import {
  isOrderAttachmentThumbRequest,
  withOrderAttachmentThumb,
} from "@/lib/order-attachment-thumb";

describe("order-attachment-thumb", () => {
  it("query thumb=1", () => {
    expect(isOrderAttachmentThumbRequest("thumb=1")).toBe(true);
    expect(isOrderAttachmentThumbRequest("?thumb=1&inline=1")).toBe(true);
    expect(isOrderAttachmentThumbRequest("inline=1")).toBe(false);
  });

  it("withOrderAttachmentThumb для API и data:", () => {
    expect(
      withOrderAttachmentThumb("/api/orders/ord-степанов/attachments/a1"),
    ).toBe("/api/orders/ord-степанов/attachments/a1?thumb=1");
    expect(
      withOrderAttachmentThumb(
        "/api/orders/x/kaiten/files/12?foo=1",
      ),
    ).toBe("/api/orders/x/kaiten/files/12?foo=1&thumb=1");
    expect(withOrderAttachmentThumb("data:image/png;base64,xx")).toBe(
      "data:image/png;base64,xx",
    );
  });
});
