# Безопасность CRM

Контур: Timeweb App Platform, PostgreSQL, S3, JWT-сессия. Portable ZIP / `CRM_SINGLE_USER` — **наследие**, не режим эксплуатации.

---

## Что уже есть

### Вход и права

- Сессия: JWT (`jose`), cookie `crm_session` / `crm_session_demo` — **httpOnly**, `SameSite=lax`, в production обычно `Secure`.
- Middleware проверяет сессию на закрытых страницах и `/api/*` (кроме явного public: логин, health, webhook, QR-стикер, ClickMig public).
- Роли и модули (RBAC). На production флаг `NEXT_PUBLIC_CRM_SINGLE_USER` / `CRM_SINGLE_USER` **запрещён**: контейнер не стартует, API не открывается без входа.

### Секреты

- Токены и пароли — из `process.env`. **pino** с redact (authorization, cookie, password, token).
- Не коммитить `.env`. `/api/metrics` в production без `METRICS_SECRET` — **404**.
- Публичный GET `/api/telegram/webhook` в production не отдаёт username бота и URL. Полный отчёт — у владельца в «Конфигурация → Telegram».
- Ключ ClickMig не кладётся в `NEXT_PUBLIC_*` на страницах CRM.

### Лимиты

- Middleware: **300 запросов / 60 с** на IP без сессии; **5000 / 60 с** при наличии cookie сессии (офисный NAT). Env: `RATE_LIMIT_IP_MAX_PER_WINDOW`, `RATE_LIMIT_AUTH_MAX_PER_WINDOW`.
- Вход (login, reset-password, invite, bootstrap, telegram-webapp): **~60 / 15 мин на IP** и **~10 / 15 мин на почту**.
- Вложения наряда: лимит приложения **1 ГиБ** (`CRM_UPLOAD_MAX_BYTES`). Прокси App Platform часто режет раньше — это платформа, не баг CRM. `middlewareClientMaxBodySize` = `1gb`.

### Данные

- Доступ через **Prisma**. Не вводить `$queryRaw` с конкатенацией пользовательского ввода.
- Пользователи API фильтруются по `tenantId` сессии.
- S3-ключи только под `orders/`, `tenants/`, `clickmig/`, `crm-dumps/`. Диск: путь не выходит из корня.

### Заголовки

- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- HSTS — только при `CRM_HSTS=1`.
- Строгий CSP **не включён** (ломает inline Next.js / тему). Nonce — отдельная задача.

### Намеренно публичное

- QR-стикер `/p/t/…` — физический токен наклейки, не «дыра без логина».
- `GET /api/health` — живость процесса и БД, без env и версий.

---

## Не делать «заодно»

- Обязательный `TELEGRAM_WEBHOOK_SECRET`, пока `setWebhook` не совпадает — бот замолчит.
- Фильтр клиник по `tenantId` без проверки строк в БД.
- Включать `productionBrowserSourceMaps`.

---

## Сознательно не в этом контуре

Redis, Kafka, Sentry в проде, CSP-nonce, DOMPurify на HTML писем — отдельные волны, не текущий сервер лабы.
