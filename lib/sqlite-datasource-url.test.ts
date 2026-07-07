import { describe, expect, it } from "vitest";
import {
  augmentSqliteDatasourceUrl,
  sqliteFileUrlPathOnly,
} from "./sqlite-datasource-url";

describe("sqliteFileUrlPathOnly", () => {
  it("убирает query", () => {
    expect(sqliteFileUrlPathOnly("file:./dev.db?socket_timeout=5")).toBe(
      "file:./dev.db",
    );
  });
});

describe("augmentSqliteDatasourceUrl", () => {
  it("добавляет параметры к file URL без query", () => {
    const u = augmentSqliteDatasourceUrl("file:./dev.db");
    expect(u.startsWith("file:./dev.db?")).toBe(true);
    expect(u).toContain("connection_limit=5");
    expect(u).toContain("socket_timeout=600");
  });

  it("не дублирует уже заданный socket_timeout", () => {
    const u = augmentSqliteDatasourceUrl("file:./a.db?socket_timeout=999");
    expect(u).toContain("socket_timeout=999");
    expect(u).not.toContain("socket_timeout=600");
  });

  it("добавляет connection_limit к postgres URL", () => {
    const u = augmentSqliteDatasourceUrl("postgresql://user:pass@host:5432/db");
    expect(u).toContain("connection_limit=5");
    expect(u).toContain("pool_timeout=30");
  });
});
