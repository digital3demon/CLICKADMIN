# SQLite -> PostgreSQL Runbook (dev first)

## 1) Подготовка

1. Остановите dev-сервер и Prisma Studio.
2. Убедитесь, что PostgreSQL запущен локально.
3. Проверьте `.env`:
   - `DATABASE_URL=postgresql://...`
   - `LEGACY_SQLITE_URL=file:./prisma/dev.db`
4. Сделайте бэкап текущей БД:

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run db:backup
```

## 2) Подготовить схему в PostgreSQL

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run db:push
npm run db:generate
```

## 3) Dry-run миграции

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run db:migrate:sqlite-to-pg:dry-run
```

## 4) Выполнить перенос

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run db:migrate:sqlite-to-pg
```

Если целевая PostgreSQL БД не пустая и это ожидаемо:

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run db:migrate:sqlite-to-pg:force
```

## 5) Валидация

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run db:validate:sqlite-to-pg
```

Дополнительно вручную проверить:
- открывается список заказов;
- `GET /api/clinics` возвращает клиники/врачей;
- создание и редактирование наряда;
- импорт/экспорт xlsx.

## 6) Rollback (если что-то пошло не так)

1. Верните `DATABASE_URL` обратно на SQLite (`file:...`).
2. Запустите приложение на SQLite.
3. При необходимости восстановите бэкап из `prisma/backups`.

## 7) После успешного dev

- Повторить те же шаги в прод в maintenance-окне.
- Перед прод-ETL обязательно сделать отдельный бэкап PostgreSQL и SQLite.
