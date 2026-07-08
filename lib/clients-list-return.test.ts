import { describe, expect, it } from "vitest";
import { resolveClientsBackHref } from "./clients-list-return";

describe("resolveClientsBackHref", () => {
  it("предпочитает returnTo из query", () => {
    expect(
      resolveClientsBackHref(
        "/clients?view=clinic&clinicSort=doctors&clinicDir=desc",
      ),
    ).toBe("/clients?view=clinic&clinicSort=doctors&clinicDir=desc");
  });

  it("отклоняет небезопасный returnTo", () => {
    expect(resolveClientsBackHref("//evil.example")).toBe("/clients");
  });
});
