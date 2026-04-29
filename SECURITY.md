# Безопасность и операционный контур

Краткий аудит и то, что уже сделано в репозитории. Полный чеклист из enterprise-ТЗ (Redis, Kafka, monorepo, IoC, Sentry в проде, CI/CD, k6, Grafana и т.д.) **не реализован** — это отдельные проекты на недели/месяцы и требуют инфраструктуры и команды.

---

## 1. Аудит (кратко)

### SQL-инъекции

- Доступ к данным через **Prisma**; сырых строковых SQL в `app/` и `lib/` не найдено.
- **Рекомендация:** не вводить `$queryRaw` с конкатенацией пользовательского ввода; при необходимости только `Prisma.sql` с параметрами.

### XSS

- UI на **React** — текст по умолчанию экранируется.
- **Рекомендация:** не использовать `dangerouslySetInnerHTML` для пользовательского контента; при вставке HTML — санитайзер (DOMPurify и т.п.).

### Command injection

- Вызовов `child_process` / `exec` в коде приложения нет.

### Аутентификация и авторизация

- **Критично:** в приложении **нет входа пользователей** и **нет проверки прав** на API. Любой, кто может открыть URL/порт, может вызывать API и смотреть данные.
- **Что сделать для реальной эксплуатации:** NextAuth / Auth.js или внешний IdP, сессии или JWT, middleware с проверкой токена/сессии на `/api/*` и страницах, роли (RBAC).

### Утечки секретов

- Токен Kaiten и прочее — из `process.env`. Логгер **pino** настроен с **redact** для типичных путей (authorization, cookie, password, token).
- **Рекомендация:** не логировать тела запросов целиком; не коммитить `.env`; в проде — секреты из vault/CI.

### CORS

- Браузерный Same-Origin для типичного деплоя «один origin». Отдельный CORS для сторонних сайтов не настраивался.
- **Рекомендация:** при мобильном/внешнем клиенте — явный `Access-Control-Allow-*` только для нужных origin.

### CSP (Content-Security-Policy)

- Строгий CSP **ломает** стандартный Next.js (inline-скрипты, в т.ч. инициализация темы). В middleware CSP **не включён**.
- **Следующий шаг:** CSP с **nonce** через `next/headers` и документация Next.js — отдельная задача.

### Защита от DoS

- Лимит запросов: **middleware** на `/api/*` — скользящее окно (по умолчанию **240 запросов / 60 с / IP**), настраивается env. На одном процессе работает; для serverless без общего хранилища — слабее.
- Загрузка файлов к наряду: лимит **10 МБ** (`app/api/orders/[id]/attachments/route.ts`).

---

## 2. Что реализовано в коде

| Компонент | Описание |
|-----------|----------|
| `GET /api/health` | Проверка БД (`SELECT 1`), доступности `cwd`. Кэш в проекте не используется — в ответе `cache: not_configured`. |
| `GET /api/metrics` | Текст в формате **Prometheus** (uptime, heap, rss). В **production** без `METRICS_SECRET` — **404**. С секретом — заголовок `x-metrics-key: <METRICS_SECRET>`. |
| `middleware.ts` | Заголовки: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Rate limit на `/api`. |
| `lib/server/logger.ts` | **pino**: JSON в stdout, дочерние каналы `audit` / `security` через `auditLogger`, `securityLogger`. |
| `lib/server/api-timing.ts` | Обёртка `withApiTiming` — лог `api_request` с `ms` и `status`. Подключено к **GET/POST `/api/orders`**. |
| Аудит | После успешного **создания заказа** — запись `auditLogger.info({ action: 'order.create', orderId, orderNumber })`. |

**Ротация файлов логов:** не настроена — логи идут в **stdout**; ротацию делает systemd, Docker, Kubernetes или обратный прокси.

**Sentry:** пакет не подключён. Подключение: `@sentry/nextjs`, переменная `SENTRY_DSN`, wizard в документации Sentry.

**UptimeRobot / StatusCake:** настройка внешних URL на `https://<host>/api/health` — в панели сервиса, не в репозитории.

---

## 3. Из большого ТЗ сознательно не сделано (нужны решения и ресурсы)

- Централизованный Redis, двухуровневый кэш, бенчмарк 1000 concurrent.
- Inversify/TSyringe, Repository повсеместно, микросервисы, RabbitMQ/Kafka, gRPC, API Gateway.
- Turbo monorepo, плагинная система, LaunchDarkly-like feature flags, админка конфигов.
- Покрытие >80%, Playwright, k6, Stryker, OWASP ZAP в CI, blue-green, canary.
- Lighthouse CI, Grafana, bundle budget в пайплайне.
- Storybook, OpenAPI, локальный SSL — по желанию отдельными задачами.

Если нужно продолжить — лучше выбрать **1–2 направления** (например: только Auth + Sentry, или только Redis-кэш для тяжёлых API).
