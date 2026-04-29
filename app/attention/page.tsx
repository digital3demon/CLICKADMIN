import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getAttentionReminders } from "@/lib/attention-reminders";

export const dynamic = "force-dynamic";

export default async function AttentionPage() {
  const items = await getAttentionReminders();

  return (
    <ModuleFrame
      title="Обратите внимание"
      description="Готовые автосверки, неполные карточки клиентов и врачей. Заказы здесь не показываются."
    >
      <div className="space-y-6">
        <p className="text-sm text-[var(--text-secondary)]">
          <strong>Сверка</strong> — сформированный по расписанию файл; переход — в
          «Финансы» клиники. <strong>Клиника</strong> в списке дополнений, если не
          заполнены адрес, юр. наименование или ИНН. <strong>Врач</strong> — если
          нет телефона, Telegram и поля «связь».
        </p>

        {items.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-900">
            Сейчас нет напоминаний: автосверки и неполные карточки отсутствуют.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Наименование</th>
                  <th className="px-4 py-3">Замечание</th>
                  <th className="px-4 py-3 w-32">Действие</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
                  >
                    <td className="px-4 py-3 text-[var(--text-body)]">
                      {row.kind === "clinic"
                        ? "Клиника"
                        : row.kind === "doctor"
                          ? "Врач"
                          : "Сверка"}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                      {row.primary}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.detail}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={row.href}
                        className="font-medium text-[var(--sidebar-blue)] hover:underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)]">
          Те же напоминания — в левой колонке меню («Обратите внимание»). Справа
          внизу в стеке показываются только корректировки из чата и заявки по
          протетике. Данные обновляются при загрузке страницы и в фоне.
        </p>
      </div>
    </ModuleFrame>
  );
}
