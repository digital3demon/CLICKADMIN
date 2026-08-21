import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeS3ObjectKey,
  resolvePathUnderRoot,
} from "./storage-path-safe";

describe("assertSafeS3ObjectKey", () => {
  it("пускает ключи приложения", () => {
    expect(assertSafeS3ObjectKey("orders/o1/attachments/a1")).toBe(
      "orders/o1/attachments/a1",
    );
    expect(assertSafeS3ObjectKey("tenants/t1/mail/e1/attachments/a1")).toContain(
      "tenants/",
    );
    expect(assertSafeS3ObjectKey("clickmig/t1/f1")).toContain("clickmig/");
    expect(assertSafeS3ObjectKey("crm-dumps/t1/2026-01/x.zip")).toContain(
      "crm-dumps/",
    );
  });

  it("режет обход и чужой префикс", () => {
    expect(() => assertSafeS3ObjectKey("../secret")).toThrow();
    expect(() => assertSafeS3ObjectKey("orders/../tenants/x")).toThrow();
    expect(() => assertSafeS3ObjectKey("/orders/x")).toThrow();
    expect(() => assertSafeS3ObjectKey("etc/passwd")).toThrow();
  });
});

describe("resolvePathUnderRoot", () => {
  const root = path.join(process.cwd(), "data", "order-attachments");

  it("собирает путь внутри корня", () => {
    const abs = resolvePathUnderRoot(root, "orders/o1/a1");
    expect(abs.startsWith(path.resolve(root))).toBe(true);
    expect(abs).toContain("o1");
  });

  it("не пускает .. и абсолютный rel", () => {
    expect(() => resolvePathUnderRoot(root, "../outside")).toThrow();
    expect(() => resolvePathUnderRoot(root, "orders/../../etc/passwd")).toThrow();
    expect(() => resolvePathUnderRoot(root, "/etc/passwd")).toThrow();
  });
});
