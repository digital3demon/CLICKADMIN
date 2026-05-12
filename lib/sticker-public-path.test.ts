import { describe, expect, it } from "vitest";
import {
  stickerPublicClientPath,
  stickerPublicHubAbsoluteUrl,
  stickerPublicHubPath,
} from "@/lib/sticker-public-path";

describe("stickerPublicHubPath", () => {
  it("кодирует slug и token", () => {
    expect(stickerPublicHubPath("my-lab", "abc123")).toBe(
      "/p/t/my-lab/s/abc123",
    );
  });
});

describe("stickerPublicClientPath", () => {
  it("добавляет /client", () => {
    expect(stickerPublicClientPath("x", "y")).toBe("/p/t/x/s/y/client");
  });
});

describe("stickerPublicHubAbsoluteUrl", () => {
  it("склеивает origin без лишнего слэша", () => {
    expect(stickerPublicHubAbsoluteUrl("https://crm.example/", "lab", "tok")).toBe(
      "https://crm.example/p/t/lab/s/tok",
    );
  });
});
