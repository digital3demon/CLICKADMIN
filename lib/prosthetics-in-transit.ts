export type ProstheticsInTransitClientLine = {
  description: string;
  quantity: number;
};

export type ProstheticsInTransitOurLine = {
  /** Артикул · название или id позиции. */
  label: string;
  quantity: number;
};

export type ProstheticsInTransitStep =
  | "ordered"
  | "arrived"
  | "checked"
  | "done";

export type ProstheticsInTransitRow = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  authorLabel: string | null;
  createdAt: string;
  resolvedAt: string;
  arrivedAt: string | null;
  checkedAt: string | null;
  completedAt: string | null;
  /** Текущий шаг степпера по датам. */
  step: ProstheticsInTransitStep;
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  /** Галочка «Протетика заказана» на наряде. */
  prostheticsOrdered: boolean;
  /** Блок «Предоставлено клиентом» из карточки наряда. */
  clientProvided: ProstheticsInTransitClientLine[];
  /** Блок «Наше (со склада)» с подписями позиций. */
  ourLines: ProstheticsInTransitOurLine[];
};
