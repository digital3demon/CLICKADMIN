import { describe, expect, it } from "vitest";
import {
  diskRelFromS3Pointer,
  localRelFromS3ObjectKey,
  zipRelFromS3ObjectKey,
} from "./s3-key-to-disk";

describe("localRelFromS3ObjectKey", () => {
  it("мапит ключи и кириллицу в id", () => {
    expect(localRelFromS3ObjectKey("orders/наряд-1/attachments/a1")).toEqual({
      rootId: "order-attachments",
      rel: "orders/наряд-1/a1",
    });
    expect(
      localRelFromS3ObjectKey("tenants/t1/mail/e1/attachments/f1")?.rel,
    ).toBe("tenants/t1/mail/e1/f1");
    expect(zipRelFromS3ObjectKey("clickmig/t1/файл")).toBe(
      "files/clickmig-files/t1/файл",
    );
    expect(diskRelFromS3Pointer("s3:orders/o1/attachments/a1")).toBe(
      "orders/o1/a1",
    );
    expect(localRelFromS3ObjectKey("crm-dumps/x")).toBeNull();
  });
});
