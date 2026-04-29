import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  telegramIdString,
  verifyTelegramWidgetAuth,
} from "./telegram-widget";

function signLoginWidget(botToken: string, fields: Record<string, string | number>) {
  const dataCheckString = Object.keys(fields)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const sk = crypto.createHash("sha256").update(botToken, "utf8").digest();
  return crypto.createHmac("sha256", sk).update(dataCheckString).digest("hex");
}

describe("verifyTelegramWidgetAuth", () => {
  it("принимает корректную подпись", () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const auth_date = Math.floor(Date.now() / 1000);
    const fields = {
      id: 42,
      first_name: "Test",
      auth_date,
    };
    const hash = signLoginWidget(botToken, fields);
    const raw = { ...fields, hash };
    const out = verifyTelegramWidgetAuth(raw, botToken);
    expect(out).not.toBeNull();
    expect(out!.id).toBe(42);
    expect(telegramIdString(out!.id)).toBe("42");
  });

  it("отклоняет неверный hash", () => {
    const botToken = "secret-token";
    const raw = {
      id: 1,
      auth_date: Math.floor(Date.now() / 1000),
      hash: "deadbeef",
    };
    expect(verifyTelegramWidgetAuth(raw, botToken)).toBeNull();
  });
});
