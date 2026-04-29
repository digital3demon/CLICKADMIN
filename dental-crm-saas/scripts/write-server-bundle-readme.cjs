/**
 * Единый текст README-SERVER-BUNDLE.txt для архива (package-server-archive.ps1 / .sh).
 *   node scripts/write-server-bundle-readme.cjs <stageDir> <bundleName> <stamp> <prismaVersion>
 */
const fs = require("fs");
const path = require("path");

const stage = process.argv[2];
const bundleName = process.argv[3];
const stamp = process.argv[4];
const prismaVer = process.argv[5];

if (!stage || !bundleName || !stamp || !prismaVer) {
  console.error(
    "Usage: node scripts/write-server-bundle-readme.cjs <stageDir> <bundleName> <stamp> <prismaVersion>",
  );
  process.exit(1);
}

const out = path.join(stage, "README-SERVER-BUNDLE.txt");

const text = `dental-lab-crm — архив для Linux-сервера (${stamp})
Каталог в архиве: ${bundleName}

В архиве нет .env и нет базы (если не собирали с флагом -WithDb): скопируйте SQLite-файл на сервер,
укажите DATABASE_URL в .env, остальные переменные — по .env.example в этом же каталоге.

1) Распаковать (пример):
   mkdir -p /path/to && tar xzf ${bundleName}.tar.gz -C /path/to
   cd /path/to/${bundleName}

2) Node на сервере — как у разработчика: см. .nvmrc в архиве (сейчас 22.x) и package.json engines (>=20.16). Иначе будут предупреждения Next/pdfjs.

3) Файл .env рядом с server.js (в архиве лежит .env.example; при необходимости см. env-kaiten-server.template.env).

   Обязательно:
   - AUTH_SECRET (не короче 16 символов)
   - DATABASE_URL — SQLite. Если БД лежит ВНЕ папки приложения, укажите абсолютный путь, например:
     DATABASE_URL="file:/home/c501315/click-lab.online/www/dev.db"
     (после file: для Unix — один слэш перед home; без кавычек в .env обычно тоже работает)

   Рекомендуется:
   - ORDER_ATTACHMENT_STORAGE_DIR — корень для файлов вложений к заказам (иначе: <cwd>/data/order-attachments).
     Пример: /home/c501315/click-lab.online/www/data/order-attachments
   - CRM_PUBLIC_BASE_URL — публичный URL (письма, getSiteOrigin / QR и т.д.); редиректы входа в middleware — относительные /login?… и не зависят от Host у Node

4) Миграции Prisma (нужен интернет один раз для npx). Запускать из корня выкладки (рядом с server.js), где лежит папка prisma/:
   PRISMA_VER="$(tr -d '\\r\\n' < .prisma-cli-version)"
   npx "prisma@${prismaVer}" migrate deploy --schema=prisma/schema.prisma
   Версия также в .prisma-cli-version
   Если вы только подложили готовую БД с тем же schema — по ситуации; при ошибках схемы всё равно разберитесь с migrate.

5) Prisma на Linux после сборки на Windows:
   В schema.prisma задан binaryTargets (native + debian-openssl-3.0.x) — после "npm run build" в архив попадают оба движка.
   Если всё же увидите wrong platform, в каталоге приложения: npx prisma@${prismaVer} generate
   Либо собирайте архив в WSL/Linux, совпадающем с сервером.

6) Запуск:
   NetAngels (проверено): PATH = каталог приложения, например
   /home/…/www/dental-lab-crm-server
   APP_PATH = тот же каталог + /start-netangels.cjs
   Панель передаёт APP_IP и APP_PORT — start-netangels.cjs подставляет их в PORT и CRM_BIND_HOST для Next (иначе nginx даёт 502).
   Файл start-netangels.cjs лежит в корне архива: подгружает .env (если строка ещё не задана панелью) и запускает server.js.

   Универсально: node server.js
   PM2: pm2 start ecosystem.config.cjs && pm2 save

   Порт: PORT (по умолчанию 3000). Привязка: CRM_BIND_HOST (см. server.js после repair-standalone).
   Если панель задаёт unix-переменную HOSTNAME и сокет «молчит», в .env укажите CRM_BIND_HOST=0.0.0.0

Сборка архива: ${stamp}
`;

fs.writeFileSync(out, text, { encoding: "utf8" });
console.log("write-server-bundle-readme:", out);
