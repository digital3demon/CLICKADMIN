import { describe, expect, it } from "vitest";
import {
  CRM_MODULE_LIST_SNAPSHOT_MAX_ROWS,
  CRM_MODULE_LIST_SNAPSHOT_TTL_MS,
  compactCrmModuleListRows,
  crmModuleListKeepAlivePath,
  crmModuleListSnapshotKey,
  crmModuleTitleForPath,
  parseCrmModuleListSnapshot,
} from "@/lib/crm-module-list-snapshot";

describe("crmModuleListSnapshotKey", () => {
  it("ключ стабилен при кириллице в query до и после искомого слова", () => {
    const raw = crmModuleListSnapshotKey(
      "/orders/",
      "from=2026-01-01&q=клиника Иванов после",
    );
    const encoded = crmModuleListSnapshotKey(
      "/orders",
      `q=${encodeURIComponent("клиника Иванов после")}&from=2026-01-01`,
    );
    expect(raw).toBe(encoded);
    const q = new URLSearchParams(raw.slice(raw.indexOf("?") + 1));
    expect(q.get("q")).toBe("клиника Иванов после");
    expect(q.get("from")).toBe("2026-01-01");
  });

  it("пустой query не оставляет ?", () => {
    expect(crmModuleListSnapshotKey("/finance-office", "")).toBe("/finance-office");
    expect(crmModuleListSnapshotKey("/finance-office?", "?")).toBe("/finance-office");
  });
});

describe("parseCrmModuleListSnapshot", () => {
  it("пустой и битый JSON — нет снимка", () => {
    expect(parseCrmModuleListSnapshot("")).toBeNull();
    expect(parseCrmModuleListSnapshot("   ")).toBeNull();
    expect(parseCrmModuleListSnapshot("{}")).toBeNull();
    expect(parseCrmModuleListSnapshot("не json")).toBeNull();
  });

  it("протухший TTL отбрасывается", () => {
    const now = 1_777_000_000_000;
    const stale = JSON.stringify({
      savedAt: now - CRM_MODULE_LIST_SNAPSHOT_TTL_MS - 1,
      rows: [{ id: "1", orderNumber: "10" }],
    });
    const fresh = JSON.stringify({
      savedAt: now - 1000,
      rows: [{ id: "1", orderNumber: "10", patientName: "Иванов" }],
    });
    expect(parseCrmModuleListSnapshot(stale, now)).toBeNull();
    expect(parseCrmModuleListSnapshot(fresh, now)?.rows[0]?.patientName).toBe(
      "Иванов",
    );
  });
});

describe("compactCrmModuleListRows", () => {
  it("режет пустые id и длинный список", () => {
    const rows = [
      { id: "", orderNumber: "x" },
      ...Array.from({ length: CRM_MODULE_LIST_SNAPSHOT_MAX_ROWS + 5 }, (_, i) => ({
        id: `id-${i}`,
        orderNumber: String(i),
      })),
    ];
    expect(compactCrmModuleListRows(rows)).toHaveLength(
      CRM_MODULE_LIST_SNAPSHOT_MAX_ROWS,
    );
  });
});

describe("crmModuleListKeepAlivePath", () => {
  it("списки да, карточка наряда нет; кириллица в query не меняет путь", () => {
    expect(crmModuleListKeepAlivePath("/finance-office")).toBe("/finance-office");
    expect(crmModuleListKeepAlivePath("/orders")).toBe("/orders");
    expect(crmModuleListKeepAlivePath("/orders/abc")).toBeNull();
    expect(crmModuleListKeepAlivePath("/orders/history")).toBeNull();
    expect(crmModuleListKeepAlivePath("/kanban")).toBeNull();
  });
});

describe("crmModuleTitleForPath", () => {
  it("заголовки списков", () => {
    expect(crmModuleTitleForPath("/finance-office?tab=all")).toBe("ФинОтдел");
    expect(crmModuleTitleForPath("/orders")).toBe("Заказы");
  });
});
