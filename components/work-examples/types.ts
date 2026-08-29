export type WorkExampleCardType = { id: string; name: string };

export type WorkExampleCompositionLine = {
  name: string;
  quantity: number;
  unitPriceRub: number;
  lineTotalRub: number;
};

export type WorkExampleFileLive = {
  id: string;
  kind: "PHOTO" | "CAD" | "FILE";
  fileName: string;
  mime: string;
  sizeBytes: number;
  sortOrder: number;
};

export function workExampleDisplayTitle(it: {
  title?: string | null;
  unassigned?: boolean;
  orderNumber?: string | null;
}): string {
  const title = (it.title ?? "").trim();
  if (title) return title;
  if (it.orderNumber?.trim()) return it.orderNumber.trim();
  return "не распределен";
}

export type WorkExampleItem = {
  id: string;
  title: string;
  orderId: string | null;
  orderNumber: string | null;
  unassigned: boolean;
  cloudUrl: string | null;
  cloudUrlDeleted: { caption: string } | null;
  technicianNotes: string;
  doctorComments: string;
  cardTypes: WorkExampleCardType[];
  composition: WorkExampleCompositionLine[];
  createdAt: string;
  updatedAt: string;
  coverFileId: string | null;
  files: WorkExampleFileLive[];
  deletedFiles: Array<{
    id: string;
    kind: string;
    fileName: string;
    caption: string;
  }>;
  deletedCaption: string | null;
};
