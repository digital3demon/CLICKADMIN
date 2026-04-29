export type OrderCorrectionTrackValue =
  | "ORTHOPEDICS"
  | "ORTHODONTICS"
  | "REWORK";

export const ORDER_CORRECTION_TRACK_VALUES: readonly OrderCorrectionTrackValue[] =
  ["ORTHOPEDICS", "ORTHODONTICS", "REWORK"];

export const ORDER_CORRECTION_TRACK_LABELS: Record<
  OrderCorrectionTrackValue,
  string
> = {
  ORTHOPEDICS: "Ортопедия",
  ORTHODONTICS: "Ортодонтия",
  REWORK: "Переделка",
};

export function isOrderCorrectionTrack(
  v: string,
): v is OrderCorrectionTrackValue {
  return (ORDER_CORRECTION_TRACK_VALUES as readonly string[]).includes(v);
}
