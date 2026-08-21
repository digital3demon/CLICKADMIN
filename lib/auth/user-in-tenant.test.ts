import { describe, expect, it } from "vitest";
import { userInTenantWhere } from "./user-in-tenant";

describe("userInTenantWhere", () => {
  it("свой tenant", () => {
    expect(userInTenantWhere("u1", "t-lab")).toEqual({
      id: "u1",
      tenantId: "t-lab",
    });
  });

  it("чужой tenant не совпадает с where", () => {
    const mine = userInTenantWhere("u1", "t-lab");
    const theirs = userInTenantWhere("u1", "t-other");
    expect(mine).not.toEqual(theirs);
  });

  it("без tid — не искать по id", () => {
    expect(userInTenantWhere("u1", undefined)).toBeNull();
    expect(userInTenantWhere("u1", "  ")).toBeNull();
  });
});
