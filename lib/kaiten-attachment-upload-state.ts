/** Маркер «выгрузка в Kaiten в процессе» — не считать успешной выгрузкой. */
export const KAITEN_PUSH_IN_FLIGHT_AT = new Date(0);

export function isOrderAttachmentUploadedToKaiten(
  uploadedToKaitenAt: Date | null | undefined,
): boolean {
  if (!uploadedToKaitenAt) return false;
  return uploadedToKaitenAt.getTime() > KAITEN_PUSH_IN_FLIGHT_AT.getTime();
}
