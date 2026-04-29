import {
  URGENT_MENU_OPTIONS,
  URGENT_NO_COEF,
  URGENT_UNSET,
} from "@/lib/order-urgency";

/** Метка запроса для POST list-tags: разблокировка Kaiten без сохранения тега. */
export const QUICK_TAG_KAITEN_UNBLOCK_LABEL = "разблокировать" as const;

/** Метка для POST list-tags вместе с `blockReason`: блокировка Kaiten без тега в CRM. */
export const QUICK_TAG_KAITEN_BLOCK_LABEL = "заблокировать" as const;

export type QuickOrderTagSuggestion =
  | {
      id: string;
      title: string;
      subtitle?: string;
      /** Тело PATCH /api/orders/[id] */
      patch: Record<string, unknown>;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      /** POST list-tags с этой меткой: для «разблокировать» — только Kaiten, без тега. */
      listTagLabel: string;
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      /** Подставить метку и запросить причину перед отправкой. */
      kaitenBlockFlow: true;
    };

const norm = (s: string) => s.trim().toLocaleLowerCase("ru-RU");

/** Подстрока или префикс по одному из полей (ускорение ввода из списка заказов). */
function matchesQuery(
  queryRaw: string,
  title: string,
  keywords: string[],
): boolean {
  const q = norm(queryRaw);
  if (q.length < 2) return false;
  const blob = norm([title, ...keywords].join(" "));
  if (blob.includes(q)) return true;
  const t = norm(title);
  if (t.startsWith(q)) return true;
  return keywords.some((k) => norm(k).startsWith(q) || norm(k).includes(q));
}

const URGENT_ROWS: Array<
  QuickOrderTagSuggestion & { _keys: string[] }
> = (() => {
  const out: Array<QuickOrderTagSuggestion & { _keys: string[] }> = [];
  for (const opt of URGENT_MENU_OPTIONS) {
    const keys = [
      "срочность",
      "срочно",
      "срочный",
      "коэффициент",
      "kef",
      "кэф",
      opt.label.replace(/×/g, "x"),
      opt.value,
    ];
    out.push({
      id: `urgent-${opt.value}`,
      title: `Срочность: ${opt.label}`,
      subtitle:
        opt.value === URGENT_UNSET
          ? "Снять срочность, пересчёт суммы ×1"
          : opt.value === URGENT_NO_COEF
            ? "Срочно без числового коэффициента"
            : "Обновит шапку наряда и пересчёт стоимости работ",
      patch: { urgentSelection: opt.value },
      _keys: keys,
    });
  }
  return out;
})();

const OTHER: Array<QuickOrderTagSuggestion & { _keys: string[] }> = [
  {
    id: "invoice-printed-true",
    title: "Счёт распечатан",
    subtitle: "Как кнопка в «Документооборот»",
    patch: { invoicePrinted: true },
    _keys: [
      "счет",
      "счёт",
      "распечатан",
      "распечатанный",
      "сф",
      "печать счета",
      "печать счёта",
    ],
  },
  {
    id: "invoice-printed-false",
    title: "Снять: счёт распечатан",
    subtitle: "Убрать отметку «Счёт распечатан»",
    patch: { invoicePrinted: false },
    _keys: [
      "снять счет",
      "снять счёт",
      "не распечатан",
      "убрать распечатан",
    ],
  },
  {
    id: "prosthetics-true",
    title: "Протетика заказана",
    subtitle: "Отметить заказ протетики",
    patch: { prostheticsOrdered: true },
    _keys: ["протетика", "протез", "заказана", "ортопедия"],
  },
  {
    id: "prosthetics-false",
    title: "Снять: протетика заказана",
    patch: { prostheticsOrdered: false },
    _keys: ["снять протетика", "нет протетики"],
  },
];

const ALL = [...URGENT_ROWS, ...OTHER];

export type QuickOrderTagSuggestionsOpts = {
  /** Показать действие «Разблокировать в Kaiten» при вводе «разблокировать» и т.п. */
  kaitenBlocked?: boolean;
  /** Есть карточка Kaiten и наряд сейчас не в блокировке — показать «Заблокировать». */
  kaitenCanBlock?: boolean;
};

/**
 * Подсказки «активных» полей наряда для поиска в модалке тега списка заказов.
 */
export function filterQuickOrderTagSuggestions(
  query: string,
  opts?: QuickOrderTagSuggestionsOpts,
): QuickOrderTagSuggestion[] {
  const q = query.trim();
  const out: QuickOrderTagSuggestion[] = [];

  if (
    opts?.kaitenBlocked === true &&
    q.length >= 2 &&
    matchesQuery(q, "Разблокировать в Kaiten", [
      "разблокировать",
      "разблок",
      "снять блокировку",
      "снять блок",
      "unblock",
    ])
  ) {
    out.push({
      id: "kaiten-unblock-via-list-tag",
      title: "Разблокировать в Kaiten",
      subtitle: "Снимет блокировку карточки в Kaiten без добавления тега в список",
      listTagLabel: QUICK_TAG_KAITEN_UNBLOCK_LABEL,
    });
  }

  if (
    opts?.kaitenCanBlock === true &&
    q.length >= 2 &&
    matchesQuery(q, "Заблокировать в Kaiten", [
      "заблокировать",
      "блокировка",
      "заблок",
      "block",
      "остановить",
    ])
  ) {
    out.push({
      id: "kaiten-block-via-list-tag",
      title: "Заблокировать в Kaiten",
      subtitle:
        "Подставит метку «заблокировать» — укажите причину ниже и нажмите «Добавить»",
      kaitenBlockFlow: true,
    });
  }

  if (q.length < 2) {
    return out;
  }

  const hit = ALL.filter((row) =>
    matchesQuery(q, row.title, row._keys),
  ).map(({ _keys: _x, ...rest }) => rest as QuickOrderTagSuggestion);

  return [...out, ...hit];
}
