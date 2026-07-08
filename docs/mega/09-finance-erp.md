# Том 9. Финансы и ERP

---

## 9.1. Модули

| Область | Страницы / API | Lib |
|---------|----------------|-----|
| Сверки с клиниками | `app/finance/`, reconciliation | `lib/reconciliation-*` |
| Банк | bank import | `lib/bank-*` |
| Зарплаты | payroll | `lib/payroll-*` |
| Склад | inventory | `lib/inventory-*` |
| Прайс | price list workspace | `lib/price-list-workspace.ts` |

RBAC: модуль `FINANCE_OFFICE`.

---

## 9.2. Сверки (Reconciliation)

### Clinic flags

```
Clinic.worksWithReconciliation: boolean
Clinic.reconciliationFrequency: enum (MONTHLY, ...)
```

### Snapshots

`ReconciliationSnapshot` — xlsx или structured data в БД.

Cron: `GET /api/cron/reconciliation-snapshots` — авто-снимки по расписанию.

### Веса строк

При агрегации нарядов в сверку учитываются:
- скидки на строку `lineDiscountPercent`
- частичная оплата `paymentPartialRub`
- статус отгрузки / `adminShippedAt`

---

## 9.3. Карточка клиники — финансы

`lib/clinic-finance.ts`

Агрегаты для UI на `app/clients/[id]/page.tsx`:
- долг / переплата
- наряды в периоде сверки
- таблица нарядов: `lib/client-card-orders-table.ts`

---

## 9.4. Прайс-лист

### Active list

`getActivePriceListId(prisma)` — одна активная версия прайса на tenant.

### Overrides

`resolvePriceOverrideMap` — цены для пары clinic/doctor.

### Import/export

`lib/order-import-export.ts` — `resolvePriceListItem` по code/name.

---

## 9.5. Оплата на наряде

Поля Order:
- `payment` — enum статуса оплаты
- `paymentPartialRub` — частичная сумма

Связь со сверкой: наряды с `worksWithReconciliation` попадают в snapshot периода.

---

## 9.6. Payroll

`PayrollConfig` — правила расчёта.

`PayrollEntry` — начисления по сотрудникам/периодам.

API: `app/api/payroll/**` (см. каталог API том 11).

---

## 9.7. Склад

### Модели

- `InventoryItem` — номенклатура
- `InventoryMovement` — приход/расход
- `InventoryBalance` — остаток на дату

### Связь с нарядами

Списание материалов по constructions (если включено в tenant workflow).

---

## 9.8. Юр. форма биллинга

`Clinic.billingLegalForm` — ИП/ООО и т.д. для счетов и сверок.

---

## 9.9. Инварианты

1. Финансовые отчёты всегда scoped by `tenantId`.
2. Snapshot immutable после закрытия периода (если policy enabled).
3. Price override не меняет базовый прайс, только effective price для клиента.
4. Сверка не включает `archivedAt` наряды вне политики retention.
