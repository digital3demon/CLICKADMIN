import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_PG_SCHEMA,
  getDemoDatabaseUrl,
  withPostgresSchema,
} from "@/lib/prisma-demo";

describe("withPostgresSchema", () => {
  it("ставит schema=crm_demo", () => {
    expect(
      withPostgresSchema(
        "postgresql://u:p@localhost:5432/db",
        DEMO_PG_SCHEMA,
      ),
    ).toBe(`postgresql://u:p@localhost:5432/db?schema=${DEMO_PG_SCHEMA}`);
  });

  it("заменяет уже заданный schema", () => {
    expect(
      withPostgresSchema(
        "postgresql://u:p@localhost:5432/db?schema=public&connection_limit=5",
        DEMO_PG_SCHEMA,
      ),
    ).toBe(
      `postgresql://u:p@localhost:5432/db?schema=${DEMO_PG_SCHEMA}&connection_limit=5`,
    );
  });
});

describe("getDemoDatabaseUrl", () => {
  const prevDemo = process.env.DEMO_DATABASE_URL;
  const prevMain = process.env.DATABASE_URL;

  afterEach(() => {
    if (prevDemo === undefined) delete process.env.DEMO_DATABASE_URL;
    else process.env.DEMO_DATABASE_URL = prevDemo;
    if (prevMain === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevMain;
  });

  it("игнорирует file: DEMO_DATABASE_URL при postgres DATABASE_URL", () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@localhost:5432/db?schema=public";
    process.env.DEMO_DATABASE_URL = "file:./prisma/demo.db";
    expect(getDemoDatabaseUrl()).toContain(`schema=${DEMO_PG_SCHEMA}`);
    expect(getDemoDatabaseUrl().startsWith("postgresql://")).toBe(true);
  });

  it("на том же postgres-хосте всегда schema=crm_demo, даже если DEMO_DATABASE_URL=public", () => {
    process.env.DATABASE_URL =
      "postgresql://u:p@localhost:5432/db?schema=public";
    process.env.DEMO_DATABASE_URL =
      "postgresql://u:p@localhost:5432/db?schema=public";
    expect(getDemoDatabaseUrl()).toBe(
      `postgresql://u:p@localhost:5432/db?schema=${DEMO_PG_SCHEMA}`,
    );
  });
});
