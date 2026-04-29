/**
 * Удаляет все наряды (Order) и каскадно связанные строки (ревизии, конструкции, теги,
 * движения склада по наряду, вложения в БД). Клиники, врачи, пользователи, прайс,
 * типы карточек Kaiten и прочие справочники не удаляются.
 *
 * Файлы вложений на диске (diskRelPath) этот скрипт не чистит — при необходимости
 * удалите каталог хранилища вручную или добавьте отдельный проход.
 *
 * Запуск из корня проекта:
 *   node --env-file=.env scripts/clear-orders-keep-clinics-doctors.cjs --yes
 *
 * npm:
 *   npm run db:orders:clear -- --yes
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(
      "Удаление нарядов необратимо. Запустите с флагом --yes:\n" +
        "  npm run db:orders:clear -- --yes",
    );
    process.exit(1);
  }

  const n = await prisma.order.count();
  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      data: { continuesFromOrderId: null, invoiceAttachmentId: null },
    });
    await tx.order.deleteMany({});
  });
  console.log(`Удалено нарядов: ${n}`);
  console.log(
    "\nКанбан в браузере: карточки, привязанные к нарядам, исчезнут после обновления страницы канбана.\n" +
      "Чтобы сбросить и ручные карточки (без наряда), в консоли на сайте выполните:\n" +
      "  localStorage.removeItem('kanban-app-state-v3');\n" +
      "  localStorage.removeItem('kanban-app-state-v2');\n" +
      "  localStorage.removeItem('kanban-app-state-v1');\n" +
      "затем перезагрузите страницу.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
