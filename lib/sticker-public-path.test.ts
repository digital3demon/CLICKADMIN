import { describe, expect, it } from "vitest";
import {
  isPublicStickerHubPath,
  stickerPublicClientPath,
  stickerPublicHubAbsoluteUrl,
  stickerPublicHubPath,
  stickerPublicStaffPath,
} from "@/lib/sticker-public-path";

describe("isPublicStickerHubPath", () => {
  it("распознаёт витрину по QR", () => {
    expect(isPublicStickerHubPath("/p/t/lab/s/tok")).toBe(true);
    expect(isPublicStickerHubPath("/p/t/lab/s/tok/staff")).toBe(true);
    expect(isPublicStickerHubPath("/orders")).toBe(false);
  });
});

describe("stickerPublicHubPath", () => {
  it("кодирует slug и token", () => {
    expect(stickerPublicHubPath("my-lab", "abc123")).toBe(
      "/p/t/my-lab/s/abc123",
    );
  });
});

describe("stickerPublicClientPath", () => {
  it("добавляет /client (совместимость, редирект на витрину)", () => {
    expect(stickerPublicClientPath("x", "y")).toBe("/p/t/x/s/y/client");
  });
});

describe("stickerPublicStaffPath", () => {
  it("добавляет /staff", () => {
    expect(stickerPublicStaffPath("lab", "tok")).toBe("/p/t/lab/s/tok/staff");
  });
});

describe("stickerPublicHubAbsoluteUrl", () => {
  it("склеивает origin без лишнего слэша", () => {
    expect(stickerPublicHubAbsoluteUrl("https://crm.example/", "lab", "tok")).toBe(
      "https://crm.example/p/t/lab/s/tok",
    );
  });
});
