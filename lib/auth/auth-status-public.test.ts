import { describe, expect, it } from "vitest";
import { authStatusPublicJson } from "./auth-status-public";

describe("authStatusPublicJson", () => {
  it("не отдаёт userCount", () => {
    const j = authStatusPublicJson({ needsBootstrap: false });
    expect(j).toEqual({ needsBootstrap: false });
    expect(j).not.toHaveProperty("userCount");
  });

  it("пустая БД — только needsBootstrap", () => {
    expect(authStatusPublicJson({ needsBootstrap: true })).toEqual({
      needsBootstrap: true,
    });
  });

  it("single-user не светит численность", () => {
    expect(authStatusPublicJson({ needsBootstrap: true, singleUser: true })).toEqual({
      needsBootstrap: false,
      singleUser: true,
    });
  });
});
