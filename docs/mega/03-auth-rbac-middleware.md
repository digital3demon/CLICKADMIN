# Том 3. Аутентификация, RBAC, Middleware

---

## 3.1. Сессия и JWT

### Поток входа

```
POST /api/auth/login
  → validate credentials (bcrypt)
  → create session row (Session table)
  → set httpOnly cookie (JWT signed with AUTH_SECRET)
```

Файлы:
- `lib/auth.ts` — verify JWT, decode userId/tenantId/role
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`

### Cookie

HttpOnly, Secure в production, SameSite=Lax. Имя из env или default.

### `getSession()` / `requireSession()`

Server components и API routes вызывают `requireSession()` → `{ userId, tenantId, role, email }`.

**Инвариант:** `tenantId` из JWT, не из body/query.

---

## 3.2. Роли

| Роль | Типичный доступ |
|------|-----------------|
| `ADMIN` | Полный доступ, AI Admin, настройки |
| `MANAGER` | Наряды, клиенты, почта |
| `TECHNICIAN` | Производство, kanban |
| `ACCOUNTANT` | Финансы, сверки |
| `VIEWER` | Read-only модули |

Точный список: enum `UserRole` в `schema.prisma`.

---

## 3.3. RBAC по модулям

### Модули (`AppModule`)

Примеры: `ORDERS`, `ORDERS_CREATE`, `CLIENTS`, `MAIL`, `KANBAN`, `KANBAN_ATTACH_FILES`, `FINANCE_OFFICE`, `AI_ADMIN`, `SETTINGS`.

### Разрешение

```
function canAccessModule(session, module):
  defaults = ROLE_MODULE_DEFAULTS[session.role]
  if defaults[module] is defined → return it
  override = RoleModuleAccess.find(tenantId, role, module)
  return override?.allowed ?? false
```

Файлы:
- `lib/role-module-defaults.ts`
- `lib/role-module-access.ts`
- `app/api/settings/role-modules/route.ts`

### UI gate

`components/ModuleGate.tsx` — скрывает навигацию и страницы.

### API gate

Каждый route в начале: `requireSession()` + `assertModuleAccess(session, 'ORDERS')`.

---

## 3.4. Middleware (`middleware.ts`)

### Matcher

Все пути кроме `_next/static`, `_next/image`, `favicon.ico`, публичных assets.

### Логика (псевдокод)

```
function middleware(request):
  path = request.nextUrl.pathname

  if path matches PUBLIC_ROUTES → next()
  if path matches /api/cron/* → verify CRON_SECRET or internal secrets → next() or 401
  if path matches /api/auth/login → rate limit → next()
  if path matches /sticker/* with public token → next()

  session = readJwtFromCookie(request)
  if !session → redirect /login (pages) or 401 (api)

  if path matches /api/* → rate limit by IP
  if path matches /ai-admin → require ADMIN + AI_ADMIN module

  return next()
```

### Публичные маршруты

- `/login`
- `/sticker/[token]` — публичный стикер наряда
- Health checks (если есть)

---

## 3.5. Tenant boundary

### Lab

Один tenant в БД; `tenantId` всё равно обязателен в каждом запросе.

### SaaS

```
host = request.headers.get('host')
slug = extractSubdomain(host)  // lib/tenant-slug.ts
tenant = Tenant.findUnique({ slug })
```

**Запрещено:** `findUnique({ where: { id } })` без `tenantId` для tenant-scoped моделей.

Документ: `docs/tenant-boundary.md`.

---

## 3.6. Email account roles

`EmailAccount.allowedRoles` — какие роли видят ящик в UI почты.

Фильтрация в `app/mail/page.tsx` и API mail routes.

---

## 3.7. AI Admin access

Только:
- `role === ADMIN`
- модуль `AI_ADMIN` allowed
- `Tenant.aiEnabled === true`

Страница: `app/ai-admin/page.tsx` → `AiAdminClient.tsx`.

---

## 3.8. Безопасность вложений

### Order attachments API

`GET /api/orders/[id]/attachments/[attId]` — require session + tenant match.

### S3 keys

Не отдаются клиенту напрямую; только через signed proxy или server read.

---

## 3.9. Rate limiting

| Endpoint group | Лимит |
|----------------|-------|
| `/api/auth/*` | строгий (brute force) |
| `/api/*` общий | per-IP sliding window |
| Исключения | session poll, toasts, search-suggest |

Файл: `lib/server/rate-limit-edge.ts`.

---

## 3.10. Чеклист для нового API route

1. `export const runtime = 'nodejs'` (если Prisma/fs).
2. `const session = await requireSession()`.
3. `assertModuleAccess(session, 'MODULE')`.
4. Все `where`: `{ id, tenantId: session.tenantId }`.
5. Не логировать пароли, API keys, тела писем целиком.
6. Для PATCH — `recordOrderRevision` при изменении наряда.
