# Dental Lab CRM — тестовая база данных

В проекте **схема БД (Prisma)**, **сиды** и **веб-интерфейс** на Next.js: слева колонка меню (липкая по высоте экрана), справа модули — ширина **1 : 6**.

## Где лежит проект

`C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm`

Раньше копия могла быть в `C:\Users\sevas\Projects\dental-lab-crm`. **Рабочую копию используйте из папки «Курсор проекты»**; старую папку можно удалить после того, как закроете её в Cursor и других программах.

**Коммерция / SaaS** вынесена в отдельную папку `dental-crm-saas/` (см. `README-SAAS.txt` внутри). Пересобрать копию с лаба: удалить `dental-crm-saas`, затем в корне лаба `npm run bootstrap:saas`.

## Что нужно на компьютере

- **Node.js** LTS (вместе с **npm**): https://nodejs.org/

Проверка в PowerShell:

```powershell
node -v
npm -v
```

## Первый запуск (PostgreSQL)

Откройте терминал в корне проекта:

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm install
npm run db:migrate
npm run db:seed
```

- `npm install` — ставит Prisma и клиент.
- `db:migrate` — применяет миграции Prisma к PostgreSQL.
- `db:seed` — заполняет тестовыми данными (клиника «КлиникаКлик», врачи, демо-заказ).

## Интерфейс (Next.js)

После `npm install`:

```powershell
npm run dev
```

Откройте в браузере адрес, который покажет терминал (обычно http://localhost:3000). Каркас: общий `AppShell` с боковым меню и областью страницы справа.

## Просмотр данных в браузере (Prisma Studio)

```powershell
npm run db:studio
```

Можно смотреть и править таблицы напрямую.

## Полезные команды

| Команда | Назначение |
|--------|------------|
| `npm run db:generate` | Пересобрать Prisma Client после смены `schema.prisma` |
| `npm run db:push` | Применить схему к БД без новой миграции (удобно на черновике) |
| `npm run db:migrate` | Новая миграция в процессе разработки |
| `npm run db:seed` | Повторно выполнить сид |
| `npm run package:windows` | Переносимая папка + zip: вшивается **текущий** `prisma\dev.db`, если он есть (первый запуск без seed) |
| `npm run package:windows:empty` | То же, но без базы — на первом запуске `db push` + seed |

Подробности: `scripts\PORTABLE-WINDOWS-RU.txt` после сборки лежит в `dist\dental-lab-crm-portable\`.

## Файл настроек БД

В корне лежит `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dental_lab_crm?schema=public"
LEGACY_SQLITE_URL="file:./prisma/dev.db"
```

`LEGACY_SQLITE_URL` используется только для разового переноса данных SQLite -> PostgreSQL.

## Что зашито в сиде

- Клиника: **КлиникаКлик**, адрес: **Спб, Улица Тест, дом1**
- Врачи: **Иванов И.И.**, **Сергеева А.В.**
- Заказы **00000001** (сдача «сегодня» по МСК) и **00000002** («завтра») с примерами: зубы, мост, сплинт

## Дальше

- Подключить фронтенд (например Next.js) и API, использующие `@prisma/client`.
- Для runbook миграции SQLite -> PostgreSQL см. [`scripts/POSTGRES-MIGRATION-RUNBOOK.md`](scripts/POSTGRES-MIGRATION-RUNBOOK.md).
