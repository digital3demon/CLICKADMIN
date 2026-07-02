import type { ClickMigConfigJson } from "./types";

export const CLICKMIG_KANBAN_COLUMNS = [
  { id: "col_queue", title: "К исполнению" },
  { id: "col_prod", title: "Производство" },
  { id: "col_fab", title: "Изготовление" },
  { id: "col_review", title: "Проверка" },
  { id: "col_done", title: "Сдана админам" },
] as const;

export const CLICKMIG_STAGE_TIMERS_DEFAULT = [
  { key: "data_check", label: "Проверка данных", durationMs: 2 * 60 * 60 * 1000 },
  { key: "modeling", label: "Моделирование", durationMs: 4 * 60 * 60 * 1000 },
];

export const CLICKMIG_COLUMN_TIMERS_DEFAULT = [
  { columnId: "col_queue", label: "К исполнению", durationMs: 0 },
  { columnId: "col_prod", label: "Производство", durationMs: 8 * 60 * 60 * 1000 },
  { columnId: "col_fab", label: "Изготовление", durationMs: 8 * 60 * 60 * 1000 },
  { columnId: "col_review", label: "Проверка", durationMs: 2 * 60 * 60 * 1000 },
  { columnId: "col_done", label: "Сдана админам", durationMs: 0 },
];

export function defaultClickMigConfigJson(): ClickMigConfigJson {
  return {
    constructionTypes: [
      { key: "crown", name: "Коронка" },
      { key: "bridge", name: "Мост" },
      { key: "veneer", name: "Винир" },
      { key: "inlay", name: "Вкладка" },
      { key: "screw_retained", name: "Винтовая фиксация", requiresScanbody: true },
    ],
    scanbodyManufacturers: [
      "Nobel Biocare",
      "Straumann",
      "Osstem",
      "Dentsply Sirona",
      "Другой",
    ],
    shadeOptions: {
      group: "A",
      codes: [
        "A1",
        "A2",
        "A3",
        "A3.5",
        "A4",
        "B1",
        "B2",
        "B3",
        "B4",
        "C1",
        "C2",
        "C3",
        "C4",
        "D2",
        "D3",
        "D4",
      ],
    },
    defaultAssigneeUserId: null,
    participantUserIds: [],
    maxCardsPerParticipant: 3,
    columnTimers: [...CLICKMIG_COLUMN_TIMERS_DEFAULT],
    stageTimers: [...CLICKMIG_STAGE_TIMERS_DEFAULT],
    timerBehaviors: {
      checkmark: "stop",
      cross: "stop_and_block",
      columnMove: "stop",
    },
    validationHints: [
      {
        field: "patientName",
        label: "ФИО пациента",
        whyImportant: "Нужно для маркировки работы и документов.",
        required: true,
      },
      {
        field: "doctorName",
        label: "ФИО врача",
        whyImportant: "Для связи и подтверждения заказа.",
        required: true,
      },
      {
        field: "doctorEmail",
        label: "Email врача",
        whyImportant: "На этот адрес придёт подтверждение или уточнения.",
        required: true,
      },
      {
        field: "constructionTypeKey",
        label: "Тип конструкции",
        whyImportant: "Определяет технологию изготовления.",
        required: true,
      },
      {
        field: "material",
        label: "Материал",
        whyImportant: "Влияет на сроки и стоимость.",
        required: true,
      },
      {
        field: "teethFdi",
        label: "Зубы",
        whyImportant: "Без номеров зубов нельзя начать работу.",
        required: true,
      },
      {
        field: "scans",
        label: "Интраоральные сканы",
        whyImportant: "Основа для моделирования; без сканов заказ не принимается.",
        required: true,
      },
      {
        field: "photos",
        label: "Фото",
        whyImportant: "Помогает подобрать цвет и проверить прикус.",
        required: false,
      },
      {
        field: "shadeCode",
        label: "Цвет",
        whyImportant: "Нужен для эстетики реставрации.",
        required: true,
      },
      {
        field: "scanbodyManufacturer",
        label: "Производитель scanbody",
        whyImportant: "Для винтовой фиксации без scanbody нельзя смоделировать.",
        required: false,
      },
    ],
    emailTemplates: {
      acceptedSubject: "Заказ {{publicNumber}} принят — КликМиг",
      acceptedHtml:
        "<p>Здравствуйте, {{doctorName}}!</p><p>Ваш заказ <strong>{{publicNumber}}</strong> для пациента {{patientName}} принят.</p><p>Материал: {{materialLabel}}. Конструкция: {{constructionName}}.</p>",
      rejectedSubject: "Заказ {{publicNumber}} не принят — КликМиг",
      rejectedHtml:
        "<p>Здравствуйте, {{doctorName}}!</p><p>К сожалению, заявка {{publicNumber}} не принята.</p><p>Причина: {{reason}}</p>",
      blockedSubject: "Нужны уточнения по заказу {{publicNumber}} — КликМиг",
      blockedHtml:
        "<p>Здравствуйте, {{doctorName}}!</p><p>Работа по заказу {{publicNumber}} приостановлена.</p><p>{{reason}}</p><p><a href=\"{{resubmitUrl}}\">Отправить новые данные</a></p><p><a href=\"{{videoUrl}}\">Посмотреть видео</a></p>",
    },
    allowedOrigins: [
      "https://test.click-lab.online",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  };
}
