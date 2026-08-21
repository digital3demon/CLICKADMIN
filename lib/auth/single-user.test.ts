import { afterEach, describe, expect, it } from "vitest";
import { isSingleUserBlockedInProduction, isSingleUserPortable } from "./single-user";

describe("single-user production guard", () => {
  const prevNode = process.env.NODE_ENV;
  const prevPublic = process.env.NEXT_PUBLIC_CRM_SINGLE_USER;
  const prevCrm = process.env.CRM_SINGLE_USER;

  afterEach(() => {
    process.env.NODE_ENV = prevNode;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_CRM_SINGLE_USER;
    else process.env.NEXT_PUBLIC_CRM_SINGLE_USER = prevPublic;
    if (prevCrm === undefined) delete process.env.CRM_SINGLE_USER;
    else process.env.CRM_SINGLE_USER = prevCrm;
  });

  it("флаг в development не блокирует", () => {
    process.env.NODE_ENV = "development";
    process.env.CRM_SINGLE_USER = "1";
    expect(isSingleUserPortable()).toBe(true);
    expect(isSingleUserBlockedInProduction()).toBe(false);
  });

  it("флаг в production блокирует", () => {
    process.env.NODE_ENV = "production";
    process.env.CRM_SINGLE_USER = "1";
    expect(isSingleUserPortable()).toBe(true);
    expect(isSingleUserBlockedInProduction()).toBe(true);
  });

  it("без флага production открыт", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRM_SINGLE_USER;
    delete process.env.NEXT_PUBLIC_CRM_SINGLE_USER;
    expect(isSingleUserPortable()).toBe(false);
    expect(isSingleUserBlockedInProduction()).toBe(false);
  });
});
