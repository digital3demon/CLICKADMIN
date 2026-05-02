# Control-plane vs Tenant DB split

## Control-plane DB (`DATABASE_URL`)

Храним платформенные сущности:

- `Tenant` (slug, routing, plan, tenantDatabaseUrl*)
- `User` (учетные записи и auth)
- `RoleModuleAccess`
- подписка/инвойсы и системные токены

Почему: эти данные нужны до выбора tenant БД (логин, маршрутизация, доступы).

## Tenant DB (`tenantDatabaseUrl`)

Храним операционные данные CRM:

- `Clinic`, `Doctor`, `Order`
- канбан/карточки, прайс, склад, файлы нарядов, аналитические данные
- `TenantClientState`, `UserClientState` (UI state, синхронизация устройств)

Почему: полная изоляция данных клиентов и независимые бэкапы.

## Текущий этап внедрения

- Код маршрутизации уже выбирает tenant DB при включенном `tenantDatabaseEnabled`.
- Если tenant DB не включена, система работает в режиме совместимости через shared DB.
- Схемы для генерации клиентов:
  - `prisma/control/schema.prisma`
  - `prisma/tenant/schema.prisma`
