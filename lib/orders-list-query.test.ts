import { describe, expect, it } from "vitest";
import {
  ordersListHref,
  parseOrdersListPage,
} from "./orders-list-query";

describe("parseOrdersListPage", () => {
  it("defaults empty and junk to 1", () => {
    expect(parseOrdersListPage(undefined)).toBe(1);
    expect(parseOrdersListPage("")).toBe(1);
    expect(parseOrdersListPage("abc")).toBe(1);
    expect(parseOrdersListPage("0")).toBe(1);
    expect(parseOrdersListPage("-2")).toBe(1);
  });

  it("parses 1-based integer", () => {
    expect(parseOrdersListPage("3")).toBe(3);
    expect(parseOrdersListPage("2.9")).toBe(2);
  });
});

describe("ordersListHref page param", () => {
  it("omits page=1", () => {
    expect(ordersListHref({ page: 1, tag: "x" })).toBe("/orders?tag=x");
  });

  it("writes page>1 and drops cursor", () => {
    expect(ordersListHref({ page: 4, cursor: "abc", q: "петров" })).toBe(
      "/orders?page=4&q=%D0%BF%D0%B5%D1%82%D1%80%D0%BE%D0%B2",
    );
  });

  it("keeps cursor only when page is first", () => {
    expect(ordersListHref({ cursor: "abc" })).toBe("/orders?cursor=abc");
  });
});
