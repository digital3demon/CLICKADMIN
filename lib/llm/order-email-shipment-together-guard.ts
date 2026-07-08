/** Просьба отправить/отвезти текущую работу вместе с другим заказом — не второй пациент в наряде. */
export type ShipTogetherRequest = {
  relatedPatientName: string | null;
  relatedOrderNote: string | null;
};

const SHIP_TOGETHER_ACTION_RE =
  /(?:отправ(?:ьте|ить|ля(?:ю|ем))|отвез(?:ти|ите)|привез(?:ти|ите)|переда(?:ть|йте)|высла(?:ть|лайте)|отправ(?:ь|)те\s+работу)/iu;

const SHIP_TOGETHER_TARGET_RE =
  /(?:вместе|одной\s+(?:посылк|доставк|отправк)|совместн(?:о|ая)\s+(?:доставк|отправк))/iu;

const SHIP_WITH_OTHER_ORDER_RE =
  /(?:вместе\s+с|совместно\s+с)[^.!\n]{0,100}?(?:предыдущ(?:им|ей|его)?\s+(?:заказ|наряд)|друг(?:им|ой|ого)\s+(?:заказ|наряд|работ))/iu;

const PREVIOUS_ORDER_MENTION_RE =
  /(?:предыдущ(?:ий|его|ем|им|ей)\s+(?:заказ|наряд)|друг(?:ой|ого)\s+(?:заказ|наряд))/iu;

const MULTIPLE_PATIENTS_WARNING_RE =
  /несколько\s+пациент|обработан\s+только\s+перв/i;

function extractRelatedOrderFromText(text: string): Pick<ShipTogetherRequest, "relatedPatientName" | "relatedOrderNote"> {
  const afterPrevious = text.match(
    /(?:предыдущ(?:им|ей|его)?\s+(?:заказ|наряд)|друг(?:им|ой|ого)\s+(?:заказ|наряд))[^.!\n]{0,60}?\(([^)]+)\)/iu,
  );
  const parenMatch = afterPrevious ?? text.match(/\(([^()]{5,120})\)/u);
  if (!parenMatch?.[1]) {
    return { relatedPatientName: null, relatedOrderNote: null };
  }

  const relatedOrderNote = parenMatch[1].trim();
  const namePart = relatedOrderNote.split(/[,;]/)[0]?.trim() ?? "";
  const relatedPatientName =
    /^[\p{L}][\p{L}\s.-]{1,60}$/u.test(namePart) && namePart.split(/\s+/).length <= 4
      ? namePart
      : null;

  return { relatedPatientName, relatedOrderNote };
}

/** Клиент просит общую доставку с другим заказом, а не оформляет второй наряд в том же письме. */
export function detectShipTogetherRequest(text: string): ShipTogetherRequest | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const hasShipAction = SHIP_TOGETHER_ACTION_RE.test(trimmed);
  const hasShipTarget = SHIP_TOGETHER_TARGET_RE.test(trimmed);
  const hasOtherOrder = SHIP_WITH_OTHER_ORDER_RE.test(trimmed) || PREVIOUS_ORDER_MENTION_RE.test(trimmed);

  if (!(hasOtherOrder && (hasShipTarget || hasShipAction))) {
    return null;
  }

  return {
    ...extractRelatedOrderFromText(trimmed),
  };
}

function buildShipTogetherWarning(
  request: ShipTogetherRequest,
  currentPatientName: string | null | undefined,
): string {
  const currentLabel = currentPatientName?.trim() || "текущий пациент";
  const relatedLabel =
    request.relatedPatientName?.trim() ||
    request.relatedOrderNote?.trim() ||
    "другой заказ";

  return (
    `Клиент просит отправить работу (${currentLabel}) вместе с другим заказом (${relatedLabel}). ` +
    "Уточните: подогнать срок этой работы под тот заказ или сдвинуть срок того заказа?"
  );
}

export function normalizeWarningsForShipTogetherRequest(
  warnings: string[],
  emailText: string,
  currentPatientName: string | null | undefined,
): { warnings: string[]; shipTogetherRequest: ShipTogetherRequest | null } {
  const request = detectShipTogetherRequest(emailText);
  if (!request) {
    return { warnings, shipTogetherRequest: null };
  }

  const filtered = warnings.filter((w) => !MULTIPLE_PATIENTS_WARNING_RE.test(w));
  const actionable = buildShipTogetherWarning(request, currentPatientName);

  if (filtered.some((w) => w.includes("вместе с другим заказом"))) {
    return { warnings: filtered, shipTogetherRequest: request };
  }

  return { warnings: [...filtered, actionable], shipTogetherRequest: request };
}
