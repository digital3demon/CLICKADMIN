import { describe, expect, it } from "vitest";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import { ORDER_DRAFT_SNAPSHOT_VERSION } from "@/lib/order-draft-snapshot";
import { computeAiMissingFields } from "./OrderAiPrefillPanel";

describe("computeAiMissingFields", () => {
  it("marks empty draft fields as missing", () => {
    expect(
      computeAiMissingFields({
        version: ORDER_DRAFT_SNAPSHOT_VERSION,
        activeTab: "Заказ",
        clinicId: "",
        doctorId: "",
        legalEntity: "Выбрать из списка",
        payment: "Не оплачено",
        patientName: "",
        clientOrderText: "",
        comments: "",
        hasScans: false,
        hasCt: false,
        hasMri: false,
        hasPhoto: false,
        additionalSourceNotes: "",
        urgentSelection: "unset",
        labWorkStatus: "к исполнению",
        workDueLocal: "",
        patientAppointmentLocal: "",
        labWholeDay: true,
        appointmentWholeDay: true,
        workReceivedLocal: "",
        quickOrder: { enabled: false, lines: [] },
        detailLines: [],
        bridgeLines: [],
        prosthetics: { providedByClient: [], fromStock: [] },
        correctionTrack: null,
        correctionReason: "",
        correctionPaid: false,
      }),
    ).toEqual(["doctor", "clinic", "patient", "clientOrder"]);
  });

  it("treats private clinic id as filled clinic", () => {
    expect(
      computeAiMissingFields({
        version: ORDER_DRAFT_SNAPSHOT_VERSION,
        activeTab: "Заказ",
        clinicId: ORDER_CLINIC_PRIVATE,
        doctorId: "doc-1",
        legalEntity: "Выбрать из списка",
        payment: "Не оплачено",
        patientName: "Иванов И.И.",
        clientOrderText: "Коронка 16",
        comments: "",
        hasScans: false,
        hasCt: false,
        hasMri: false,
        hasPhoto: false,
        additionalSourceNotes: "",
        urgentSelection: "unset",
        labWorkStatus: "к исполнению",
        workDueLocal: "",
        patientAppointmentLocal: "",
        labWholeDay: true,
        appointmentWholeDay: true,
        workReceivedLocal: "",
        quickOrder: { enabled: false, lines: [] },
        detailLines: [],
        bridgeLines: [],
        prosthetics: { providedByClient: [], fromStock: [] },
        correctionTrack: null,
        correctionReason: "",
        correctionPaid: false,
      }),
    ).toEqual([]);
  });
});
