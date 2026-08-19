import { describe, expect, it } from "vitest";
import {
  buildOrdersListPageItems,
  buildOrdersListPageItemsUnknownTotal,
} from "./orders-list-page-items";

const href = (p: number) => `/orders?page=${p}`;

describe("buildOrdersListPageItems", () => {
  it("returns empty when one page", () => {
    expect(buildOrdersListPageItems(1, 1, href)).toEqual([]);
  });

  it("lists all pages when they fit the window", () => {
    const pages = buildOrdersListPageItems(5, 3, href)
      .filter((x) => x.kind === "page")
      .map((x) => (x.kind === "page" ? x.page : null));
    expect(pages).toEqual([1, 2, 3, 4, 5]);
  });

  it("puts gaps between first, window and last", () => {
    const items = buildOrdersListPageItems(20, 10, href);
    const kinds = items.map((x) =>
      x.kind === "gap" ? "…" : String(x.page),
    );
    expect(kinds).toEqual(["1", "…", "8", "9", "10", "11", "12", "…", "20"]);
    const current = items.find((x) => x.kind === "page" && x.current);
    expect(current).toMatchObject({ kind: "page", page: 10, href: "/orders?page=10" });
  });

  it("clamps current to last page", () => {
    const current = buildOrdersListPageItems(4, 99, href).find(
      (x) => x.kind === "page" && x.current,
    );
    expect(current).toMatchObject({ kind: "page", page: 4 });
  });
});

describe("buildOrdersListPageItemsUnknownTotal", () => {
  it("returns empty on first page without more", () => {
    expect(buildOrdersListPageItemsUnknownTotal(1, false, href)).toEqual([]);
  });

  it("shows next page when hasMore", () => {
    const pages = buildOrdersListPageItemsUnknownTotal(1, true, href)
      .filter((x) => x.kind === "page")
      .map((x) => (x.kind === "page" ? x.page : null));
    expect(pages).toEqual([1, 2]);
  });

  it("shows gap back to 1 from a far page", () => {
    const kinds = buildOrdersListPageItemsUnknownTotal(8, true, href).map(
      (x) => (x.kind === "gap" ? "…" : String(x.page)),
    );
    expect(kinds).toEqual(["1", "…", "7", "8", "9"]);
  });
});
