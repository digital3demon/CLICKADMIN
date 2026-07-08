# Том 4. Жизненный цикл наряда (Orders)

---

## 4.1. Создание наряда

### Точки входа

| Источник | Файл / API |
|----------|------------|
| UI форма | `POST /api/orders` → `lib/order-create-service.ts` |
| Почта | `lib/order-from-mail.ts` → create service |
| Импорт | `app/api/orders/import/route.ts` |
| Продолжение | `continuesFromOrderId` |

### Псевдокод create

```
function createOrder(input, session):
  validate clinic/doctor belong to tenantId
  orderNumber = allocateNextOrderNumber(tenantId, yearMonth)  // lib/order-number.ts
  order = prisma.order.create({
    tenantId, orderNumber, status: DRAFT or NEW,
    constructions: map input lines,
    ...
  })
  ensureDoctorClinicLink(order.doctorId, order.clinicId)  // lib/ensure-doctor-clinic-link-from-order.ts
  recordOrderRevision(order, CREATE)
  runOrderPostCreatePipeline(order.id)  // async side effects
  return order
```

### Номер наряда (`lib/order-number.ts`)

Формат: `YYMM-NNN` (например `2607-042`).

```
function allocateNextOrderNumber(tenantId, refDate):
  prefix = format(refDate, "YYMM")
  last = max orderNumber where starts with prefix
  seq = parseInt(last suffix) + 1
  return prefix + "-" + pad3(seq)
```

---

## 4.2. Post-create pipeline

Файл: `lib/order-post-create-pipeline.ts`.

```
function runOrderPostCreatePipeline(orderId):
  order = load with email links, constructions

  if order has email source:
    runShadowPredictionForOrder(order)  // lib/llm/shadow-prediction.ts
    runSelfCorrectionForOrderInBackground(orderId)  // если уже есть эталон

  if kaiten enabled:
    createOrUpdateKaitenCard(order)

  revalidatePath('/orders', '/clients/...')
```

**Важно:** pipeline не блокирует HTTP response create; тяжёлое — в `after()` или background queue.

---

## 4.3. PATCH наряда

`PATCH /api/orders/[id]/route.ts`

### Принимаемые поля

Статус, сроки, состав (`constructions`), оплата, флаги материалов, `adminShippedAt`, привязки clinic/doctor, и т.д.

### Псевдокод

```
function patchOrder(id, body, session):
  order = findUnique({ id, tenantId })
  if !order → 404

  apply field updates with validation
  if constructions changed:
    replace constructions (transaction)
    refHash = compositionSummaryHash(newConstructions)

  recordOrderRevision(order, SAVE)
  revalidateAfterDoctorClinicLink(...)

  after(() => runSelfCorrectionForOrderInBackground(id))

  return updated order
```

### `adminShippedAt`

Миграция `20260708150000_order_admin_shipped_at`. Дата отгрузки админом — отдельно от `dueToAdminsAt`.

---

## 4.4. Состав наряда (constructions)

### Категории

- `FIXED` — одиночная коронка/вкладка
- `BRIDGE` — мост `bridgeFromFdi`–`bridgeToFdi`
- `PRICE_LIST` — строка из прайса
- Другие — см. enum в schema

### Нормализация зубов

`lib/teeth-fdi.ts` — parse, validate, dedupe.

### Цены

`unitPrice` из прайса или ручной ввод; `lineDiscountPercent` на строку.

---

## 4.5. Ревизии

`lib/record-order-revision.ts`

Сохраняет snapshot JSON наряда + constructions при CREATE/SAVE/RESTORE.

UI: история на карточке наряда (если включено).

---

## 4.6. Архив и retention

`archivedAt` — soft archive.

Cron `orders-archive-cleanup` удаляет старые архивы по `Tenant.orderArchiveRetentionDays`.

---

## 4.7. Связь врач ↔ клиника

`lib/ensure-doctor-clinic-link-from-order.ts`

При сохранении наряда с `doctorId` + `clinicId` создаёт `DoctorClinicLink`, если нет.

`lib/revalidate-after-doctor-clinic-link.ts` — инвалидация кэша страниц клиентов.

---

## 4.8. Вложения

### Upload

`POST /api/orders/[id]/attachments` — multipart, лимит размера в route.

### Storage

`lib/order-attachment-storage.ts` → S3 или disk (том 1).

### Scope

`GENERAL`, `INVOICE`, ... — фильтрация в UI.

---

## 4.9. Статусы

### OrderStatus

Типичный поток: `NEW` → `IN_PROGRESS` → `READY` → `SHIPPED` → `CLOSED`.

Точные значения — enum в schema; UI labels в `lib/order-status-labels.ts` (если есть).

### LabWorkStatus

Производственный трек отдельно от клиентского статуса.

---

## 4.10. Client card orders table

`lib/client-card-orders-table.ts` — колонки и сортировка для таблицы нарядов на карточке клиники/врача.

Тесты: `lib/client-card-orders-table.test.ts`.

---

## 4.11. Финансовые поля на наряде

`payment`, `paymentPartialRub`, связь со сверками через clinic reconciliation snapshots (том 9).

`lib/clinic-finance.ts` — агрегаты для карточки клиники.

---

## 4.12. Инварианты

1. `orderNumber` уникален в пределах tenant + месяца.
2. PATCH не меняет `tenantId`.
3. Удаление наряда — soft или hard по политике route; каскады на constructions/attachments.
4. Self-correction запускается после каждого SAVE с составом (background).
5. Kaiten card id не перезаписывается без явной логики sync.
