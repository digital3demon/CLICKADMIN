import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  compareOrdersByEffectiveAppointment,
  effectiveAppointmentDate,
  orderMatchesShipmentActualAppointment,
  orderMatchesShipmentPeriodAppointment,
  ordersShipmentActualAppointmentRange,
  ordersShipmentActualEndExclusive,
  ordersAppointmentDateWhere,
  ordersShipmentListWhere,
} from "./orders-shipment-list-filter";
import {
  moscowDayBoundsUtc,
  moscowShipmentDayBoundsUtc,
  moscowTomorrowYmd,
} from "./shipments-date-range";

describe("effectiveAppointmentDate", () => {
  it("prefers appointmentDate over dueToAdminsAt", () => {
    const appt = new Date("2026-06-01T10:00:00.000Z");
    const due = new Date("2026-06-02T10:00:00.000Z");
    expect(
      effectiveAppointmentDate({ appointmentDate: appt, dueToAdminsAt: due }),
    ).toEqual(appt);
  });

  it("falls back to dueToAdminsAt", () => {
    const due = new Date("2026-06-02T10:00:00.000Z");
    expect(
      effectiveAppointmentDate({ appointmentDate: null, dueToAdminsAt: due }),
    ).toEqual(due);
  });
});

describe("compareOrdersByEffectiveAppointment", () => {
  it("sorts older appointments first", () => {
    const older = {
      id: "a",
      orderNumber: "2606-001",
      appointmentDate: new Date("2026-06-01T10:00:00.000Z"),
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    const newer = {
      id: "b",
      orderNumber: "2606-002",
      appointmentDate: new Date("2026-07-08T10:00:00.000Z"),
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    expect(compareOrdersByEffectiveAppointment(older, newer)).toBeLessThan(0);
  });

  it("puts rows without date at the top", () => {
    const noDate = {
      id: "a",
      orderNumber: "2606-001",
      appointmentDate: null,
      dueToAdminsAt: null,
    };
    const dated = {
      id: "b",
      orderNumber: "2606-002",
      appointmentDate: new Date("2026-06-01T10:00:00.000Z"),
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    expect(compareOrdersByEffectiveAppointment(noDate, dated)).toBeLessThan(0);
  });

  it("same day: timed ascending, then ВТЧД, then noReception", () => {
    const day = "2026-08-07";
    const timed1400 = {
      id: "t14",
      orderNumber: "2608-014",
      appointmentDate: new Date(`${day}T11:00:00.000Z`), // 14:00 МСК
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    const timed0900 = {
      id: "t09",
      orderNumber: "2608-009",
      appointmentDate: new Date(`${day}T06:00:00.000Z`), // 09:00 МСК
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    const wholeDay = {
      id: "wd",
      orderNumber: "2608-012",
      appointmentDate: new Date(`${day}T09:00:00.000Z`), // 12:00 МСК
      dueToAdminsAt: null,
      dueToAdminsHasTime: false,
    };
    const noReception = {
      id: "nr",
      orderNumber: "2608-008",
      appointmentDate: new Date(`${day}T05:00:00.000Z`), // 08:00 МСК
      dueToAdminsAt: null,
      dueToAdminsHasTime: false,
    };
    const sorted = [timed1400, wholeDay, noReception, timed0900].sort(
      compareOrdersByEffectiveAppointment,
    );
    expect(sorted.map((x) => x.id)).toEqual(["t09", "t14", "wd", "nr"]);
  });

  it("orders by Moscow calendar day before time-of-day", () => {
    const aug8 = {
      id: "a8",
      orderNumber: "2608-001",
      appointmentDate: new Date("2026-08-08T12:00:00.000Z"), // 15:00 МСК
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    const aug10 = {
      id: "a10",
      orderNumber: "2608-002",
      appointmentDate: new Date("2026-08-10T09:00:00.000Z"), // 12:00 МСК
      dueToAdminsAt: null,
      dueToAdminsHasTime: true,
    };
    expect(compareOrdersByEffectiveAppointment(aug8, aug10)).toBeLessThan(0);
  });
});

describe("ordersShipmentActualEndExclusive (финотдел / лаб)", () => {
  it("matches tomorrow shipment window end", () => {
    expect(ordersShipmentActualEndExclusive()).toEqual(
      moscowShipmentDayBoundsUtc(moscowTomorrowYmd()).endExclusive,
    );
  });
});

describe("ordersShipmentActualAppointmentRange", () => {
  it("Monday → Mon…Wed", () => {
    const w = ordersShipmentActualAppointmentRange("2026-07-27");
    expect(w.startYmd).toBe("2026-07-27");
    expect(w.endYmd).toBe("2026-07-29");
  });

  it("Friday → Fri…Tue (includes weekend)", () => {
    const w = ordersShipmentActualAppointmentRange("2026-07-31");
    expect(w.startYmd).toBe("2026-07-31");
    expect(w.endYmd).toBe("2026-08-04");
  });
});

describe("ordersAppointmentDateWhere", () => {
  it("окно записи без отсечки неотгруженных, кириллица не нужна в датах", () => {
    const where = ordersAppointmentDateWhere({
      mode: "period",
      shipFrom: "2026-05-07",
      shipTo: "2026-05-09",
    });
    const json = JSON.stringify(where);
    expect(json).toContain("appointmentDate");
    expect(json).not.toContain("adminShippedOtpr");
  });
});

describe("ordersShipmentListWhere", () => {
  it("always requires unshipped", () => {
    const where = ordersShipmentListWhere({
      mode: "actual",
      shipFrom: null,
      shipTo: null,
    });
    expect(JSON.stringify(where)).toContain("adminShippedOtpr");
    expect(JSON.stringify(where)).toContain("false");
  });

  it("builds period range with shipFrom and shipTo", () => {
    const where = ordersShipmentListWhere({
      mode: "period",
      shipFrom: "2026-07-01",
      shipTo: "2026-07-09",
    });
    expect(where).toHaveProperty("AND");
  });
});

describe("orderMatchesShipmentActualAppointment", () => {
  const { start, endExclusive } =
    ordersShipmentActualAppointmentRange("2026-07-27");

  it("includes appointments inside Mon–Wed window", () => {
    expect(
      orderMatchesShipmentActualAppointment(
        {
          appointmentDate: new Date("2026-07-28T10:00:00+03:00"),
          dueToAdminsAt: null,
        },
        start,
        endExclusive,
      ),
    ).toBe(true);
  });

  it("excludes appointments before today", () => {
    expect(
      orderMatchesShipmentActualAppointment(
        {
          appointmentDate: new Date("2026-07-26T10:00:00+03:00"),
          dueToAdminsAt: null,
        },
        start,
        endExclusive,
      ),
    ).toBe(false);
  });

  it("excludes appointments after window end", () => {
    expect(
      orderMatchesShipmentActualAppointment(
        {
          appointmentDate: new Date("2026-07-30T10:00:00+03:00"),
          dueToAdminsAt: null,
        },
        start,
        endExclusive,
      ),
    ).toBe(false);
  });

  it("includes rows without appointment date", () => {
    expect(
      orderMatchesShipmentActualAppointment(
        { appointmentDate: null, dueToAdminsAt: null },
        start,
        endExclusive,
      ),
    ).toBe(true);
  });
});

describe("orderMatchesShipmentPeriodAppointment", () => {
  const shipTo = "2026-07-09";
  const { endExclusive } = moscowDayBoundsUtc(shipTo);

  it("open-start period includes old appointments before shipTo", () => {
    const old = new Date("2026-01-01T10:00:00.000Z");
    expect(
      orderMatchesShipmentPeriodAppointment(
        { appointmentDate: old, dueToAdminsAt: null },
        null,
        endExclusive,
      ),
    ).toBe(true);
  });

  it("open-start period excludes appointments on or after shipTo+1", () => {
    expect(
      orderMatchesShipmentPeriodAppointment(
        { appointmentDate: endExclusive, dueToAdminsAt: null },
        null,
        endExclusive,
      ),
    ).toBe(false);
  });

  it("bounded period excludes appointments before shipFrom", () => {
    const { start } = moscowDayBoundsUtc("2026-07-01");
    const before = new Date(start.getTime() - 60_000);
    expect(
      orderMatchesShipmentPeriodAppointment(
        { appointmentDate: before, dueToAdminsAt: null },
        start,
        endExclusive,
      ),
    ).toBe(false);
  });

  it("bounded period includes appointments inside range", () => {
    const { start } = moscowDayBoundsUtc("2026-07-01");
    const inside = new Date(start.getTime() + 3_600_000);
    expect(
      orderMatchesShipmentPeriodAppointment(
        { appointmentDate: inside, dueToAdminsAt: null },
        start,
        endExclusive,
      ),
    ).toBe(true);
  });

  it("excludes rows without appointment date in period mode", () => {
    expect(
      orderMatchesShipmentPeriodAppointment(
        { appointmentDate: null, dueToAdminsAt: null },
        null,
        endExclusive,
      ),
    ).toBe(false);
  });
});
