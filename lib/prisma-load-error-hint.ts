import { Prisma } from "@prisma/client";

/**
 * Краткая подсказка по ошибке загрузки страницы для отображения админу (без чувствительных данных).
 */
export function prismaLoadErrorUserHint(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2022":
        return (
          "Код P2022: в базе нет колонки, которую ожидает приложение. " +
          "Часто это значит, что после выкладки не выполнили «generate» или процесс Node не перезапускали: " +
          "в каталоге приложения снова запустите node scripts/prisma-migrate-deploy.cjs и перезапустите сайт."
        );
      case "P2025":
        return "Запись не найдена (P2025). Обновите страницу или проверьте данные.";
      case "P2002":
        return "Конфликт уникального ограничения (P2002). Обновите страницу.";
      default:
        return `Ошибка Prisma ${error.code}. Подробности — в логах процесса Node (pm2 logs, journal и т.д.).`;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return (
      "Не удалось инициализировать подключение к базе. Проверьте DATABASE_URL в .env процесса Node " +
      "(тот же файл SQLite, что при migrate deploy), права на файл и каталог."
    );
  }

  const msg =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/database is locked/i.test(msg)) {
    return (
      "SQLite сообщает «database is locked»: параллельный доступ к одному файлу или долгая транзакция. " +
      "Перезапустите приложение, убедитесь, что к той же БД не подключён второй процесс."
    );
  }
  if (/unable to open database file/i.test(msg)) {
    return (
      "Не удаётся открыть файл базы: проверьте путь в DATABASE_URL относительно каталога запуска Node " +
      "и что это тот же путь, что выводит prisma migrate (Datasource «…» в терминале)."
    );
  }
  if (/SQLITE_READONLY/i.test(msg) || /readonly database/i.test(msg)) {
    return "База открыта только для чтения: проверьте права на файл SQLite и каталог.";
  }

  return null;
}
