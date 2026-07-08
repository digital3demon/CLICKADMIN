# Том 8. Kaiten и CRM Kanban

---

## 8.1. Два канбана

| Система | Когда | Хранение |
|---------|-------|----------|
| **Kaiten** | `Tenant.kaitenIntegrationEnabled` | `Order.kaitenCardId`, API Kaiten |
| **CRM Kanban** | `addonKanban` / standalone | `demoKanbanColumn`, `KanbanStandaloneCard` |

Lab может использовать оба или только CRM kanban.

---

## 8.2. Kaiten REST API

Конфиг: `lib/kaiten-config.ts`, env `KAITEN_API_TOKEN`, `KAITEN_API_URL`.

Типичные операции:
- Create card on order create
- Update column on status change
- Mirror title: `kaitenCardTitleMirror`

### Card types

`KaitenCardType.externalTypeId` ↔ `type_id` в API.

---

## 8.3. Синхронизация чата Kaiten

Cron: `GET /api/cron/kaiten-chat-sync`

Импорт комментариев с карточки в CRM inbox.

### Сигналы в комментариях

| Маркер | Действие |
|--------|----------|
| `!!!` | `OrderChatCorrection` — заявка на корректировку |
| `???` | `OrderProstheticsRequest` — запрос ортопедии |

Парсинг: см. `lib/kaiten-chat-sync.ts` (или аналог в репо).

### Admin mention

`Tenant.kanbanAdminMentionTag` — тег для уведомления админа в чате.

---

## 8.4. Telegram уведомления

`Tenant.adminSharedTelegramChatId`, `adminSharedMessengerNotifyPrefs`

При событиях kanban/chat → webhook/bot (см. `lib/telegram-*` если есть).

---

## 8.5. CRM Kanban (встроенный)

Страница: `app/kanban/` → `KanbanApp.tsx`

### Колонки

Demo columns на `Order.demoKanbanColumn` или конфиг колонок tenant.

### Standalone cards

`KanbanStandaloneCard` — задачи без Order (внутренние дела лаборатории).

### RBAC

Модуль `KANBAN`, отдельно `KANBAN_ATTACH_FILES` для вложений на карточке.

---

## 8.6. Связь Order ↔ Kaiten

При create/update order:
```
if kaitenIntegrationEnabled:
  if !order.kaitenCardId:
    card = kaitenApi.createCard({ title, column, ... })
    save kaitenCardId
  else:
    kaitenApi.updateCard(...)
```

При архивации — опционально закрыть карточку (политика в sync service).

---

## 8.7. Inbox чата

`OrderChatInboxItem` — очередь для админа:
- новые `!!!` / `???`
- упоминания admin tag

UI: раздел kanban или orders inbox (см. `app/` routes).

---

## 8.8. Production calendar

`Tenant.productionCalendarCountry`, `labDueHmSlots` (JSON)

Расчёт сроков `dueDate` с учётом рабочих дней и слотов HM.

---

## 8.9. Публичный стикер

`Order.stickerPublicToken` — `/sticker/[token]` без логина.

QR на производстве для быстрого доступа к наряду.

---

## 8.9. Инварианты

1. `kaitenCardId` уникален в пределах tenant (если задан).
2. Chat sync не перезаписывает ручные правки админа в CRM без merge policy.
3. CRM kanban работает при `kaitenIntegrationEnabled=false`.
4. Cron kaiten-chat-sync авторизован через `INTERNAL_KAITEN_CHAT_SYNC_SECRET` или `CRON_SECRET`.
