import type { ReconciliationFrequency } from "@prisma/client";

export function reconciliationFrequencyShort(
  v: ReconciliationFrequency | null,
): string | null {
  if (v === "MONTHLY_1") return "1× в мес.";
  if (v === "MONTHLY_2") return "2× в мес.";
  return null;
}

/** Текст ячейки «Сверка» в списке клиник + подсказка для title. */
export function clinicReconciliationListCell(works: boolean, freq: ReconciliationFrequency | null): {
  text: string;
  title: string;
} {
  if (!works) {
    return { text: "Нет", title: "Не работают по сверке" };
  }
  const short = reconciliationFrequencyShort(freq);
  if (short) {
    return {
      text: `Да · ${short}`,
      title: `По сверке: ${short === "1× в мес." ? "1 раз в месяц" : "2 раза в месяц"}`,
    };
  }
  return {
    text: "Да",
    title: "По сверке; периодичность не указана — задайте в карточке клиники",
  };
}
