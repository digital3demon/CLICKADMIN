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
  /** Пространство (дорожка) по умолчанию для нового заказа/карточки. */
  defaultTrackLane?: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  /** Когда пункт отметили выполненным (null/undefined — не выполнен). */
  completedAt?: string | null;
  /** Ответственный за пункт (CRM user id). */
  assigneeId?: string | null;
};

export type ProductionChecklistItem = ChecklistItem & {
  sourceFileId: string;
  sourceFileName: string;
  fromArchive: boolean;
  archiveEntryName?: string;
  /** Сколько раз этот объект уходил в переделку. */
  reworkCount?: number;
  /** История отметок переделки (ISO timestamp). */
  reworkEvents?: string[];
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
  /** Родительская карточка в сборке: файл отмечен для нового цикла производства. */
  productionRedo?: boolean;
  /** Ручной маршрут в производстве (id дорожки) для этого файла. */
  productionLaneId?: string;
  /** Явно не отправлять файл в производство. */
  productionSkip?: boolean;
};

export type CardComment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  /** Локальный parent (id комментария в CRM-канбане) для тредов. */
  parentId?: string | null;
  /** Автор из Kaiten (REST), если не совпадает с участниками доски CRM */
  authorLabel?: string;
  /** id из `card.files` — в чате показываем крупное превью только для картинок */
  imageFileId?: string;
  /** Внешний id комментария (например, Kaiten) для дедупликации и anti-loop. */
  externalCommentId?: string | null;
  /** Внешний parent id (например, parent в Kaiten) для восстановления тредов. */
  externalParentId?: string | null;
  /** Источник сообщения в общем двустороннем потоке. */
  source?: "CRM" | "KAITEN";
  /** Состояние выгрузки CRM→Kaiten. Для Kaiten-сообщений обычно `synced`. */
  syncStatus?: "local" | "pending" | "synced" | "failed" | "retried";
  /** Когда сообщение успешно синхронизировано с внешней системой. */
  syncedAt?: string | null;
  /** Правка автором (окно 12 ч с createdAt). */
  editedAt?: string | null;
  /** Мягкое удаление автором; ingest из Kaiten не воскрешает строку. */
  deletedAt?: string | null;
  /** GET /kanban-chat: заявка закрыта (внесена / заказана) — кнопки правки скрыты. */
  requestClosed?: boolean;
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
  /** Канон YYMM-NNN с наряда — в поиске даже если заголовок Kaiten без номера */
  linkedOrderNumber?: string;
  /** Сколько писем привязано к наряду (для кнопки почты в модалке). */
  sourceEmailCount?: number;
  /** Родительский наряд для «продолжения работы» (ссылка в UI канбана). */
  continuesFromOrderId?: string | null;
  continuesFromOrderNumber?: string | null;
  continuationFollowups?: {
    orderId: string;
    orderNumber: string;
  }[];
  /** id карточки в Kaiten (число из API) */
  kaitenCardId?: number | null;
  /** Порядок в колонке Kaiten (`sort_order`); для сортировки зеркала и DnD → Kaiten */
  kaitenCardSortOrder?: number | null;
  /** Отпечаток members из Kaiten (inbound sync) */
  kaitenMembersFingerprint?: string | null;
  /** Отпечаток после успешного push CRM → Kaiten (anti-loop) */
  lastPushedMembersFingerprint?: string | null;
  /** Предупреждение: Kaiten users без match в CRM */
  kaitenMembersSyncWarning?: string | null;
  cardTypeId: string;
  assignees: string[];
  participants: string[];
  /** @deprecated legacy — читать/писать через lib/kanban/kanban-stage-due.ts */
  dueDate: string;
  /** Этапный срок (поле «Срок» в канбане); не лабораторный срок наряда. */
  stageDueDate?: string;
  /** Метка «срочно» для следующего отдела (только канбан; не Order.isUrgent в шапке). */
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
  /** Производство: дочерняя карточка знает родителя. */
  parentCardId?: string;
  /** Производство: родительская карточка хранит id дочерних карточек. */
  childCardIds?: string[];
  /** Производство: дорожка (Печать / Фрезер / ...). */
  productionLaneId?: string;
  /** Производство: чеклист по файлам/архивам. */
  productionChecklist?: ProductionChecklistItem[];
  /** Производство: сохранённые чеклисты дочерних карточек в родителе (read-only слепок). */
  productionChecklistSnapshots?: Array<{
    childCardId: string;
    childTitle: string;
    laneId?: string;
    columnTitle: string;
    updatedAt: string;
    checklist: ProductionChecklistItem[];
  }>;
  /** Производство: завершена ли работа по карточке (для автоархивации). */
  productionReadyAt?: string | null;
  /** Обратный отсчёт (ISO): старт и полная длительность в мс; задают пользователи с правом KANBAN_MANAGE_TIMER. */
  timerStartedAt?: string | null;
  timerDurationMs?: number | null;
  /** Заморозка отображения: ISO момент «оставить таймер» — полоса и остаток не тикают, цвет по доле на этот момент. */
  timerFrozenAt?: string | null;
  /** Кто запустил таймер (CRM user id) — снять могут автор и старшие. */
  timerStartedByUserId?: string | null;
  /** Снимок при переносе вперёд: восстановление, если вернули назад за 45 мин. */
  timerParkedAt?: string | null;
  timerParkedRemainingMs?: number | null;
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

export type KanbanAutoArchiveRule = {
  id: string;
  enabled: boolean;
  columnId: string;
  /** Через сколько часов без движения в колонке отправить карточку в архив. */
  idleHours: number;
};

export type KanbanArchivedCard = {
  id: string;
  card: KanbanCard;
  archivedAt: string;
  deleteAfterAt: string;
  sourceColumnId: string;
  sourceColumnTitle: string;
  reason: "auto" | "manual";
};

export type KanbanStoppedCard = {
  id: string;
  card: KanbanCard;
  stoppedAt: string;
  sourceColumnId: string;
  sourceColumnTitle: string;
};

/** Действие правила. Имена близки к Kaiten /api/spaces/{id}/automations. */
export type KanbanAutomationAction =
  | { type: "move_to_column"; columnId: string }
  | { type: "add_assignee"; userId: string }
  | { type: "remove_assignee"; userId: string }
  | { type: "add_participant"; userId: string }
  | { type: "remove_participant"; userId: string }
  | { type: "set_due_in_days"; days: number }
  | { type: "clear_due" }
  | { type: "set_urgent" }
  | { type: "clear_urgent" }
  | { type: "add_comment"; text: string }
  | { type: "set_card_type"; cardTypeId: string }
  | { type: "block"; reason: string }
  | { type: "unblock" }
  | { type: "complete_checklists" }
  | {
      type: "archive";
      /** 0 — сразу. Иначе карточка уходит в архив, если всё ещё в колонке правила. */
      afterHours: number;
    };

/** Событие-триггер. Сопоставление с Kaiten: moved_in_path / created / blocked / unblocked. */
export type KanbanAutomationTrigger =
  | "card_moved_to_column"
  | "card_created_in_column"
  | "card_blocked"
  | "card_unblocked";

export type KanbanAutomationRule = {
  id: string;
  enabled: boolean;
  name: string;
  /** Доска, для которой срабатывает правило (пусто = любая). */
  boardId: string;
  trigger: KanbanAutomationTrigger;
  /** Колонка, в которую попала карточка (перенос) или где создана */
  columnId: string;
  /** Только для переноса: из какой колонки (пусто = из любой) */
  fromColumnId: string;
  /** Ограничить типом карточки (пусто = любой). Совместимость со старыми правилами. */
  cardTypeId: string;
  /** Несколько типов: пусто = любой. Если задано — cardTypeId не используется. */
  cardTypeIds?: string[];
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
    }
  | {
      type: "card_blocked";
      cardId: string;
      columnId: string;
    }
  | {
      type: "card_unblocked";
      cardId: string;
      columnId: string;
    };

export type KanbanBoard = {
  id: string;
  title: string;
  /** Участвует в распределении новых заказов из формы наряда. */
  distributeNewOrders?: boolean;
  /** Закрытая доска: доступ только пользователям из `accessUserIds`. */
  isPrivate?: boolean;
  /** Разрешить доступ всем пользователям с ролью `PRODUCTION`/`SENIOR_PRODUCTION` (актуально для закрытых досок). */
  allowProductionRoleAccess?: boolean;
  /** Список userId, у кого есть доступ к закрытой доске. */
  accessUserIds?: string[];
  columns: KanbanColumn[];
  /** Устаревшие локально заведённые участники (без CRM); подмешиваются к списку выбора. */
  users: KanbanUser[];
  /** id пользователей CRM, которых не показывать в «Ответственные» / «Участники». */
  excludedCrmUserIds?: string[];
  cardTypes: CardTypeDef[];
  /** Правила автоматизации. Канон — tenant-ключ kanbanAutomationsV1. */
  automations?: KanbanAutomationRule[];
  /** Автоархивация: выбор колонки и таймаут до архива. */
  autoArchiveRules?: KanbanAutoArchiveRule[];
  /** Сколько дней хранить карточки в архиве до удаления (в UI задаётся в годах, 1 г. = 365 дн.). */
  archiveRetentionDays?: number;
  /** Архив карточек по доске. */
  archivedCards?: KanbanArchivedCard[];
  /** Карточки в отдельном «СТОП» разделе: скрыты из дорожек, но не архивируются. */
  stoppedCards?: KanbanStoppedCard[];
  /** Настройки производственного контура на доске. */
  productionSettings?: {
    enabled: boolean;
    /** true: маршрут задаётся руками при загрузке 3D/архивов. */
    manualRoutingEnabled?: boolean;
    triggerColumnTitle: string;
    parentDoneColumnTitle: string;
    childTodoColumnTitle: string;
    childInProgressColumnTitle: string;
    childDoneColumnTitle: string;
    unmatchedLaneId: string;
    childAutoArchiveAfterMinutes: number;
    archive3dExtensions: string[];
    lanes: Array<{
      id: string;
      name: string;
      keywords: string[];
    }>;
    /** Токен @упоминания группы «Производство» в чате (по умолчанию clickpr). */
    productionMentionTag?: string;
  };
};

export type KanbanPeopleJoin = "and" | "or";

export type KanbanFilters = {
  cardTypeId: string;
  due: string;
  /** Только ответственные (assignees) */
  assigneeUserId: string;
  /** Только участники (participants), без требования быть ответственным */
  participantUserId: string;
  /** Связка ответственный + участник. Нет поля = «и». */
  peopleJoin?: KanbanPeopleJoin;
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
  /** Одноразовая миграция: сброс legacy dueDate в карточках (этапный срок). */
  legacyStageDueClearVersion?: string;
};
