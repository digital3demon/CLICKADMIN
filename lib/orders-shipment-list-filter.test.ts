import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  compareOrdersByEffectiveAppointment,
  effectiveAppointmentDate,
  orderMatchesShipmentActualAppointment,
  orderMatchesShipmentPeriodAppointment,
  ordersShipmentActualAppointmentRange,
  ordersShipmentActualEndExclusive,
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
    };
    const newer = {
      id: "b",
      orderNumber: "2606-002",
      appointmentDate: new Date("2026-07-08T10:00:00.000Z"),
      dueToAdminsAt: null,
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
    };
    expect(compareOrdersByEffectiveAppointment(noDate, dated)).toBeLessThan(0);
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
