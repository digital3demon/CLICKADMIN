import { workExampleDeletedCaption } from "@/lib/work-examples/deleted-caption";
import { parseCardTypesSnapshot, parseCompositionSnapshot } from "@/lib/work-examples/composition-snapshot";
import { isWorkExampleTrashActive } from "@/lib/work-examples/trash";
import type { WorkExampleFileKind } from "@prisma/client";

export type WorkExampleFileRow = {
  id: string;
  kind: WorkExampleFileKind;
  fileName: string;
  mime: string;
  sizeBytes: number;
  sortOrder: number;
  deletedAt: Date | null;
  deletedByLabel: string | null;
};

export type WorkExampleRow = {
  id: string;
  orderId: string | null;
  cloudUrl: string | null;
  cloudUrlPrevious: string | null;
  cloudUrlDeletedAt: Date | null;
  cloudUrlDeletedByLabel: string | null;
  technicianNotes: string;
  doctorComments: string;
  cardTypes: unknown;
  compositionSnapshot: unknown;
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedByLabel: string | null;
  order?: { orderNumber: string } | null;
  files: WorkExampleFileRow[];
};

export function serializeWorkExample(
  row: WorkExampleRow,
  opts: { includeInternal: boolean; now?: Date },
) {
  const now = opts.now ?? new Date();
  const liveFiles = row.files.filter((f) => !isWorkExampleTrashActive(f.deletedAt, now));
  const trashFiles = row.files.filter((f) => isWorkExampleTrashActive(f.deletedAt, now));
  const cover = liveFiles.find((f) => f.kind === "PHOTO") ?? liveFiles[0] ?? null;
  const cloudDeleted = isWorkExampleTrashActive(row.cloudUrlDeletedAt, now);
  return {
    id: row.id,
    orderId: opts.includeInternal ? row.orderId : null,
    orderNumber: opts.includeInternal ? row.order?.orderNumber ?? null : null,
    unassigned: !row.orderId,
    cloudUrl: cloudDeleted ? null : row.cloudUrl,
    cloudUrlDeleted: cloudDeleted
      ? {
          caption: workExampleDeletedCaption({
            actorLabel: row.cloudUrlDeletedByLabel || "Сотрудник",
            kind: "link",
            at: row.cloudUrlDeletedAt!,
          }),
        }
      : null,
    technicianNotes: row.technicianNotes,
    doctorComments: row.doctorComments,
    cardTypes: parseCardTypesSnapshot(row.cardTypes),
    composition: parseCompositionSnapshot(row.compositionSnapshot),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    coverFileId: cover?.id ?? null,
    files: liveFiles.map((f) => ({
      id: f.id,
      kind: f.kind,
      fileName: f.fileName,
      mime: f.mime,
      sizeBytes: f.sizeBytes,
      sortOrder: f.sortOrder,
    })),
    deletedFiles: opts.includeInternal
      ? trashFiles.map((f) => ({
          id: f.id,
          kind: f.kind,
          fileName: f.fileName,
          caption: workExampleDeletedCaption({
            actorLabel: f.deletedByLabel || "Сотрудник",
            kind: "file",
            fileName: f.fileName,
            at: f.deletedAt!,
          }),
        }))
      : [],
    deletedCaption:
      opts.includeInternal && isWorkExampleTrashActive(row.deletedAt, now)
        ? workExampleDeletedCaption({
            actorLabel: row.deletedByLabel || "Сотрудник",
            kind: "example",
            at: row.deletedAt!,
          })
        : null,
  };
}
