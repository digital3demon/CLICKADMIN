# Том 6. ИИ-пайплайн (Shadow Mode, Self-Correction, Dataset)

---

## 6.1. Обзор

ИИ **не блокирует** создание наряда. Работает в **shadow mode**:

1. Админ создаёт/сохраняет наряд (эталон).
2. Фоново: LLM разбирает письмо → `AiOrderPrediction`.
3. Фоново: сравнение prediction vs эталон → JSONL датасет + опционально урок врачу.

```
Email ──► extract (LLM) ──► enrich (heuristics) ──► AiOrderPrediction
                                                          │
Admin saves Order ◄───────────────────────────────────────┘
       │
       ▼
analyzePredictionError
  ├── append JSONL (always on new refHash)
  └── generate aiLesson (only if composition mismatch)
```

---

## 6.2. Конфигурация ИИ

`lib/llm/llm-config.ts` — `getAiSettings(tenantId)`

| Поле Tenant | Назначение |
|-------------|------------|
| `aiEnabled` | Вкл/выкл |
| `aiApiKey` | Ключ SprutDock / провайдер |
| `aiModel` | Slug модели |

HTTP клиент: `lib/llm/llm-client.ts` — `chatCompletion`, `stripMarkdownFences`.

---

## 6.3. Shadow prediction

Файл: `lib/llm/shadow-prediction.ts`

### Очередь

**Один tenant — одна serial-очередь.** Следующий prediction стартует после завершения предыдущего.

### Точки запуска

| Событие | Функция |
|---------|---------|
| Create order from mail | `enqueueShadowPrediction` в post-create |
| Retry в AI Admin | API retry |
| Manual batch | `runOrderEmailPrediction` |

### Сохранение

```typescript
AiOrderPrediction {
  tenantId, orderId, emailId (unique)
  model, durationMs
  predictionJson  // enriched full object
  error?: string
  selfCorrectionAt?, selfCorrectionRefHash?
}
```

При успехе (`!error`) → `runSelfCorrectionForOrderInBackground`.

---

## 6.4. Run prediction (главный orchestrator)

Файл: `lib/llm/run-order-email-prediction.ts`

### Псевдокод

```
function runOrderEmailPrediction(db, tenantId, emailId, orderId?, options?):
  emails = fetchOrderSourceEmails or single email
  body = cleanMailTextBody + html fallback
  catalog = email attachments metadata

  if options.forPrefill && canUseHeuristicPrefill(body):
    return heuristic prefill without heavy LLM

  attachmentContext = loadEmailAttachmentOrderContext (PDF Click-Order)
  historyContext = fetchClientOrderHistoryContext (doctor lessons + past orders)
  priceNames = loadActivePriceListItemNames

  extract = await extractOrderFieldsFromEmail({
    emails, catalog, historyContext, attachmentContext, priceNames
  })

  enrich = enrichOrderEmailPrediction(extract, ...)

  return { model, durationMs, predictionJson: merge(extract, enrich) }
```

### Режим `forPrefill`

Черновик до сохранения — лёгкая эвристика (`order-email-structured-body.ts`), без history LLM.

---

## 6.5. Extract (LLM + Zod)

Файл: `lib/llm/order-email-extract.ts`

### Схема `OrderEmailExtractSchema`

Ключевые поля:
- `patientName`, `clinicId`, `doctorId`
- `clientOrderText` — дословный заказ
- `patientAppointmentAt` — ISO8601
- `urgent`, `hasScans`, `hasCt`, `hasMri`, `hasPhoto`
- `compositionHints[]` — `{ nameHint, quantity, teethFdi }`
- `suggestedAttachmentIds[]`
- `confidenceScore` 0–100
- `warnings[]`
- **`awaitingData`** — `{ isAwaiting, reason }` (данные «пришлю позже»)

### Промпт

В system/user:
- Каталог клиник/врачей tenant
- Правила FDI, срочность, вложения
- Инструкция по `awaitingData`: true если клиент **обещает** прислать КТ/сканы/ссылку позже
- `aiLessons` врача (до 5 строк)

### Нормализация teethFdi

LLM может вернуть `"46"` вместо `["46"]` — `normalizeTeethFdiInput` в Zod preprocess.

---

## 6.6. Enrichment (после LLM)

Файл: `lib/llm/order-email-enrichment.ts`

Не-LLM шаги:
- `resolve-ai-composition-lines.ts` — fuzzy match hints → price list items
- `order-email-awaiting-data-guard.ts` — сброс ложного awaitingData
- `order-email-shipment-together-guard.ts` — «отправить вместе с …»
- Subject parse: `order-email-subject-parse.ts`
- Structured body: `order-email-structured-body.ts`

Версионирование: `order-email-enrichment-version.ts` — поле в `predictionJson` для diff viewer.

---

## 6.7. awaitingData (блокировка — фундамент)

### Смысл

Флаг в prediction: клиент **ещё не прислал** обещанные данные (КТ, сканы, ссылку).

### Post-LLM guard

`normalizeAwaitingDataFromEmailText(awaitingData, emailText)`:

```
if !awaitingData.isAwaiting → return as-is
if reason mentions link AND http/cloud URL in text → return null (not awaiting)
if LINK_ALREADY_SENT_RE → null
if DATA_ON_LINK_RE → null
if cloud link + «прикрепляю» + «кт/скан» → null
else → keep awaitingData
```

**Класс ошибки:** резолв — LLM путает «прикрепляю ссылку» с «пришлю позже».

### UI (Diff Viewer)

`app/ai-admin/AiAdminClient.tsx` — красный блок **«Возможная блокировка от ИИ»** после warnings, если `awaitingData.isAwaiting`.

**Вне scope сейчас:** реальная блокировка наряда, уведомление при досыле, модалка разблокировки.

---

## 6.8. Self-correction

Файл: `lib/llm/self-correction.ts`

```
runSelfCorrectionForOrderInBackground(tenantId, orderId):
  enqueue on tenant queue
  find latest AiOrderPrediction where error=null
  analyzePredictionError(db, tenantId, predictionId)
  sleep 2000ms (rate limit gap)
```

Batch: `runSelfCorrectionBatchInBackground` — кнопка «Догнать старые наряды» в AI Admin (`selfCorrectionAt: null`).

---

## 6.9. analyzePredictionError

Файл: `lib/llm/analyze-prediction-error.ts`

### refHash

```
aiSummary = summarizeAiConstructions(prediction.resolvedConstructions)
realSummary = summarizeOrderConstructions(order.constructions)
refHash = realSummary  // sorted canonical string
```

### Идемпотентность

```
if prediction.selfCorrectionRefHash === refHash && selfCorrectionAt != null:
  return  // состав не менялся
```

### Шаг 1 — Dataset (всегда при новом refHash)

```
jsonlLine = buildDatasetJsonlLine(order, [email])
appendToDatasetFile(tenantId, jsonlLine)
```

### Шаг 2 — Lessons (только при mismatch)

```
if aiSummary === realSummary:
  markSelfCorrectionDone(refHash)
  return

lesson = LLM prompt: "что ИИ перепутал, одна строка"
append to Doctor.aiLessons (max 5, dedupe)
markSelfCorrectionDone(refHash)
```

---

## 6.10. Dataset JSONL

### buildDatasetJsonlLine

Файл: `lib/llm/dataset-export.ts`

Формат OpenAI fine-tuning style:

```json
{
  "messages": [
    { "role": "user", "content": "<full extract prompt>" },
    { "role": "assistant", "content": "<JSON ground truth from admin order>" }
  ]
}
```

**Ground truth** = то, что сохранил админ, не prediction.

### Storage

Файл: `lib/llm/dataset-storage.ts`

```
path = AI_DATASET_DIR / {tenantId}-{YYYY-MM}.jsonl
append with fs.promises.appendFile
```

### Ручной export

`GET /api/ai-admin/export` — тот же `buildDatasetJsonlLine` в цикле (DRY).

Документ ТЗ: `docs/ai-dataset-background-job.md`.

---

## 6.11. AI Admin UI

Страница: `app/ai-admin/`

| Функция | API |
|---------|-----|
| Diff Viewer | `GET /api/ai-admin/diffs?page&limit=10` |
| Retry prediction | `POST /api/ai-admin/retry` |
| Batch analyze | `POST /api/ai-admin/batch-analyze` |
| Export JSONL | `GET /api/ai-admin/export` |

### Pagination

Все predictions, 10 на страницу, новые сверху (`orderBy: createdAt desc`).

Счётчик: «Показано X–Y из Z».

---

## 6.12. Client history context

`lib/llm/client-history-context.ts`

В промпт:
- Последние наряды врача/клиники (обезличенный состав)
- `Doctor.aiParticulars` (LLM-профиль)
- `Doctor.aiLessons`

---

## 6.13. Тесты (обязательные классы)

| Файл | Класс |
|------|-------|
| `order-email-extract.test.ts` | Zod schema, teeth normalize |
| `order-email-enrichment.test.ts` | awaitingData guard, «КТ пришлю позже» |
| `order-email-awaiting-data-guard.test.ts` | ссылка уже в письме |
| `analyze-prediction-error.test.ts` | composition summary |
| `resolve-ai-composition-lines.test.ts` | fuzzy price match |

---

## 6.14. Инварианты ИИ

1. Датасет: assistant = эталон админа.
2. Запись в JSONL только при **новом** refHash.
3. Уроки только при расхождении состава.
4. Очередь serial per tenant (prediction + self-correction).
5. `suggestedAttachmentIds` только из каталога вложений письма.
6. awaitingData guard после LLM, не вместо промпта.
