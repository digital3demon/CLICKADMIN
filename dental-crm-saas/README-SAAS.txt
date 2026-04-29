# dental-crm-saas

Отдельная коммерческая (SaaS) сборка. Лаборатория — в корне репозитория (родительская папка).

- cd dental-crm-saas
- npm install
- npx prisma generate
- скопируйте .env.example в .env и настройте (отдельная БД/секреты).
- npm run build — в next.config уже CRM_BUILD=commercial
- обновить дерево: удалить dental-crm-saas и снова node scripts/bootstrap-dental-crm-saas.cjs из лаб-корня
