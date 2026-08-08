import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTelegramWebAppInitData } from "./telegram-webapp-init-data";

function signWebAppInitData(
  botToken: string,
  fields: Record<string, string>,
): string {
  const pairs = Object.keys(fields)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${fields[k]}`);
  const dataCheckString = pairs.join("\n");
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const hash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

describe("verifyTelegramWebAppInitData", () => {
  const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

  it("принимает корректную подпись", () => {
    const auth_date = String(Math.floor(Date.now() / 1000));
    const user = JSON.stringify({
      id: 42,
      first_name: "Test",
      username: "tester",
    });
    const initData = signWebAppInitData(botToken, {
      auth_date,
      user,
      start_param: "o_or_abc",
    });
    const out = verifyTelegramWebAppInitData(initData, botToken);
    expect(out).not.toBeNull();
    expect(out!.userId).toBe(42);
    expect(out!.username).toBe("tester");
    expect(out!.startParam).toBe("o_or_abc");
  });

  it("отклоняет неверный hash", () => {
    const auth_date = String(Math.floor(Date.now() / 1000));
    const user = JSON.stringify({ id: 1 });
    const params = new URLSearchParams({
      auth_date,
      user,
      hash: "deadbeef",
    });
    expect(verifyTelegramWebAppInitData(params.toString(), botToken)).toBeNull();
  });

  it("отклоняет просроченный auth_date", () => {
    const auth_date = String(Math.floor(Date.now() / 1000) - 90_000);
    const user = JSON.stringify({ id: 7 });
    const initData = signWebAppInitData(botToken, { auth_date, user });
    expect(verifyTelegramWebAppInitData(initData, botToken)).toBeNull();
  });
});
