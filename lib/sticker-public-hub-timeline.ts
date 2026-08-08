import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";

export const PUBLIC_HUB_TIMELINE_LIMITS = {
  rowsMax: 20,
  labelMax: 64,
} as const;

export type PublicHubColumnRef =
  | { mode: "any" }
  | { mode: "next" }
  | { mode: "column"; boardId: string; columnId: string; title: string };

export type PublicHubOrderField = "createdAt" | "workReceivedAt";

export type PublicHubRevisionField = "isUrgent" | "urgentCoefficient";

export type PublicHubTimelineCondition =
  | { type: "order_field"; field: PublicHubOrderField; fallback?: "createdAt" }
  | { type: "kanban_enter"; column: PublicHubColumnRef }
  | { type: "kanban_leave"; column: PublicHubColumnRef }
  | { type: "kanban_move"; from: PublicHubColumnRef; to: PublicHubColumnRef }
  | { type: "kanban_blocked" }
  | { type: "revision_field_changed"; field: PublicHubRevisionField };

export type PublicHubTimelineRow = {
  id: string;
  label: string;
  condition: PublicHubTimelineCondition;
};

export type PublicHubTimelineConfig = {
  rows: PublicHubTimelineRow[];
};

/** Колонка по подписи этапа (без привязки к доске — сопоставление по title). */
function titleColumnRef(title: string): PublicHubColumnRef {
  return { mode: "column", boardId: "", columnId: "", title: title.trim() };
}

export const DEFAULT_PUBLIC_HUB_TIMELINE: PublicHubTimelineConfig = {
  rows: [
    {
      id: "row-received",
      label: "Поступление в лабораторию",
      condition: {
        type: "order_field",
        field: "workReceivedAt",
        fallback: "createdAt",
      },
    },
    {
      id: "row-created",
      label: "Оформлено",
      condition: { type: "order_field", field: "createdAt" },
    },
    {
      id: "row-agreed",
      label: "Согласовано",
      condition: {
        type: "kanban_enter",
        column: titleColumnRef(LAB_WORK_STATUS_LABELS.PRODUCTION),
      },
    },
    {
      id: "row-produced",
      label: "Произведено",
      condition: {
        type: "kanban_leave",
        column: titleColumnRef(LAB_WORK_STATUS_LABELS.ASSEMBLY),
      },
    },
    {
      id: "row-ready",
      label: "Готово",
      condition: {
        type: "kanban_enter",
        column: titleColumnRef(LAB_WORK_STATUS_LABELS.TO_ADMINS),
      },
    },
  ],
};

export function newTimelineRowId(): string {
  return `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeColumnRef(raw: unknown, fallback: PublicHubColumnRef): PublicHubColumnRef {
  if (raw == null || typeof raw !== "object") return fallback;
  const o = raw as Partial<PublicHubColumnRef>;
  if (o.mode === "any") return { mode: "any" };
  if (o.mode === "next") return { mode: "next" };
  if (o.mode === "column") {
    const title =
      typeof o.title === "string" ? o.title.trim().slice(0, 120) : fallback.mode === "column" ? fallback.title : "";
    if (!title) return fallback;
    return {
      mode: "column",
      boardId: typeof o.boardId === "string" ? o.boardId.trim() : "",
      columnId: typeof o.columnId === "string" ? o.columnId.trim() : "",
      title,
    };
  }
  return fallback;
}

function normalizeCondition(raw: unknown): PublicHubTimelineCondition | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as { type?: string };
  if (o.type === "order_field") {
    const of = raw as { field?: string; fallback?: string };
    const field = of.field === "workReceivedAt" ? "workReceivedAt" : "createdAt";
    const fallback = of.fallback === "createdAt" ? "createdAt" : undefined;
    return fallback
      ? { type: "order_field", field, fallback }
      : { type: "order_field", field };
  }
  if (o.type === "kanban_enter" || o.type === "kanban_leave") {
    const fb = titleColumnRef("");
    const column = normalizeColumnRef((raw as { column?: unknown }).column, fb);
    if (column.mode !== "column" || !column.title) return null;
    return { type: o.type, column };
  }
  if (o.type === "kanban_move") {
    const fb = titleColumnRef("");
    const from = normalizeColumnRef((raw as { from?: unknown }).from, fb);
    const to = normalizeColumnRef((raw as { to?: unknown }).to, fb);
    if (from.mode === "column" && !from.title) return null;
    return { type: "kanban_move", from, to };
  }
  if (o.type === "kanban_blocked") return { type: "kanban_blocked" };
  if (o.type === "revision_field_changed") {
    const field =
      (raw as { field?: string }).field === "urgentCoefficient"
        ? "urgentCoefficient"
        : "isUrgent";
    return { type: "revision_field_changed", field };
  }
  return null;
}

function migrateLegacyDefaultCondition(
  id: string,
  label: string,
  condition: PublicHubTimelineCondition,
): PublicHubTimelineCondition {
  const looksLikeAgreed =
    id === "row-agreed" ||
    label.trim().toLocaleLowerCase("ru") === "согласовано";
  /* Старый пресет: Согласование→Производство — часто нет from в журнале. */
  if (
    looksLikeAgreed &&
    condition.type === "kanban_move" &&
    condition.from.mode === "column" &&
    condition.to.mode === "column" &&
    normColLoose(condition.from.title) ===
      normColLoose(LAB_WORK_STATUS_LABELS.APPROVAL) &&
    normColLoose(condition.to.title) ===
      normColLoose(LAB_WORK_STATUS_LABELS.PRODUCTION)
  ) {
    return {
      type: "kanban_enter",
      column: {
        mode: "column",
        boardId: "",
        columnId: "",
        title: LAB_WORK_STATUS_LABELS.PRODUCTION,
      },
    };
  }
  return condition;
}

function normColLoose(title: string): string {
  return title.trim().toLocaleLowerCase("ru");
}

function normalizeRow(raw: unknown, index: number): PublicHubTimelineRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Partial<PublicHubTimelineRow>;
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim().slice(0, 64)
      : `row-${index + 1}`;
  const label =
    typeof o.label === "string" && o.label.trim()
      ? o.label.trim().slice(0, PUBLIC_HUB_TIMELINE_LIMITS.labelMax)
      : `Строка ${index + 1}`;
  const conditionRaw = normalizeCondition(o.condition);
  if (!conditionRaw) return null;
  const condition = migrateLegacyDefaultCondition(id, label, conditionRaw);
  return { id, label, condition };
}

export function normalizePublicHubTimeline(raw: unknown): PublicHubTimelineConfig {
  if (raw == null || typeof raw !== "object") {
    return structuredClone(DEFAULT_PUBLIC_HUB_TIMELINE);
  }
  const rowsRaw = (raw as PublicHubTimelineConfig).rows;
  if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) {
    return structuredClone(DEFAULT_PUBLIC_HUB_TIMELINE);
  }
  const rows = rowsRaw
    .slice(0, PUBLIC_HUB_TIMELINE_LIMITS.rowsMax)
    .map((r, i) => normalizeRow(r, i))
    .filter((r): r is PublicHubTimelineRow => r != null);
  if (rows.length === 0) {
    return structuredClone(DEFAULT_PUBLIC_HUB_TIMELINE);
  }
  return { rows };
}

export const PUBLIC_HUB_CONDITION_TYPE_LABELS: Record<
  PublicHubTimelineCondition["type"],
  string
> = {
  order_field: "Поле наряда",
  kanban_enter: "В колонку",
  kanban_leave: "Выход из колонки",
  kanban_move: "Перемещение",
  kanban_blocked: "Заблокировано",
  revision_field_changed: "Изменена срочность",
};

export function describePublicHubColumnRef(ref: PublicHubColumnRef): string {
  if (ref.mode === "any") return "любая";
  if (ref.mode === "next") return "следующая";
  return ref.title || "колонка";
}

export function describePublicHubCondition(c: PublicHubTimelineCondition): string {
  switch (c.type) {
    case "order_field":
      if (c.field === "workReceivedAt") {
        return c.fallback === "createdAt"
          ? "Дата поступления (или оформления)"
          : "Дата поступления";
      }
      return "Дата оформления";
    case "kanban_enter":
      return `В «${describePublicHubColumnRef(c.column)}»`;
    case "kanban_leave":
      return `Выход из «${describePublicHubColumnRef(c.column)}»`;
    case "kanban_move":
      return `Из «${describePublicHubColumnRef(c.from)}» → «${describePublicHubColumnRef(c.to)}»`;
    case "kanban_blocked":
      return "Карточка заблокирована";
    case "revision_field_changed":
      return c.field === "urgentCoefficient" ? "Изменён коэф. срочности" : "Изменена срочность";
    default:
      return "—";
  }
}
