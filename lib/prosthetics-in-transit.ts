export type ProstheticsInTransitRow = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  authorLabel: string | null;
  createdAt: string;
  resolvedAt: string;
  orderId: string;
  orderNumber: string;
};
