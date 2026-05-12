import type { OrderSnapshotV1 } from "@/lib/order-revision-snapshot";

const KEY_LABELS: Record<string, string> = {
  clinicId: "Клиника",
  doctorId: "Врач",
  patientName: "Пациент",
  appointmentDate: "Дата приёма пациента",
  dueDate: "Срок лабораторный",
  dueToAdminsAt: "Дата приёма пациента",
  status: "Статус заказа",
  notes: "Комментарий",
  clientOrderText: "Заказ от клиента",
  isUrgent: "Срочность",
  urgentCoefficient: "Коэф. срочности",
  labWorkStatus: "Этап работы (архив, до Кайтен)",
  legalEntity: "Юр. лицо",
  payment: "Оплата",
  shade: "Цвет (наряд)",
  hasScans: "Сканы",
  hasCt: "КТ",
  hasMri: "МРТ",
  hasPhoto: "Фото",
  additionalSourceNotes: "Что ещё к работе",
  quickOrder: "Быстрый наряд",
  invoiceIssued: "Счёт выставлен",
  invoiceNumber: "Номер счёта",
  invoicePaperDocs: "Бумажные документы",
  invoiceSentToEdo: "Отправлен в ЭДО",
  invoiceEdoSigned: "Подпись в ЭДО",
  invoicePrinted: "Счёт распечатан",
  narjadPrinted: "Наряд распечатан",
  adminShippedOtpr: "Отправлено",
  shippedDescription: "Отгружено (текст)",
  invoiceParsedLines: "Строки счёта (разбор)",
  invoiceParsedTotalRub: "Сумма по счёту (разбор)",
  invoiceParsedSummaryText: "Текст «ВЫСТАВЛЕНО»",
  invoicePaymentNotes: "Комментарии к счёту и оплатам",
  orderPriceListKind: "Прайс",
  orderPriceListNote: "Подпись прайса",
  prostheticsOrdered: "Протетика заказана",
  correctionTrack: "Коррекция",
  correctionReason: "Причина коррекции",
  correctionPaid: "Коррекция платная",
  reworkAtCustomerExpense: "Устар.: переделка за счёт заказчика",
  registeredByLabel: "Оформил",
  courierId: "Курьер",
  courierPickupId: "Курьер привоз",
  courierDeliveryId: "Курьер отвоз",
  invoiceAttachmentId: "Файл счёта",
  kaitenDecideLater: "Кайтен позже",
  kaitenCardTypeId: "Тип карточки Кайтен",
  kaitenTrackLane: "Пространство Кайтен",
  kaitenAdminDueHasTime: "Время сдачи админам в Кайтен",
  dueToAdminsHasTime: "Точное время записи",
  kaitenCardTitleLabel: "Текст в шапку Кайтен",
  kaitenCardId: "ID карточки Кайтен",
  kaitenSyncError: "Ошибка Кайтен",
  kaitenSyncedAt: "Синхронизация Кайтен",
  kaitenColumnTitle: "Колонка Кайтен (CRM)",
  kaitenBlocked: "Блокировка в Кайтен",
  kaitenBlockReason: "Причина блокировки Кайтен",
  kaitenBlockedAt: "Начало блокировки Кайтен",
};

export function summarizeOrderRevision(
  prev: OrderSnapshotV1 | null,
  next: OrderSnapshotV1,
  isCreate: boolean,
): string {
  if (isCreate) {
    return "Наряд создан";
  }
  if (!prev) {
    return "Сохранена версия";
  }

  const parts: string[] = [];
  const pk = prev.order;
  const nk = next.order;
  /** Старые снимки без новых полей — сравниваем с null, иначе ложные «изменения». */
  const mergeOrder = (o: OrderSnapshotV1["order"]) => ({
    ...o,
    clientOrderText: o.clientOrderText ?? null,
    invoiceNumber: o.invoiceNumber ?? null,
    invoicePaperDocs: Boolean(o.invoicePaperDocs),
    invoiceSentToEdo: Boolean(o.invoiceSentToEdo),
    invoiceEdoSigned: Boolean(o.invoiceEdoSigned),
    invoicePrinted:
      "invoicePrinted" in o ? Boolean(o.invoicePrinted) : false,
    narjadPrinted: Boolean(o.narjadPrinted),
    adminShippedOtpr: Boolean(o.adminShippedOtpr),
    prostheticsOrdered: Boolean(o.prostheticsOrdered),
    correctionTrack: o.correctionTrack ?? null,
    correctionReason:
      "correctionReason" in o ? (o.correctionReason ?? null) : null,
    correctionPaid:
      "correctionPaid" in o ? Boolean(o.correctionPaid) : false,
    reworkAtCustomerExpense:
      "reworkAtCustomerExpense" in o
        ? Boolean(o.reworkAtCustomerExpense)
        : false,
    registeredByLabel: o.registeredByLabel ?? null,
    courierId: o.courierId ?? null,
    courierPickupId:
      "courierPickupId" in o ? (o.courierPickupId ?? null) : o.courierId ?? null,
    courierDeliveryId:
      "courierDeliveryId" in o ? (o.courierDeliveryId ?? null) : null,
    invoiceAttachmentId: o.invoiceAttachmentId ?? null,
    kaitenColumnTitle:
      "kaitenColumnTitle" in o ? (o.kaitenColumnTitle ?? null) : null,
    kaitenBlocked: "kaitenBlocked" in o ? Boolean(o.kaitenBlocked) : false,
    kaitenBlockReason:
      "kaitenBlockReason" in o ? (o.kaitenBlockReason ?? null) : null,
    kaitenBlockedAt:
      "kaitenBlockedAt" in o ? (o.kaitenBlockedAt ?? null) : null,
    shippedDescription:
      "shippedDescription" in o ? (o.shippedDescription ?? null) : null,
    invoiceParsedLines:
      "invoiceParsedLines" in o ? (o.invoiceParsedLines ?? null) : null,
    invoiceParsedTotalRub:
      "invoiceParsedTotalRub" in o
        ? (o.invoiceParsedTotalRub ?? null)
        : null,
    invoiceParsedSummaryText:
      "invoiceParsedSummaryText" in o
        ? (o.invoiceParsedSummaryText ?? null)
        : null,
    invoicePaymentNotes:
      "invoicePaymentNotes" in o
        ? (o.invoicePaymentNotes ?? null)
        : null,
    orderPriceListKind:
      "orderPriceListKind" in o ? (o.orderPriceListKind ?? null) : null,
    orderPriceListNote:
      "orderPriceListNote" in o ? (o.orderPriceListNote ?? null) : null,
    kaitenAdminDueHasTime:
      "kaitenAdminDueHasTime" in o
        ? Boolean(o.kaitenAdminDueHasTime)
        : true,
    dueToAdminsHasTime:
      "dueToAdminsHasTime" in o ? Boolean(o.dueToAdminsHasTime) : true,
  });
  const pkM = mergeOrder(pk);
  const nkM = mergeOrder(nk);
  (Object.keys(nkM) as (keyof typeof nkM)[]).forEach((key) => {
    if (JSON.stringify(pkM[key]) !== JSON.stringify(nkM[key])) {
      parts.push(KEY_LABELS[key] ?? String(key));
    }
  });

  const prevUnitPrices = prev.constructions.map((c) => c.unitPrice ?? null);
  const nextUnitPrices = next.constructions.map((c) => c.unitPrice ?? null);
  const pricesChanged =
    JSON.stringify(prevUnitPrices) !== JSON.stringify(nextUnitPrices);

  if (JSON.stringify(prev.constructions) !== JSON.stringify(next.constructions)) {
    parts.push("Состав работ");
    if (pricesChanged) {
      parts.push("Цена в составе");
    }
  }

  if (JSON.stringify(prev.prosthetics ?? null) !== JSON.stringify(next.prosthetics ?? null)) {
    parts.push("Протетика");
  }

  if (parts.length === 0) {
    return "Сохранено без изменений содержимого";
  }
  return parts.join(", ");
}
