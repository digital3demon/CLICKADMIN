# Том 10. UI и маршруты (App Router)

---

## 10.1. Структура `app/`

Next.js 15 App Router. Server Components по умолчанию; клиентские формы — `'use client'`.

```
app/
├── layout.tsx              # Root layout, nav
├── page.tsx                # Dashboard / redirect
├── login/                  # Auth
├── orders/                 # Наряды
├── clients/                # Клиники и врачи
├── mail/                   # Почта
├── kanban/                 # CRM Kanban
├── ai-admin/               # ИИ админка
├── finance-office/         # Финансы
├── shipments/              # Отгрузки / стикеры
├── warehouse/              # Склад
├── payroll/                # Зарплаты
├── analytics/              # Аналитика сроков
├── attention/              # Inbox внимания
├── directory/              # Настройки
├── clickmig/               # ClickMIG модуль
└── p/                      # Public pages (sticker, clickmig form)
```

---

## 10.2. Навигация и RBAC

`components/ModuleGate.tsx` + sidebar в layout.

Пользователь видит только модули с `canAccessModule(session, module)`.

Настройка ролей: `app/directory/access/page.tsx`.

---

## 10.3. Наряды

| Маршрут | Назначение |
|---------|------------|
| `/orders` | Список активных нарядов |
| `/orders/new` | Создание |
| `/orders/[id]` | Карточка наряда (редактирование) |
| `/orders/archived` | Архив |
| `/orders/history` | История изменений (глобально) |

### Карточка наряда

- Состав (constructions table)
- Вложения upload/preview
- Связанные письма
- Kaiten panel (если включено)
- Ревизии
- Статусы, сроки, оплата

### AI prefill

При создании из письма — `POST /api/orders/ai-prefill` заполняет черновик до save.

---

## 10.4. Клиенты

| Маршрут | Назначение |
|---------|------------|
| `/clients` | Список клиник |
| `/clients/[id]` | Карточка клиники + таблица нарядов |
| `/clients/doctors/[id]` | Карточка врача |
| `/clients/history` | История взаимодействий |

Таблица нарядов на карточке: `lib/client-card-orders-table.ts`.

Финансы клиники: `lib/clinic-finance.ts`.

---

## 10.5. Почта

`/mail` — трёхколоночный UI:
- папки
- список писем
- просмотр + действия (создать наряд, ответить)

Настройки ящиков: `/directory/mail`.

---

## 10.6. AI Admin

`/ai-admin` → `AiAdminClient.tsx`

### Блоки UI

1. Настройки модели / test model
2. **Diff Viewer** — side-by-side prediction vs order
3. Пагинация 10/стр, «Показано X–Y из Z»
4. Warnings от ИИ
5. **«Возможная блокировка от ИИ»** — если `awaitingData.isAwaiting`
6. Кнопки: retry, batch analyze, export JSONL

---

## 10.7. Kanban

`/kanban` → `KanbanApp.tsx`

Drag-and-drop колонки, карточки заказов и standalone.

Настройка досок: `/directory/kanban-boards`, `/directory/kaiten`.

---

## 10.8. Отгрузки и стикеры

| Маршрут | Назначение |
|---------|------------|
| `/shipments` | Обзор отгрузок |
| `/shipments/today` | На сегодня |
| `/shipments/tomorrow` | На завтра |
| `/shipments/period` | За период |
| `/shipments/stickers-print` | Печать стикеров |

Публичный стикер: `/p/t/[tenantSlug]/s/[token]` или `/sticker/...`.

---

## 10.9. Directory (настройки)

| Маршрут | Содержание |
|---------|------------|
| `/directory` | Хаб настроек |
| `/directory/users` | Пользователи |
| `/directory/access` | RBAC матрица |
| `/directory/price` | Прайс |
| `/directory/mail` | Почтовые аккаунты |
| `/directory/kaiten` | Kaiten integration |
| `/directory/logs` | Экспорт логов |
| `/directory/print` | Печать |
| `/directory/contracts` | Шаблоны договоров |
| `/directory/warehouse` | Склад settings |
| `/directory/payroll` | Payroll config |
| `/directory/appearance` | UI theme |

---

## 10.10. UX-паттерны

### Toasts / notifications

Polling endpoints:
- `/api/order-notifications/toasts`
- `/api/order-chat-messages/toasts`
- `/api/order-chat-corrections/toasts`
- `/api/order-prosthetics-requests/toasts`

### Search suggest

Глобальный поиск нарядов/клиентов — rate limit исключение в middleware.

### Loading / empty / error

Server pages: `loading.tsx` где есть; client — spinner + message.

**Инвариант:** пустой список показывает текст «нет данных», не белый экран.

### Формы

React Hook Form + zod resolver в крупных формах (orders, clients).

Optimistic UI редко — prefer server revalidate (`revalidatePath`).

---

## 10.11. Публичные страницы

| Маршрут | Auth |
|---------|------|
| `/login` | Нет |
| `/p/t/.../s/[token]` | Token в URL |
| `/p/clickmig/*` | ClickMIG client portal |

---

## 10.12. Компоненты (ключевые)

```
components/
├── ModuleGate.tsx
├── orders/          # формы, таблицы нарядов
├── clients/         # карточки клиник/врачей
├── mail/            # список писем, viewer
├── kanban/          # KanbanApp, columns
└── ui/              # shadcn-style primitives
```

---

## 10.13. Revalidation

После мутаций API:
- `revalidatePath('/orders')`
- `revalidatePath('/clients/[id]')`
- `lib/revalidate-after-doctor-clinic-link.ts`

Используется Next.js cache invalidation для Server Components.
