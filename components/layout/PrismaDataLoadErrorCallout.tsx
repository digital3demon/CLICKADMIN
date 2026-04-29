import { prismaLoadErrorUserHint } from "@/lib/prisma-load-error-hint";

/**
 * Подсказка при сбое загрузки страницы из-за БД / Prisma.
 * На сервере после migrate deploy обязателен `prisma generate` — иначе клиент и схема расходятся.
 */
export function PrismaDataLoadErrorCallout({
  title = "Сбой загрузки из базы",
  intro,
  error,
}: {
  /** Заголовок карточки; по умолчанию нейтральный, страница может подставить свою формулировку */
  title?: string;
  /** Короткий контекст, напр. «Чаще всего это значит…» */
  intro: string;
  /** Исключение из catch — покажем узкую подсказку (код Prisma и т.д.) */
  error?: unknown;
}) {
  const isProd = process.env.NODE_ENV === "production";
  const hint = prismaLoadErrorUserHint(error ?? null);
  const showTechnical =
    process.env.SHOW_DB_LOAD_ERROR_DETAILS === "1" ||
    process.env.NODE_ENV !== "production";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:px-5 sm:py-5 sm:text-base">
      <p className="font-medium text-amber-950">{title}</p>
      <p className="mt-2 text-amber-900/90">{intro}</p>
      {hint ? (
        <p className="mt-3 border-t border-amber-200/80 pt-3 text-amber-950">{hint}</p>
      ) : (
        <p className="mt-3 border-t border-amber-200/80 pt-3 text-sm text-amber-900/90">
          Если миграции уже выполнялись, чаще всего не совпадает файл базы или не перезапущен процесс
          Node после скрипта. Сверьте путь из вывода Prisma в SSH с{" "}
          <code className="rounded bg-amber-100/90 px-1">DATABASE_URL</code> у службы сайта и
          перезапустите приложение.
        </p>
      )}
      {showTechnical && error != null ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-amber-100/80 px-3 py-2 text-xs text-amber-950">
          {error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error)}
        </pre>
      ) : null}
      {isProd ? (
        <>
          <p className="mt-3 font-medium text-amber-950">
            На сервере (в каталоге выкладки, под пользователем процесса Node):
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-amber-100/80 px-3 py-2.5 font-mono text-sm text-amber-950">
            node scripts/prisma-migrate-deploy.cjs
          </pre>
          <p className="mt-2 text-sm text-amber-800">
            Скрипт выполняет <code className="rounded bg-amber-100/90 px-1">migrate deploy</code>,{" "}
            <code className="rounded bg-amber-100/90 px-1">prisma generate</code> и служебные
            проверки SQLite. После успешного завершения{" "}
            <strong className="font-semibold">обязательно перезапустите</strong> процесс сайта (pm2,
            systemd и т.д.). Проверьте{" "}
            <code className="rounded bg-amber-100/90 px-1">DATABASE_URL</code> в{" "}
            <code className="rounded bg-amber-100/90 px-1">.env</code> у этого процесса и логи.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-amber-900/90">
            Для локальной разработки остановите dev-сервер и выполните:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-amber-100/80 px-3 py-2.5 font-mono text-sm text-amber-950">
            npx prisma db push{"\n"}npx prisma generate
          </pre>
          <p className="mt-2 text-sm text-amber-800">
            Если снова будет ошибка EPERM на Windows — закройте Cursor/антивирус на минуту
            или перезагрузите ПК, затем повторите generate.
          </p>
        </>
      )}
    </div>
  );
}
