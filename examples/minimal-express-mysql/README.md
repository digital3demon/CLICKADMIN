# Минимальный Express + MySQL2 (promise) + Zod

Образец **без лишних слоёв**: один вертикальный срез `users`, `async/await`, централизованный `errorHandler`, конфиг через `dotenv` + проверка env **Zod** при старте.

Не является частью CRM: отдельные зависимости, свой `npm install`.

## Запуск

```bash
cd examples/minimal-express-mysql
cp .env.example .env
# заполните MYSQL_* и создайте таблицу (см. migrations/)
npm install
npm run dev
```

Проверка: `GET /users/1`, `POST /users` с телом `{"name":"Ann","email":"a@b.c"}`.

## Структура

| Путь | Назначение |
|------|------------|
| `src/config.ts` | `dotenv` + Zod-схема окружения |
| `src/db.ts` | пул `mysql2/promise` |
| `src/errors.ts` | `AppError`, `NotFoundError`, `ValidationError`, middleware, `asyncHandler` |
| `src/models/` | типы домена |
| `src/repositories/` | только SQL к пулу |
| `src/services/` | бизнес-правила (например «не найден») |
| `src/routes/` | HTTP + Zod-тела |

## Про основной проект `dental-lab-crm`

Там уже **Next.js + Prisma** и свои миграции — этот каталог только шаблон под отдельный сервис на Express.
