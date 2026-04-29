export type KanbanUser = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type CardTypeDef = {
  id: string;
  name: string;
  sortOrder: number;
  color: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type CardFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  /**
   * data: URL из чата или URL вида `/api/orders/.../attachments/...` для вложений наряда
   * (картинки/PDF открываются с cookie-сессией).
   */
  dataUrl: string;
  addedAt: string;
  addedByUserId: string;
  /** Если файл загружен как вложение наряда — удаление синхронизируется с Kaiten. */
  orderAttachmentId?: string;
};

export type CardComment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  /** Автор из Kaiten (REST), если не совпадает с участниками доски CRM */
  authorLabel?: string;
  /** id из `card.files` — в чате показываем крупное превью только для картинок */
  imageFileId?: string;
};

export type CardActivity = {
  id: string;
  type: string;
  text: string;
  userId: string;
  /** Подпись в журнале (сессия CRM), если участники доски не совпадают с userId */
  actorLabel?: string;
  at: string;
};

export type KanbanCard = {
  id: string;
  title: string;
  description: string;
  /** Наряд CRM — карточка подтянута после создания в Kaiten */
  linkedOrderId?: string;
  /** id карточки в Kaiten (число из API) */
  kaitenCardId?: number | null;
  /** Порядок в колонке Kaiten (`sort_order`); для сортировки зеркала и DnD → Kaiten */
  kaitenCardSortOrder?: number | null;
  cardTypeId: string;
  assignees: string[];
  participants: string[];
  dueDate: string;
  /** Метка «срочно»: не связана со сроком, может быть без даты. */
  urgent: boolean;
  checklist: ChecklistItem[];
  files: CardFile[];
  comments: CardComment[];
  activity: CardActivity[];
  blocked: boolean;
  blockReason: string;
  blockedByUserId: string;
  blockedAt: string;
  createdByUserId: string;
  lastMovedAt: string | null;
  trackLane: string;
  createdAt: string;
  updatedAt: string;
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

/** Действие правила «если условие выполнено — сделать …». */
export type KanbanAutomationAction =
  | { type: "move_to_column"; columnId: string }
  | { type: "add_assignee"; userId: string }
  | { type: "set_due_in_days"; days: number }
  | { type: "clear_due" }
  | { type: "add_comment"; text: string }
  | { type: "set_card_type"; cardTypeId: string }
  | { type: "block"; reason: string };

/** Событие-триггер для правил на доске. */
export type KanbanAutomationTrigger =
  | "card_moved_to_column"
  | "card_created_in_column";

export type KanbanAutomationRule = {
  id: string;
  enabled: boolean;
  name: string;
  trigger: KanbanAutomationTrigger;
  /** Колонка, в которую попала карточка (перенос) или где создана */
  columnId: string;
  /** Только для переноса: из какой колонки (пусто = из любой) */
  fromColumnId: string;
  /** Ограничить типом карточки (пусто = любой) */
  cardTypeId: string;
  actions: KanbanAutomationAction[];
};

/** Событие для запуска движка автоматизаций. */
export type KanbanAutomationEvent =
  | {
      type: "card_moved_to_column";
      cardId: string;
      fromColumnId: string;
      toColumnId: string;
    }
  | {
      type: "card_created_in_column";
      cardId: string;
      columnId: string;
    };

export type KanbanBoard = {
  id: string;
  title: string;
  columns: KanbanColumn[];
  users: KanbanUser[];
  cardTypes: CardTypeDef[];
  /** Правила автоматизации (локально в браузере). */
  automations?: KanbanAutomationRule[];
};

export type KanbanFilters = {
  cardTypeId: string;
  due: string;
  /** Только ответственные (assignees) */
  assigneeUserId: string;
  /** Только участники (participants), без требования быть ответственным */
  participantUserId: string;
};

/** Сохранённый набор фильтров (имя + значения). */
export type KanbanFilterTemplate = {
  id: string;
  name: string;
  filters: KanbanFilters;
};

export type KanbanAppState = {
  version: number;
  boards: KanbanBoard[];
  activeBoardId: string;
  search: string;
  viewMode: "board" | "calendar" | "list";
  calendarMonth: { y: number; m: number };
  filters: KanbanFilters;
  filterTemplates: KanbanFilterTemplate[];
  /** Наряды, убранные с доски вручную (не показывать при синхронизации с Kaiten) */
  hiddenLinkedOrderIds?: string[];
};
