/** Карта модуля: корзина 5 суток, подписи в МСК, даты в БД — ISO DateTime. */

export const WORK_EXAMPLE_TRASH_DAYS = 5;
export const WORK_EXAMPLE_TRASH_MS = WORK_EXAMPLE_TRASH_DAYS * 24 * 60 * 60 * 1000;
export const WORK_EXAMPLE_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const WORK_EXAMPLE_MAX_FILES_PER_UPLOAD = 40;

export const WORK_EXAMPLE_FILE_KINDS = ["PHOTO", "CAD", "FILE"] as const;
export type WorkExampleFileKindValue = (typeof WORK_EXAMPLE_FILE_KINDS)[number];

export type WorkExampleCardTypeSnap = { id: string; name: string };

export type WorkExampleCompositionLine = {
  name: string;
  quantity: number;
  unitPriceRub: number;
  lineTotalRub: number;
};
