/**
 * Канал документооборота клиники: ЭДО, бумажные доки, оба.
 * Без клиники / оба флага выкл — «бумдоки» (бывш. «БЕЗ ЭДО»).
 */

export type ClinicDocChannel = "edo" | "paper" | "edoPaper";

export function clinicDocChannel(
  worksWithEdo: boolean,
  usesPaperDocs: boolean,
): ClinicDocChannel {
  if (worksWithEdo && usesPaperDocs) return "edoPaper";
  if (worksWithEdo) return "edo";
  return "paper";
}

export function clinicDocChannelLabel(channel: ClinicDocChannel): string {
  switch (channel) {
    case "edo":
      return "ЭДО";
    case "paper":
      return "бумдоки";
    case "edoPaper":
      return "ЭДО+бумдоки";
  }
}

/** URL-тег фильтра ФинОтдела (совпадает с LIST_TAG_*). */
export function clinicDocChannelListTag(channel: ClinicDocChannel): string {
  switch (channel) {
    case "edo":
      return "edo";
    case "paper":
      return "no-edo";
    case "edoPaper":
      return "edo-paper";
  }
}
