import {
  normalizeProstheticsTwinKey,
  stripOrderProstheticsRequestPrefix,
} from "@/lib/order-prosthetics-request";
import { areChatRequestCreatedTwins } from "@/lib/order-chat-request-twin";

export type ProstheticsInTransitClientLine = {
  description: string;
  quantity: number;
};

export type ProstheticsInTransitOurLine = {
  /** Артикул · название или id позиции. */
  label: string;
  quantity: number;
};

/**
 * Статус истории «Ожидает» = секция модалки «Заказать».
 * Галочка наряда `prostheticsOrdered` сюда не входит: иначе заявка есть в журнале и пуста в блоке.
 */
export function isProstheticsAwaitingAccept(row: {
  resolvedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
}): boolean {
  return row.resolvedAt == null && row.rejectedAt == null;
}

/** Заявка ещё не принята — секция «Заказать». */
export type ProstheticsToOrderRow = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  authorLabel: string | null;
  createdAt: string;
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  clientProvided: ProstheticsInTransitClientLine[];
  ourLines: ProstheticsInTransitOurLine[];
};

export type ProstheticsInTransitStep =
  | "confirmed"
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
  orderedAt: string | null;
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

/** Наряд + тело без «???»: inbox и legacy одной кнопки дают один ключ. */
export function prostheticsOpenListTwinKey(orderId: string, text: string): string {
  const body =
    stripOrderProstheticsRequestPrefix(text)?.trim() ||
    String(text || "").trim();
  return `${orderId.trim()}\0${normalizeProstheticsTwinKey(body)}`;
}

function preferProstheticsListTwin<
  T extends { source: string; createdAt: Date },
>(a: T, b: T): T {
  if (a.source !== b.source) {
    if (a.source === "DEMO_KANBAN") return a;
    if (b.source === "DEMO_KANBAN") return b;
  }
  return a.createdAt.getTime() >= b.createdAt.getTime() ? a : b;
}

/**
 * Inbox + legacy одной заявки (??? и без, одна минута) → одна карточка.
 * Тот же текст на другом наряде или спустя несколько секунд — отдельные.
 */
export function collapseProstheticsListTwins<
  T extends {
    text: string;
    source: string;
    createdAt: Date;
    orderId?: string;
    order?: { id: string };
  },
>(rows: T[]): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    const oid = String(row.orderId || row.order?.id || "").trim();
    const key = prostheticsOpenListTwinKey(oid, row.text);
    const body = key.slice(key.indexOf("\0") + 1);
    if (!oid || !body) {
      kept.push(row);
      continue;
    }
    const i = kept.findIndex((prev) => {
      const pid = String(prev.orderId || prev.order?.id || "").trim();
      return (
        prostheticsOpenListTwinKey(pid, prev.text) === key &&
        areChatRequestCreatedTwins(prev.createdAt, row.createdAt)
      );
    });
    if (i < 0) {
      kept.push(row);
      continue;
    }
    kept[i] = preferProstheticsListTwin(kept[i]!, row);
  }
  return kept;
}
