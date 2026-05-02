# Tenant-per-Database Runbook

## Архитектура

- **Control-plane DB** (`DATABASE_URL`): tenant-реестр, пользователи, доступы, подписка.
- **Tenant DB** (`tenantDatabaseUrl` в `Tenant`): операционные данные CRM.
- Если `tenantDatabaseEnabled=false`, tenant работает в режиме совместимости через shared DB.

## Поля tenant routing

В таблице `Tenant`:

- `tenantDatabaseUrl`
- `tenantDatabaseEnabled`
- `tenantDatabaseReadyAt`

## Включение нового tenant DB

1. Подготовить новую Postgres БД.
2. Применить миграции:
   - `DATABASE_URL=<TENANT_DB_URL> npx prisma migrate deploy`
3. Проверить доступ:
   - `DATABASE_URL=<TENANT_DB_URL> npx prisma db execute --stdin <<< "select 1;"`
4. Обновить tenant routing:
   - через `POST /api/internal/tenants/provision` c `activate=true`
   - или скриптом миграции.

## Миграция текущего tenant

```bash
cd ~/YOUR_PATH/dental-lab-crm
export DATABASE_URL='postgresql://...control...'
export TARGET_TENANT_DB_URL='postgresql://...tenant...'
export TENANT_SLUG='your-tenant'
npm run tenant:migrate:current
```

## Rollback routing

```bash
cd ~/YOUR_PATH/dental-lab-crm
export DATABASE_URL='postgresql://...control...'
export TENANT_SLUG='your-tenant'
npm run tenant:routing:rollback
```

## Важные ограничения текущей версии

- Скрипт `tenant:migrate:current` рассчитан на текущий этап, когда в control DB фактически один tenant.
- Полный per-tenant экспорт/импорт по `tenantId` (multi-tenant в shared DB) выделен в отдельную задачу.
