import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_NO_RECEPTION_HM,
  APPOINTMENT_WHOLE_DAY_LABEL,
  appointmentCompactTimeLabel,
  appointmentHasTimeFlag,
  appointmentTimeModeFromLocal,
  replaceAppointmentLocalHm,
  resolveAppointmentTimeMode,
} from "@/lib/appointment-time-mode";
import { DUE_DAY_DEFAULT_HM } from "@/lib/order-due-datetime";

describe("resolveAppointmentTimeMode", () => {
  it("timed when hasTime", () => {
    expect(resolveAppointmentTimeMode(true, "08:00")).toBe("timed");
    expect(resolveAppointmentTimeMode(true, "12:00")).toBe("timed");
  });

  it("noReception when !hasTime and 08:00", () => {
    expect(resolveAppointmentTimeMode(false, APPOINTMENT_NO_RECEPTION_HM)).toBe(
      "noReception",
    );
  });

  it("wholeDay when !hasTime and not 08:00", () => {
    expect(resolveAppointmentTimeMode(false, DUE_DAY_DEFAULT_HM)).toBe(
      "wholeDay",
    );
    expect(resolveAppointmentTimeMode(false, "15:30")).toBe("wholeDay");
    expect(resolveAppointmentTimeMode(false, null)).toBe("wholeDay");
  });
});

describe("appointmentCompactTimeLabel", () => {
  it("shows ВТЧД / empty / clock", () => {
    expect(appointmentCompactTimeLabel("wholeDay", "12:00")).toBe(
      APPOINTMENT_WHOLE_DAY_LABEL,
    );
    expect(appointmentCompactTimeLabel("noReception", "08:00")).toBe("");
    expect(appointmentCompactTimeLabel("timed", "09:30")).toBe("09:30");
  });
});

describe("replaceAppointmentLocalHm", () => {
  it("keeps day, swaps time", () => {
    expect(replaceAppointmentLocalHm("2026-07-31T15:00", "08:00")).toBe(
      "2026-07-31T08:00",
    );
  });
});

describe("appointmentTimeModeFromLocal + flags", () => {
  it("round-trips wholeDay vs noReception", () => {
    expect(
      appointmentTimeModeFromLocal(false, "2026-07-31T12:00"),
    ).toBe("wholeDay");
    expect(
      appointmentTimeModeFromLocal(false, "2026-07-31T08:00"),
    ).toBe("noReception");
    expect(appointmentHasTimeFlag("timed")).toBe(true);
    expect(appointmentHasTimeFlag("wholeDay")).toBe(false);
    expect(appointmentHasTimeFlag("noReception")).toBe(false);
  });
});
