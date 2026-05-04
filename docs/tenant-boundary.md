# Tenant Boundary

Личная CRM работает как один технический tenant по умолчанию. Пользователь не
видит tenant UI и не выбирает tenant вручную.

SaaS-копия использует тот же бизнес-код, но tenant становится обязательной
границей изоляции данных.

Правило для нового серверного кода:

- получать Prisma через `getDbClients()` или domain helpers из
  `lib/get-domain-prisma.ts`;
- проверять ресурсы по `tenantId` на routes вида `.../[id]`;
- не создавать новый `PrismaClient` напрямую из `DATABASE_URL` в API handlers;
- legacy sync-клиент `getPricingPrismaClient()` оставлен для старых handlers и
  должен постепенно заменяться на tenant-aware helpers.

Так lab-версия остаётся простой, а SaaS-версия не требует отдельной ветки
бизнес-логики.
