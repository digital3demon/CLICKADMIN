# Миграции

Этот пример намеренно **без** тяжёлого раннера в `package.json`. Выберите один путь:

## 1. Вручную

Выполните `001_users.sql` в MySQL (Workbench, CLI, CI).

## 2. Knex

```bash
npm install -D knex
npx knex init
```

Настройте `knexfile.cjs` на `mysql2`, положите SQL в `migrations/`, команды: `npx knex migrate:latest` / `migrate:rollback`.

## 3. db-migrate

Отдельный пакет `db-migrate` + `db-migrate-mysql` — удобно, если уже используете его в другом сервисе.

Главное правило: **схема версионируется в репозитории**, а приложение в проде стартует после применения миграций.
