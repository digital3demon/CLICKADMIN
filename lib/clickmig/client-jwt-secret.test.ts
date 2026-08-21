import { afterEach, describe, expect, it } from "vitest";
import { clickMigClientJwtSecretSource } from "./client-jwt-secret";

describe("clickMigClientJwtSecretSource", () => {
  const prevNode = process.env.NODE_ENV;
  const prevAuth = process.env.AUTH_SECRET;
  const prevCm = process.env.CLICKMIG_CLIENT_JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = prevNode;
    if (prevAuth === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevAuth;
    if (prevCm === undefined) delete process.env.CLICKMIG_CLIENT_JWT_SECRET;
    else process.env.CLICKMIG_CLIENT_JWT_SECRET = prevCm;
  });

  it("в production без секрета падает", () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_SECRET;
    delete process.env.CLICKMIG_CLIENT_JWT_SECRET;
    expect(() => clickMigClientJwtSecretSource()).toThrow(/AUTH_SECRET/);
  });

  it("хватает AUTH_SECRET", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_SECRET = "sixteen-chars-ok";
    delete process.env.CLICKMIG_CLIENT_JWT_SECRET;
    expect(clickMigClientJwtSecretSource()).toBe("sixteen-chars-ok");
  });
});
