import type { AppModule } from "@prisma/client";

/** Пакеты прав в матрице (UI). Atomic AppModule — в коде и БД. */
export type BundleId =
  | "ORDERS"
  | "ORDERS_MANAGE"
  | "ORDERS_NOTIFICATIONS_ADMIN"
  | "ORDERS_NOTIFICATIONS_CORRECTIONS"
  | "ORDERS_NOTIFICATIONS_PROSTHETICS"
  | "ORDER_HISTORY"
  | "ATTENTION"
  | "KANBAN"
  | "KANBAN_WORK"
  | "KANBAN_COORDINATE"
  | "ANALYTICS"
  | "SIDEBAR_PAYMENTS"
  | "PAYROLL"
  | "FINANCE_OFFICE"
  | "MAIL"
  | "SHIPMENTS"
  | "WAREHOUSE"
  | "CLIENTS_VIEW"
  | "CLIENTS_EDIT"
  | "DIRECTORY"
  | "CONFIG_KANBAN_KAITEN"
  | "CONFIG_PRICING"
  | "CONFIG_PRICING_CORRECTION"
  | "CONFIG_ORDERS_CONTRACTS"
  | "CONFIG_WAREHOUSE"
  | "CONFIG_PRINT"
  | "CONFIG_PRINT_EDIT"
  | "CONFIG_ORGANIZATION"
  | "CLICKMIG"
  | "CLICKMIG_REVIEW"
  | "CLICKMIG_KANBAN"
  | "CONFIG_CLICKMIG"
  | "AI_ADMIN"
  | "AI_MODE"
  | "WORK_EXAMPLES"
  | "PROTOCOLS_REFS";

/** Модули, не входящие ни в один пакет (legacy / совместимость). */
const STANDALONE_ATOMIC_MODULES: AppModule[] = [
  "CLIENTS",
  "ORDERS_NOTIFICATIONS",
];

/** Пакет → atomic-модули (без дублирования иерархии: каждый atomic в одном «листовом» пакете). */
export const BUNDLE_TO_ATOMIC: Record<BundleId, readonly AppModule[]> = {
  ORDERS: ["ORDERS", "ORDERS_CHAT"],
  ORDERS_MANAGE: ["ORDERS_CREATE", "ORDERS_EDIT"],
  ORDERS_NOTIFICATIONS_ADMIN: ["ORDERS_NOTIFICATIONS_ADMIN"],
  ORDERS_NOTIFICATIONS_CORRECTIONS: ["ORDERS_NOTIFICATIONS_CORRECTIONS"],
  ORDERS_NOTIFICATIONS_PROSTHETICS: ["ORDERS_NOTIFICATIONS_PROSTHETICS"],
  ORDER_HISTORY: ["ORDER_HISTORY"],
  ATTENTION: ["ATTENTION"],
  KANBAN: ["KANBAN"],
  KANBAN_WORK: [
    "KANBAN_MOVE_COLUMNS",
    "KANBAN_CARD_CHAT",
    "KANBAN_MANAGE_CHECKLIST",
    "KANBAN_EDIT_TRACK",
    "KANBAN_ATTACH_FILES",
    "KANBAN_STOP",
    "KANBAN_MANAGE_BLOCK",
  ],
  KANBAN_COORDINATE: [
    "KANBAN_EDIT_TITLE",
    "KANBAN_EDIT_DUE_DATE",
    "KANBAN_MANAGE_ASSIGNEES",
    "KANBAN_MANAGE_PARTICIPANTS",
    "KANBAN_MOVE_TO_OTHER_BOARD",
    "KANBAN_MANAGE_TIMER",
    "KANBAN_DELETE_CARD",
  ],
  ANALYTICS: ["ANALYTICS"],
  SIDEBAR_PAYMENTS: ["SIDEBAR_PAYMENTS"],
  PAYROLL: ["PAYROLL"],
  FINANCE_OFFICE: ["FINANCE_OFFICE"],
  MAIL: ["MAIL"],
  SHIPMENTS: ["SHIPMENTS"],
  WAREHOUSE: ["WAREHOUSE"],
  CLIENTS_VIEW: ["CLIENTS_VIEW"],
  CLIENTS_EDIT: ["CLIENTS_EDIT"],
  DIRECTORY: ["DIRECTORY"],
  CONFIG_KANBAN_KAITEN: [
    "CONFIG_KANBAN_BOARDS",
    "CONFIG_KANBAN_PRODUCTION",
    "CONFIG_KANBAN_CARD_TYPES",
    "CONFIG_KAITEN",
  ],
  CONFIG_PRICING: ["CONFIG_PRICING"],
  CONFIG_PRICING_CORRECTION: ["CONFIG_PRICING_CORRECTION"],
  CONFIG_ORDERS_CONTRACTS: [
    "CONFIG_ORDERS_IMPORT_EXPORT",
    "CONFIG_CONTRACT_TEMPLATE",
    "CONFIG_COSTING",
    "CONFIG_COURIERS",
  ],
  CONFIG_WAREHOUSE: ["CONFIG_WAREHOUSE"],
  CONFIG_PRINT: ["CONFIG_PRINT"],
  CONFIG_PRINT_EDIT: ["CONFIG_PRINT_EDIT"],
  CONFIG_ORGANIZATION: [
    "CONFIG_USERS",
    "CONFIG_USER_INVITES",
    "CONFIG_APPEARANCE",
    "CONFIG_MAIL",
  ],
  CLICKMIG: ["CLICKMIG"],
  CLICKMIG_REVIEW: ["CLICKMIG_REVIEW"],
  CLICKMIG_KANBAN: ["CLICKMIG_KANBAN"],
  CONFIG_CLICKMIG: ["CONFIG_CLICKMIG"],
  AI_ADMIN: ["AI_ADMIN"],
  AI_MODE: ["AI_MODE"],
  WORK_EXAMPLES: ["WORK_EXAMPLES"],
  PROTOCOLS_REFS: ["PROTOCOLS_REFS"],
};

/** Иерархия пакетов: включение дочернего требует родителя; выключение родителя — выключает детей. */
export const BUNDLE_REQUIRES: Partial<Record<BundleId, BundleId>> = {
  ORDERS_MANAGE: "ORDERS",
  KANBAN_WORK: "KANBAN",
  KANBAN_COORDINATE: "KANBAN_WORK",
  CLIENTS_EDIT: "CLIENTS_VIEW",
  CONFIG_PRINT_EDIT: "CONFIG_PRINT",
};

export type BundleMatrixGroup = {
  id: string;
  title: string;
  description?: string;
  bundles: BundleId[];
};

/** Группы пакетов в матрице «Доступ по ролям». */
export const BUNDLE_MATRIX_GROUPS: BundleMatrixGroup[] = [
  {
    id: "orders",
    title: "Заказы и наряды",
    description:
      "Список и карточка наряда. Чат наряда — в «Просмотр»; «прочитано» @лаборатория — только админы.",
    bundles: [
      "ORDERS",
      "ORDERS_MANAGE",
      "ORDER_HISTORY",
      "ORDERS_NOTIFICATIONS_ADMIN",
      "ORDERS_NOTIFICATIONS_CORRECTIONS",
      "ORDERS_NOTIFICATIONS_PROSTHETICS",
      "ATTENTION",
    ],
  },
  {
    id: "kanban",
    title: "Канбан",
    description:
      "Три уровня: вход на доски → работа участника → координация старшего техника.",
    bundles: ["KANBAN", "KANBAN_WORK", "KANBAN_COORDINATE"],
  },
  {
    id: "finance",
    title: "Финансы и аналитика",
    bundles: ["ANALYTICS", "SIDEBAR_PAYMENTS", "PAYROLL", "FINANCE_OFFICE"],
  },
  {
    id: "ops",
    title: "Операции",
    bundles: ["MAIL", "SHIPMENTS", "WAREHOUSE", "WORK_EXAMPLES", "PROTOCOLS_REFS"],
  },
  {
    id: "clients",
    title: "Клиенты",
    bundles: ["CLIENTS_VIEW", "CLIENTS_EDIT"],
  },
  {
    id: "directory",
    title: "Конфигурация",
    bundles: [
      "DIRECTORY",
      "CONFIG_KANBAN_KAITEN",
      "CONFIG_PRICING",
      "CONFIG_PRICING_CORRECTION",
      "CONFIG_ORDERS_CONTRACTS",
      "CONFIG_WAREHOUSE",
      "CONFIG_PRINT",
      "CONFIG_PRINT_EDIT",
      "CONFIG_ORGANIZATION",
    ],
  },
  {
    id: "clickmig",
    title: "КликМиг",
    bundles: ["CLICKMIG", "CLICKMIG_REVIEW", "CLICKMIG_KANBAN", "CONFIG_CLICKMIG"],
  },
  {
    id: "other",
    title: "Прочее",
    bundles: ["AI_ADMIN", "AI_MODE"],
  },
];

export const ALL_BUNDLE_IDS: BundleId[] = BUNDLE_MATRIX_GROUPS.flatMap(
  (g) => g.bundles,
);

const ATOMIC_TO_BUNDLE = new Map<AppModule, BundleId>();
for (const [bundle, atoms] of Object.entries(BUNDLE_TO_ATOMIC) as Array<
  [BundleId, readonly AppModule[]]
>) {
  for (const atom of atoms) {
    ATOMIC_TO_BUNDLE.set(atom, bundle);
  }
}

export const BUNDLE_LABELS: Record<BundleId, string> = {
  ORDERS: "Заказы: просмотр (включая чат наряда)",
  ORDERS_MANAGE: "Заказы: ведение (создание + редактирование)",
  ORDERS_NOTIFICATIONS_ADMIN: "Уведомления: admin-тег (@лаборатория)",
  ORDERS_NOTIFICATIONS_CORRECTIONS: "Уведомления: корректировки",
  ORDERS_NOTIFICATIONS_PROSTHETICS: "Уведомления: заказ протетики",
  ORDER_HISTORY: "История изменений",
  ATTENTION: "Внимание / напоминания",
  KANBAN: "Канбан: доски (вход)",
  KANBAN_WORK: "Канбан: работа на доске (участник)",
  KANBAN_COORDINATE: "Канбан: координация карточек (старший техник)",
  ANALYTICS: "Аналитика",
  SIDEBAR_PAYMENTS: "Сайдбар: блок оплат",
  PAYROLL: "Зарплата",
  FINANCE_OFFICE: "ФинОтдел",
  MAIL: "Почта",
  SHIPMENTS: "Отгрузки",
  WAREHOUSE: "Склад (раздел)",
  CLIENTS_VIEW: "Клиенты: просмотр",
  CLIENTS_EDIT: "Клиенты: изменение данных",
  DIRECTORY: "Конфигурация (хаб)",
  CONFIG_KANBAN_KAITEN: "Конфиг: канбан и Kaiten",
  CONFIG_PRICING: "Конфиг: прайс",
  CONFIG_PRICING_CORRECTION: "Конфиг: коррекция актуального прайса",
  CONFIG_ORDERS_CONTRACTS: "Конфиг: наряды и договоры",
  CONFIG_WAREHOUSE: "Конфиг: склад",
  CONFIG_PRINT: "Конфиг: печать (этикетки)",
  CONFIG_PRINT_EDIT: "Конфиг: редактирование этикеток",
  CONFIG_ORGANIZATION: "Конфиг: организация",
  CLICKMIG: "КликМиг",
  CLICKMIG_REVIEW: "КликМиг: принять / отказать заявку",
  CLICKMIG_KANBAN: "КликМиг: канбан",
  CONFIG_CLICKMIG: "Конфиг: КликМиг",
  AI_ADMIN: "ИИ-Админ",
  AI_MODE: "ИИ-Режим (заказы)",
  WORK_EXAMPLES: "Примеры работ",
  PROTOCOLS_REFS: "Протоколы и справочники",
};

/** Все atomic-модули, покрытые пакетами. */
export function allBundledAtomicModules(): AppModule[] {
  const out = new Set<AppModule>();
  for (const atoms of Object.values(BUNDLE_TO_ATOMIC)) {
    for (const a of atoms) out.add(a);
  }
  for (const m of STANDALONE_ATOMIC_MODULES) out.add(m);
  return [...out];
}

export function bundleIdForAtomic(module: AppModule): BundleId | null {
  return ATOMIC_TO_BUNDLE.get(module) ?? null;
}

export function atomsForBundle(bundle: BundleId): readonly AppModule[] {
  return BUNDLE_TO_ATOMIC[bundle];
}

/** Пакет включён, если все его atomic-модули включены. */
export function isBundleEnabled(
  access: Partial<Record<AppModule, boolean>>,
  bundle: BundleId,
): boolean {
  const atoms = BUNDLE_TO_ATOMIC[bundle];
  return atoms.every((m) => access[m] === true);
}

/** Миграция granular overrides: любой atomic пакета включён → весь пакет включён. */
export function inferBundleEnabledFromAtoms(
  access: Partial<Record<AppModule, boolean>>,
  bundle: BundleId,
): boolean {
  const atoms = BUNDLE_TO_ATOMIC[bundle];
  return atoms.some((m) => access[m] === true);
}

/** Свернуть atomic-доступ в пакеты для матрицы (с учётом старых granular overrides). */
export function collapseToBundles(
  access: Record<AppModule, boolean>,
): Record<BundleId, boolean> {
  const out = {} as Record<BundleId, boolean>;
  for (const bundle of ALL_BUNDLE_IDS) {
    out[bundle] =
      isBundleEnabled(access, bundle) ||
      inferBundleEnabledFromAtoms(access, bundle);
  }
  if (out.KANBAN_WORK || out.KANBAN_COORDINATE) {
    out.KANBAN = true;
  }
  if (out.KANBAN_COORDINATE) {
    out.KANBAN_WORK = true;
  }
  if (out.ORDERS_MANAGE) {
    out.ORDERS = true;
  }
  return out;
}

/**
 * Раскрыть пакеты в atomic: если включён любой atomic пакета — включить все atomic пакета.
 * Нужно для согласованности после миграции granular → пакеты.
 */
export function expandBundles(
  access: Record<AppModule, boolean>,
): Record<AppModule, boolean> {
  const out = { ...access };
  for (const bundle of ALL_BUNDLE_IDS) {
    if (!inferBundleEnabledFromAtoms(out, bundle)) continue;
    for (const m of BUNDLE_TO_ATOMIC[bundle]) {
      out[m] = true;
    }
  }
  // Иерархия: COORDINATE → WORK → KANBAN
  if (inferBundleEnabledFromAtoms(out, "KANBAN_COORDINATE")) {
    for (const m of [
      ...BUNDLE_TO_ATOMIC.KANBAN,
      ...BUNDLE_TO_ATOMIC.KANBAN_WORK,
      ...BUNDLE_TO_ATOMIC.KANBAN_COORDINATE,
    ]) {
      out[m] = true;
    }
  } else if (inferBundleEnabledFromAtoms(out, "KANBAN_WORK")) {
    for (const m of [...BUNDLE_TO_ATOMIC.KANBAN, ...BUNDLE_TO_ATOMIC.KANBAN_WORK]) {
      out[m] = true;
    }
  }
  if (inferBundleEnabledFromAtoms(out, "ORDERS_MANAGE")) {
    for (const m of BUNDLE_TO_ATOMIC.ORDERS_MANAGE) out[m] = true;
    for (const m of BUNDLE_TO_ATOMIC.ORDERS) out[m] = true;
  }
  if (inferBundleEnabledFromAtoms(out, "ORDERS")) {
    for (const m of BUNDLE_TO_ATOMIC.ORDERS) out[m] = true;
  }
  // Любой раздельный тип уведомлений → legacy-флаг для старых потребителей API.
  if (
    out.ORDERS_NOTIFICATIONS_ADMIN === true ||
    out.ORDERS_NOTIFICATIONS_CORRECTIONS === true ||
    out.ORDERS_NOTIFICATIONS_PROSTHETICS === true
  ) {
    out.ORDERS_NOTIFICATIONS = true;
  }
  return out;
}

/** Atomic-модули, которые нужно записать в БД при включении/выключении пакета. */
export function atomicModulesForBundleToggle(bundle: BundleId): AppModule[] {
  const atoms = [...BUNDLE_TO_ATOMIC[bundle]];
  if (bundle === "KANBAN_COORDINATE") {
    atoms.push(...BUNDLE_TO_ATOMIC.KANBAN, ...BUNDLE_TO_ATOMIC.KANBAN_WORK);
  } else if (bundle === "KANBAN_WORK") {
    atoms.push(...BUNDLE_TO_ATOMIC.KANBAN);
  } else if (bundle === "ORDERS_MANAGE") {
    atoms.push(...BUNDLE_TO_ATOMIC.ORDERS);
  }
  return [...new Set(atoms)];
}

export function requiredParentBundle(bundle: BundleId): BundleId | null {
  return BUNDLE_REQUIRES[bundle] ?? null;
}

export function childBundlesOf(bundle: BundleId): BundleId[] {
  return ALL_BUNDLE_IDS.filter((b) => BUNDLE_REQUIRES[b] === bundle);
}

export function isBundleId(value: string): value is BundleId {
  return (ALL_BUNDLE_IDS as string[]).includes(value);
}
