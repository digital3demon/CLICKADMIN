import { PLAIN_TEXT_URL_RE } from "@/lib/linkify-plain-text";

export type AwaitingDataValue = {
  isAwaiting: boolean;
  reason: string | null;
} | null;

/** Яндекс.Диск, Google Drive, Mail.ru Cloud и т.п. */
const CLOUD_STORAGE_URL_RE =
  /https?:\/\/(?:disk\.yandex\.(?:ru|com)|yadi\.sk|drive\.google\.com|cloud\.mail\.ru)/iu;

/** Клиент уже дал ссылку («прикрепляю», «вот ссылка»), а не обещает прислать позже. */
const LINK_ALREADY_SENT_RE =
  /(?:прикрепля(?:ю|ем)|отправля(?:ю|ем)|влож(?:ил|ила|ены)|даю|высыла(?:ю|ем)|см\.?\s*ссылк|по\s+ссылке)[^.!\n]{0,100}?(?:ссылк|яндекс\.?\s*диск|disk\.yandex)/iu;

/** «…где есть КТ, сканы…» — данные уже на диске по ссылке. */
const DATA_ON_LINK_RE =
  /(?:где|там|на\s+(?:диске|ссылке))[^.\n]{0,80}?(?:есть|лежат|находятся?)[^.!\n]{0,80}?(?:кт|скан|mri|мрт|фото|stl)/iu;

/** Обещание прислать позже — только если нет http-ссылки в тексте. */
const FUTURE_DATA_PROMISE_RE =
  /(?:пришл(?:ю|ем)|дошл(?:ю|ем)|отправ(?:лю|им)|скину|вышл(?:ю|ем))[^.\n]{0,50}?(?:позже|завтра|отдельно|в\s+течение)/iu;

function extractHttpUrls(text: string): string[] {
  return [...text.matchAll(PLAIN_TEXT_URL_RE)]
    .map((m) => m[0]?.trim() ?? "")
    .filter(Boolean);
}

function hasCloudStorageUrl(text: string): boolean {
  return extractHttpUrls(text).some((url) => CLOUD_STORAGE_URL_RE.test(url));
}

function hasHttpUrl(text: string): boolean {
  return extractHttpUrls(text).length > 0;
}

/**
 * Сбрасывает ложный awaitingData, когда ссылка и данные уже в письме.
 * Класс ошибки: резолв/логика — LLM путает «прикрепляю ссылку» с «пришлю ссылку позже».
 */
export function normalizeAwaitingDataFromEmailText(
  awaitingData: AwaitingDataValue,
  emailText: string,
): AwaitingDataValue {
  if (!awaitingData?.isAwaiting) return awaitingData;

  const text = emailText.trim();
  if (!text) return awaitingData;

  const cloudLink = hasCloudStorageUrl(text);
  const anyLink = hasHttpUrl(text);
  const reason = (awaitingData.reason ?? "").trim().toLowerCase();
  const reasonMentionsLink = /ссылк|яндекс|диск|disk/i.test(reason);

  if (reasonMentionsLink && (cloudLink || anyLink)) {
    return null;
  }

  if ((cloudLink || anyLink) && LINK_ALREADY_SENT_RE.test(text)) {
    return null;
  }

  if ((cloudLink || anyLink) && DATA_ON_LINK_RE.test(text)) {
    return null;
  }

  // «Прикрепляю ссылку на яндекс диск, где есть КТ, сканы» — типичный кейс без явного https в reason
  if (
    cloudLink &&
    /(?:прикрепля(?:ю|ем)|отправля(?:ю|ем))[^.\n]{0,120}?(?:яндекс|диск)/iu.test(text) &&
    /(?:кт|скан)/iu.test(text)
  ) {
    return null;
  }

  return awaitingData;
}

export function deriveSourceDataFlagsFromEmailText(
  emailText: string,
  flags: { hasScans: boolean; hasCt: boolean; hasMri: boolean; hasPhoto: boolean },
): { hasScans: boolean; hasCt: boolean; hasMri: boolean; hasPhoto: boolean } {
  const text = emailText.trim();
  if (!text) return flags;

  let { hasScans, hasCt, hasMri, hasPhoto } = flags;

  if (/(?:^|[\s,.(])скан(?:ы|ов|а)?(?:$|[\s,.)])/iu.test(text)) hasScans = true;
  if (/(?:^|[\s,.(])кт(?:$|[\s,.)])|cbct|cone[\s-]?beam/iu.test(text)) hasCt = true;
  if (/\b(?:мрт|mri)\b/iu.test(text)) hasMri = true;
  if (/(?:^|[\s,.(])фото(?:$|[\s,.)])|\bphoto\b/iu.test(text)) hasPhoto = true;

  if (hasCloudStorageUrl(text) && DATA_ON_LINK_RE.test(text)) {
    if (/(?:кт|cbct)/iu.test(text)) hasCt = true;
    if (/скан/iu.test(text)) hasScans = true;
  }

  return { hasScans, hasCt, hasMri, hasPhoto };
}

export function isFutureDataPromiseWithoutLink(emailText: string): boolean {
  const text = emailText.trim();
  if (!text || hasHttpUrl(text)) return false;
  return FUTURE_DATA_PROMISE_RE.test(text);
}
