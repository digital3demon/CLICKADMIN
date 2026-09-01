function formatFinanceListDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Серверные ячейки дат — без client JS на строке. */
export function FinanceOfficeOrderRowReadonlyDates({
  dueDate,
  appointmentDate,
  dueToAdminsAt,
}: {
  dueDate: string | null;
  appointmentDate: string | null;
  dueToAdminsAt: string | null;
}) {
  return (
    <>
      <td className="min-w-0 w-[4.5rem] break-words px-1 py-2 text-center align-middle text-[var(--text-secondary)]">
        {formatFinanceListDate(dueDate)}
      </td>
      <td className="min-w-0 w-[4.5rem] break-words px-1 py-2 text-center align-middle text-[var(--text-secondary)]">
        {formatFinanceListDate(appointmentDate ?? dueToAdminsAt)}
      </td>
    </>
  );
}
