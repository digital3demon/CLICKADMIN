import { parseCardTypesSnapshot, parseCompositionSnapshot } from "@/lib/work-examples/composition-snapshot";
import type { WorkExampleCompositionLine } from "@/lib/work-examples/constants";

const PII_KEY =
  /^(orderNumber|patientName|doctorName|doctorId|clinicId|clinicName|surname|фамилия|deletedBy|createdBy|orderId|tenantId|cloudUrlDeleted|shareToken)$/i;

export type PublicWorkExampleView = {
  cardTypes: Array<{ id: string; name: string }>;
  composition: WorkExampleCompositionLine[];
  cloudUrl: string | null;
  technicianNotes: string;
  doctorComments: string;
  files: Array<{
    id: string;
    kind: "PHOTO" | "CAD" | "FILE";
    fileName: string;
    mime: string;
    sizeBytes: number;
  }>;
};

export function buildPublicWorkExampleView(input: {
  cardTypes: unknown;
  compositionSnapshot: unknown;
  cloudUrl: string | null | undefined;
  cloudUrlDeletedAt?: Date | null;
  technicianNotes?: string | null;
  doctorComments?: string | null;
  files: Array<{
    id: string;
    kind: string;
    fileName: string;
    mime: string;
    sizeBytes: number;
    deletedAt?: Date | null;
  }>;
}): PublicWorkExampleView {
  const cloudUrl =
    input.cloudUrlDeletedAt || !String(input.cloudUrl || "").trim()
      ? null
      : String(input.cloudUrl).trim();
  return {
    cardTypes: parseCardTypesSnapshot(input.cardTypes),
    composition: parseCompositionSnapshot(input.compositionSnapshot),
    cloudUrl,
    technicianNotes: String(input.technicianNotes || "").slice(0, 4000),
    doctorComments: String(input.doctorComments || "").slice(0, 4000),
    files: input.files
      .filter((f) => !f.deletedAt)
      .map((f) => ({
        id: f.id,
        kind:
          f.kind === "PHOTO" || f.kind === "CAD" || f.kind === "FILE"
            ? f.kind
            : "FILE",
        fileName: String(f.fileName || "файл").slice(0, 240),
        mime: String(f.mime || "application/octet-stream"),
        sizeBytes: Math.max(0, Number(f.sizeBytes) || 0),
      })),
  };
}

/** Страховка: в JSON витрины нет ключей ПИИ. */
export function publicWorkExampleViewHasPii(view: unknown): boolean {
  const walk = (v: unknown): boolean => {
    if (!v) return false;
    if (Array.isArray(v)) return v.some(walk);
    if (typeof v !== "object") return false;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (PII_KEY.test(k)) return true;
      if (walk(val)) return true;
    }
    return false;
  };
  return walk(view);
}
