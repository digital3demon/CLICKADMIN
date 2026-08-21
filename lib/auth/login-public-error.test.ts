import { afterEach, describe, expect, it } from "vitest";
import { loginPublicServerErrorMessage } from "./login-public-error";

describe("loginPublicServerErrorMessage", () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prev;
  });

  it("в production прячет migrate/пути", () => {
    process.env.NODE_ENV = "production";
    const msg = loginPublicServerErrorMessage(
      "npx prisma migrate deploy --schema=prisma/schema.prisma",
    );
    expect(msg).not.toMatch(/prisma|migrate|schema\.prisma/i);
    expect(msg).toContain("Ошибка входа");
  });

  it("в development оставляет подробность", () => {
    process.env.NODE_ENV = "development";
    expect(loginPublicServerErrorMessage("деталь")).toBe("деталь");
  });
});
