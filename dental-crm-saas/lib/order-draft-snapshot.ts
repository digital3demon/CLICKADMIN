import { LAB_WORK_STATUS_DEFAULT, type LabWorkStatus } from "@/lib/lab-work-status";
import type { DetailLine } from "@/components/orders/new-order-form/detail-lines";
import type { QuickOrderState } from "@/components/orders/new-order-form/quick-order-types";
import type { BridgeLineInput } from "@/lib/detail-lines-to-constructions";
import type { OrderProstheticsV1 } from "@/lib/order-prosthetics";
import type { OrderCorrectionTrackValue } from "@/lib/order-correction-track";

export const ORDER_DRAFT_SNAPSHOT_VERSION = 11 as const;

export type OrderDraftSnapshot = {
  version: typeof ORDER_DRAFT_SNAPSHOT_VERSION;
  activeTab: "Заказ";
  clinicId: string;
  doctorId: string;
  legalEntity: string;
  payment: string;
  /** v10+ — не включать в выгрузку сверки за период (при оплате «СВЕРКА») */
  excludeFromReconciliation?: boolean;
  patientName: string;
  /** Текст из переписки с клиентом */
  clientOrderText: string;
  comments: string;
  hasScans: boolean;
  hasCt: boolean;
  hasMri: boolean;
  hasPhoto: boolean;
  /** Что ещё есть к работе (исходные данные), свободный текст */
  additionalSourceNotes: string;
  urgentSelection: string;
  /** Этап работы (как в Kaiten / лаборатории) */
  labWorkStatus: LabWorkStatus;
  /** Значение input `datetime-local` — сдача работы (нормализуется к 8:00–23:30, шаг 30 мин) */
  workDueLocal: string;
  /** v11+ — дата записи пациента (как dueToAdminsAt) */
  patientAppointmentLocal: string;
  /** v11+ — когда работа поступила; пусто = момент занесения */
  workReceivedLocal: string;
  quickOrder: QuickOrderState;
  detailLines: DetailLine[];
  bridgeLines?: BridgeLineInput[];
  /** v3+ */
  prosthetics?: OrderProstheticsV1;
  /** v7+ — коррекция (ортопедия / ортодонтия); null — не коррекция */
  correctionTrack?: OrderCorrectionTrackValue | null;
};

export function isQuickOrderTouched(q: QuickOrderState): boolean {
  if (q.continueWork) return true;
  if (q.v !== 2) return true;
  return q.tiles.length > 0;
}

/** Есть ли смысл сохранять черновик при закрытии без отправки на сервер */
export function isDraftWorthy(s: OrderDraftSnapshot): boolean {
  if (s.clinicId || s.doctorId) return true;
  if (s.patientName.trim()) return true;
  if (s.comments.trim()) return true;
  if (s.clientOrderText?.trim()) return true;
  if (s.detailLines.length > 0) return true;
  if ((s.bridgeLines?.length ?? 0) > 0) return true;
  if (s.hasScans || s.hasCt || s.hasMri || s.hasPhoto) return true;
  if (s.additionalSourceNotes?.trim()) return true;
  if (s.urgentSelection !== "UNSET") return true;
  if (s.labWorkStatus !== LAB_WORK_STATUS_DEFAULT) return true;
  if (isQuickOrderTouched(s.quickOrder)) return true;
  if (s.legalEntity !== "Выбрать из списка") return true;
  if (s.payment !== "Выбрать из списка") return true;
  if (s.workDueLocal?.trim()) return true;
  if (s.patientAppointmentLocal?.trim()) return true;
  if (s.workReceivedLocal?.trim()) return true;
  if (s.correctionTrack) return true;
  if (s.excludeFromReconciliation) return true;
  const pr = s.prosthetics;
  if (pr && (pr.clientProvided.length > 0 || pr.ourLines.length > 0)) {
    return true;
  }
  return false;
}
