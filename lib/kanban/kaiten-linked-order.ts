/** Поля наряда для карточки CRM-канбана (есть всегда; kaitenCardId — после публикации в Kaiten). */
export type KaitenLinkedOrderForKanban = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  doctorFullName: string;
  /** Полный ISO срока лабораторного (для шапки карточки); первая часть — календарная дата для бейджа. */
  dueDate: string | null;
  dueToAdminsAt: string | null;
  kaitenAdminDueHasTime: boolean | null;
  kaitenCardTitleLabel: string | null;
  kaitenCardTypeId: string | null;
  kaitenCardTypeName: string | null;
  /** Дорожка Kaiten → доска канбана «Ортопедия» / «Ортодонтия». */
  kaitenTrackLane: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  kaitenCardId: number | null;
  /** Подпись колонки Kaiten в CRM (обновляется GET/PATCH Kaiten и фоновой синхронизацией). */
  kaitenColumnTitle: string | null;
  /** Порядок карточки в колонке Kaiten (`sort_order` в API). */
  kaitenCardSortOrder: number | null;
  /** Кэш заголовка/описания карточки Kaiten для зеркала канбана. */
  kaitenCardTitleMirror: string | null;
  kaitenCardDescriptionMirror: string | null;
  kaitenBlocked: boolean;
  kaitenBlockReason: string | null;
  /** Демо / внутренний канбан: NEW | IN_PROGRESS | DONE */
  demoKanbanColumn: string | null;
  /** Первая позиция из прайса (PRICE_LIST) — для типа карточки канбана в демо */
  primaryPriceListItemName: string | null;
  /** Текст заказа от клиента и внутренний комментарий — в описание карточки канбана */
  clientOrderText: string | null;
  notes: string | null;
  /** Вложения наряда (без счёта-фактуры) — показываются в модалке канбана как «Файлы». */
  attachments?: {
    id: string;
    fileName: string;
    mimeType: string | null;
    size: number;
    createdAt: string;
  }[];
};
