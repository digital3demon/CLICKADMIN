import { describe, expect, it } from "vitest";
import {
  getCrmListAlivePath,
  markCrmListAlive,
  subscribeCrmListAlive,
} from "@/lib/crm-module-list-alive";

describe("crm-module-list-alive", () => {
  it("пишет путь списка и зовёт подписчика; кириллица в пути не принимается как список", () => {
    markCrmListAlive(null);
    expect(getCrmListAlivePath()).toBeNull();
    let n = 0;
    const off = subscribeCrmListAlive(() => {
      n += 1;
    });
    markCrmListAlive("/orders");
    expect(getCrmListAlivePath()).toBe("/orders");
    expect(n).toBe(1);
    markCrmListAlive("/finance-office");
    expect(getCrmListAlivePath()).toBe("/finance-office");
    expect(n).toBe(2);
    markCrmListAlive("заказы");
    expect(getCrmListAlivePath()).toBeNull();
    expect(n).toBe(3);
    off();
    markCrmListAlive("/orders");
    expect(n).toBe(3);
    markCrmListAlive(null);
  });
});
