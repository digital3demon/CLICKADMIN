# Том 1. Инфраструктура и деплой (Timeweb)

## 1.1. Стек и runtime

| Слой | Технология | Файлы |
|------|------------|-------|
| UI | React 19 + Next.js 15 App Router | `app/**`, `components/**` |
| API | Route Handlers `app/api/**/route.ts` | Server-only |
| ORM | Prisma 6, engineType `binary` | `prisma/schema.prisma` |
| БД | PostgreSQL | `DATABASE_URL` |
| Файлы | S3-compatible + legacy disk | `lib/s3-client.ts`, `lib/order-attachment-storage.ts` |
| Почта | IMAP (`imapflow`) + SMTP (`nodemailer`) | `lib/mail/**` |
| ИИ | HTTP API (SprutDock / OpenRouter slug) | `lib/llm/llm-client.ts` |

**Prisma binary targets** (для Linux на NetAngels/Timeweb):

```prisma
generator client {
  provider      = "prisma-client-js"
  engineType    = "binary"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

---

## 1.2. Сборка и деплой

### Команда build

```powershell
Set-Location "c:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run build
```

Скрипт (`package.json`):

1. `prisma generate`
2. `node scripts/prisma-migrate-deploy.cjs` — миграции + deploy-time repair
3. `next build` — output `standalone`
4. `node scripts/copy-standalone-assets.cjs`
5. `node scripts/verify-standalone-after-build.cjs`

### Standalone

Next.js собирается в `.next/standalone/`. На Timeweb / Docker — `node server.js` или `npm run start:platform`. PM2 только на VPS: `scripts/ecosystem.config.cjs` (не класть в корень — App Platform ставит `pm2` глобально).

**Инвариант:** не полагаться на `node_modules` на проде — только standalone bundle + Prisma binary.

---

## 1.3. Переменные окружения (ключевые)

### PostgreSQL

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/dental_lab_crm?schema=public
```

### S3 (Timeweb Object Storage)

```env
S3_ENABLED=true
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
```

**Почему `S3_FORCE_PATH_STYLE`:** многие S3-совместимые провайдеры (включая Timeweb) требуют path-style URL (`endpoint/bucket/key`), а не virtual-hosted.

### Legacy disk (если S3 выключен)

```env
ORDER_ATTACHMENT_STORAGE_DIR=/var/data/order-attachments
```

Корень по умолчанию: `{cwd}/data/order-attachments`.

### Cron / internal secrets

```env
CRON_SECRET=...
INTERNAL_MAIL_SYNC_SECRET=...
INTERNAL_KAITEN_CHAT_SYNC_SECRET=...
```

### ИИ (ключ в БД, не в .env)

`Tenant.aiApiKey`, `Tenant.aiModel`, `Tenant.aiEnabled` — настраиваются в UI `/ai-admin`.

### Датасет ИИ

```env
AI_DATASET_DIR=/var/data/ai-dataset
```

По умолчанию: `{cwd}/data/ai-dataset/{tenantId}-YYYY-MM.jsonl`.

### Kaiten

```env
KAITEN_API_TOKEN=...
KAITEN_API_URL=...
# board/space/column ids — см. lib/kaiten-config.ts
```

---

## 1.4. PostgreSQL: доступ из приложения

### Prisma clients

| Функция | Файл | Назначение |
|---------|------|------------|
| `getOrdersPrisma()` | `lib/get-domain-prisma.ts` | Orders, mail links, AI predictions |
| `getClientsPrisma()` | то же | Clinics, doctors |
| `getPricingPrisma()` | то же | Price list |
| `getPrisma()` | `lib/get-prisma.ts` | Control plane (users, tenants) |

**Правило tenant boundary** (`docs/tenant-boundary.md`):

- Не создавать `new PrismaClient()` в route handlers.
- Все запросы к tenant-данным: `where: { tenantId }`.

### Миграции

Папка: `prisma/migrations/`. Именование: `YYYYMMDDHHMMSS_description`.

Применение на деплое: `scripts/prisma-migrate-deploy.cjs` (обёртка над `prisma migrate deploy` + repair hooks).

---

## 1.5. S3: запись и чтение вложений

### Алгоритм (`lib/order-attachment-storage.ts`)

```
function saveOrderAttachment(orderId, attachmentId, bytes, contentType):
  if isS3StorageEnabled():
    key = "orders/{orderId}/attachments/{attachmentId}"
    putS3ObjectBytes(key, bytes, contentType)
    return diskRelPath = "s3:" + key
  else:
    path = ORDER_ATTACHMENT_STORAGE_ROOT/orders/{orderId}/{attachmentId}
    writeFile(path, bytes)
    return diskRelPath = "orders/{orderId}/{attachmentId}"

function readOrderAttachment(diskRelPath):
  if diskRelPath starts with "s3:":
    key = strip prefix
    return getS3ObjectBytes(key)
  else:
    return readFile(absolutePathFromRel(diskRelPath))
```

### Mail attachments

Аналогичный слой: `lib/mail/mail-attachment-storage.ts`.

### Миграция на S3

`scripts/migrate-order-attachments-to-s3.cjs` — batch upload legacy disk → S3.

Env: `ATTACHMENTS_MIGRATE_S3_ON_DEPLOY`, `ATTACHMENTS_MIGRATE_S3_DRY_RUN`, `ATTACHMENTS_MIGRATE_S3_BATCH`.

---

## 1.6. Фоновые задачи (Cron)

| Endpoint | Расписание (типично) | Назначение |
|----------|----------------------|------------|
| `GET /api/cron/mail-sync` | каждые 1–5 мин | IMAP priority sync |
| `GET /api/cron/kaiten-chat-sync` | каждые 1–5 мин | Импорт комментариев Kaiten |
| `GET /api/cron/orders-archive-cleanup` | daily | Удаление архивов по retention |
| `GET /api/cron/reconciliation-snapshots` | monthly | Авто-снимки сверок |
| `POST /api/cron/profile-doctors` | optional | LLM → `Doctor.aiParticulars` |

### Авторизация cron (`middleware.ts`)

```
if path starts with /api/cron/:
  if Authorization Bearer matches CRON_SECRET → allow
  if path is mail-sync and header INTERNAL_MAIL_SYNC_SECRET matches → allow
  if path is kaiten-chat-sync and header INTERNAL_KAITEN_CHAT_SYNC_SECRET matches → allow
```

---

## 1.7. Логирование

| Компонент | Путь |
|-----------|------|
| Pino structured logs | `lib/server/logger.ts` |
| CRM daily JSONL logs | `data/logs/crm-YYYY-MM-DD.log` (`lib/server/log-dir.ts`) |
| Log export UI | `app/directory/logs`, `lib/server/crm-log-export.ts` |

Env: `LOG_DIR`, `LOG_RETENTION_DAYS` (default 30).

---

## 1.8. Rate limiting (Edge middleware)

`lib/server/rate-limit-edge.ts` — лимиты на `/api/*` по IP и auth endpoints.

Исключения: session, toasts, search-suggest (см. `middleware.ts`).

---

## 1.9. Деплой на Timeweb: чеклист

1. PostgreSQL создан, `DATABASE_URL` в env приложения.
2. S3 bucket создан, ключи в env, `S3_FORCE_PATH_STYLE=true`.
3. `npm run build` на CI или сервере.
4. Standalone + `server.js` за reverse proxy (nginx).
5. Cron: внешний scheduler бьёт `/api/cron/*` с `Authorization: Bearer $CRON_SECRET`.
6. Почта: пароли приложений Яндекс в `EmailAccount` (encrypted, `lib/mail/encryption.ts`).
7. Kaiten token в env, интеграция включена в tenant settings.

---

## 1.10. Синхронизация Lab → SaaS

```powershell
Set-Location "c:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run sync:saas
```

Скрипт: `scripts/sync-saas-from-lab.cjs` → соседняя папка `dental-crm-saas`.

**Не копируется:** `*.db` файлы. **Копируется:** `.env*` при синке.
