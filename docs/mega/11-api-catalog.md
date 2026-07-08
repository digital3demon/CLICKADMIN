# Том 11. Каталог API

> ~240 route handlers. Группировка по доменам.  
> Общий контракт: JSON, session cookie, `tenantId` из JWT.

---

## 11.1. Auth

| Method | Path | Назначение |
|--------|------|------------|
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/session` | Текущая сессия |

---

## 11.2. Users & RBAC

| Method | Path | Назначение |
|--------|------|------------|
| GET/POST | `/api/users` | Список / invite |
| PATCH/DELETE | `/api/users/[id]` | Пользователь |
| GET/PATCH | `/api/role-module-access` | Матрица модулей |
| GET/PATCH | `/api/me/profile` | Профиль |
| GET/PATCH | `/api/me/ui-design` | Тема UI |

---

## 11.3. Orders (ядро)

| Method | Path | Назначение |
|--------|------|------------|
| GET/POST | `/api/orders` | Список / create |
| GET/PATCH/DELETE | `/api/orders/[id]` | Карточка (+ self-correction `after()`) |
| POST | `/api/orders/ai-prefill` | Черновик из письма |
| GET | `/api/orders/continuation-search` | Поиск для «продолжение» |
| GET/POST | `/api/orders/[id]/attachments` | Вложения |
| GET | `/api/orders/[id]/source-emails` | Письма-источники |
| POST | `/api/orders/[id]/auto-reply` | Автоответ клиенту |
| POST | `/api/orders/[id]/invoice-parse` | Парсинг счёта |
| GET | `/api/revisions` | История ревизий |

### Kaiten sub-routes

| Path | Назначение |
|------|------------|
| `/api/orders/[id]/kaiten` | Card sync |
| `/api/orders/[id]/kaiten/chat` | Chat |
| `/api/orders/[id]/kaiten/comments` | Comments |
| `/api/orders/[id]/kaiten-assignees` | Assignees |
| `/api/orders/kaiten-titles-sync` | Bulk title sync |

### Chat corrections / prosthetics

| Path | Назначение |
|------|------------|
| `/api/orders/[id]/chat-corrections` | `!!!` заявки |
| `/api/orders/[id]/chat-corrections/[id]/accept` | Принять |
| `/api/orders/[id]/prosthetics-requests` | `???` заявки |

---

## 11.4. Mail

| Method | Path | Назначение |
|--------|------|------------|
| GET/POST | `/api/mail/accounts` | Ящики |
| GET/PATCH | `/api/mail/accounts/[id]` | Ящик |
| POST | `/api/mail/accounts/[id]/sync` | Sync one |
| POST | `/api/mail/sync` | Sync all |
| GET | `/api/mail/sync/status` | Статус очереди |
| GET | `/api/mail/emails` | Список писем |
| GET/PATCH | `/api/mail/emails/[id]` | Письмо (read flag!) |
| GET/POST | `/api/mail/folders` | Папки |
| POST | `/api/mail/send` | SMTP send |
| GET/PUT | `/api/mail/accounts/[id]/reply-template` | Шаблон ответа |

---

## 11.5. AI Admin

| Method | Path | Назначение |
|--------|------|------------|
| GET/PATCH | `/api/ai-admin/settings` | Модель, ключ |
| POST | `/api/ai-admin/test-model` | Проверка API |
| GET | `/api/ai-admin/diffs?page&limit` | Diff Viewer (paginated) |
| GET | `/api/ai-admin/diffs/[id]/resolve-initial` | Initial resolve |
| POST | `/api/ai-admin/batch-analyze` | Self-correction batch |
| GET | `/api/ai-admin/export` | JSONL export |
| POST | `/api/ai-admin/backtest` | Backtest run |

---

## 11.6. Clients & Pricing

| Method | Path | Назначение |
|--------|------|------------|
| CRUD | `/api/clinics`, `/api/clinics/[id]` | Клиники |
| CRUD | `/api/doctors`, `/api/doctors/[id]` | Врачи |
| GET/PATCH | `/api/clinics/[id]/contract` | Договор |
| CRUD | `/api/price-list-items` | Прайс |

---

## 11.7. Kanban & Tenant

| Path | Назначение |
|------|------------|
| `/api/kanban/linked-orders` | Связанные наряды |
| `/api/kanban/members-backfill` | Backfill members |
| `/api/tenant/kanban-column-catalog` | Колонки |
| `/api/tenant/kaiten-integration` | Вкл/выкл Kaiten |
| `/api/kaiten-ui-options` | UI options |

---

## 11.8. Finance & Payroll

| Path | Назначение |
|------|------------|
| `/api/payroll/entries` | Начисления |
| `/api/payroll/config/*` | Import/export config |
| `/api/payroll/options` | Справочники |
| Reconciliation routes | Сверки (см. `app/api/reconciliation*`) |

---

## 11.9. Cron (секрет)

| GET | Path |
|-----|------|
| `/api/cron/mail-sync` | |
| `/api/cron/kaiten-chat-sync` | |
| `/api/cron/orders-archive-cleanup` | |
| `/api/cron/reconciliation-snapshots` | |
| `/api/cron/profile-doctors` | |

Auth: `Authorization: Bearer $CRON_SECRET` или internal headers.

---

## 11.10. Notifications (polling)

| GET | Path |
|-----|------|
| `/api/order-notifications/toasts` | |
| `/api/order-chat-messages/toasts` | |
| `/api/order-chat-corrections/toasts` | |
| `/api/order-prosthetics-requests/toasts` | |

---

## 11.11. Analytics & Logs

| Path | Назначение |
|------|------------|
| `/api/analytics/deadlines/*` | Сроки, экспорт |
| `/api/directory/logs/export` | CRM logs download |
| `/api/directory/logs/info` | Meta |

---

## 11.12. ClickMIG (отдельный модуль)

Префикс `/api/clickmig/` — заявки, видео, публичный кабинет, auth.

UI: `app/clickmig/`, `app/p/clickmig/`.

---

## 11.13. Telegram

`POST /api/telegram/webhook` — bot webhook.

---

## 11.14. Шаблон нового route

```typescript
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/role-module-access";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  assertModuleAccess(session, "ORDERS");

  const db = await getOrdersPrisma();
  const rows = await db.order.findMany({
    where: { tenantId: session.tenantId },
    take: 50,
  });

  return NextResponse.json({ rows });
}
```

---

## 11.15. Коды ошибок (конвенция)

| Code | Когда |
|------|-------|
| 401 | Нет сессии |
| 403 | Нет модуля / роли |
| 404 | Нет ресурса **в tenant** |
| 400 | Zod validation fail |
| 409 | Conflict (duplicate) |
| 500 | Unhandled (лог в pino) |
