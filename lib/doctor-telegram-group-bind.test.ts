import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("doctor telegram group bind token", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("create + verify roundtrip", async () => {
    const { createDoctorTelegramGroupBindToken, verifyDoctorTelegramGroupBindToken } =
      await import("./doctor-telegram-group-bind");
    const t = createDoctorTelegramGroupBindToken("tenantabc", "doctorxyz");
    expect(t).toBeTruthy();
    const v = verifyDoctorTelegramGroupBindToken(t!);
    expect(v).toEqual({
      ok: true,
      tenantId: "tenantabc",
      doctorId: "doctorxyz",
    });
  });

  it("rejects tampered token", async () => {
    const { createDoctorTelegramGroupBindToken, verifyDoctorTelegramGroupBindToken } =
      await import("./doctor-telegram-group-bind");
    const t = createDoctorTelegramGroupBindToken("tenantabc", "doctorxyz")!;
    const broken = t.replace(/doctorxyz/, "doctorAAA");
    expect(verifyDoctorTelegramGroupBindToken(broken).ok).toBe(false);
  });
});
