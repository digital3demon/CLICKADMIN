# Том 7. Эвристики ИИ (скрытая логика)

> Файлы: `lib/llm/resolve-ai-composition-lines.ts`, `order-email-enrichment.ts`, guards, subject/body parsers.

---

## 7.1. Принцип слоёв

```
LLM extract (грубый JSON)
    ↓
normalize Zod (teethFdi, types)
    ↓
guards (awaitingData, shipment-together)
    ↓
resolveAiCompositionLines (прайс, negation, siblings)
    ↓
due date / client ids heuristics
    ↓
predictionJson в БД
```

LLM **не** выбирает id прайса напрямую — только `nameHint`. Резолв на сервере.

---

## 7.2. FDI и зубы

### Zod preprocess (`order-email-extract.ts`)

```
normalizeTeethFdiInput(value):
  null → null
  array → as-is
  "46" → ["46"]
  "46, 47" → ["46","47"]  // split by [,;\s]
```

### Валидация

`lib/teeth-fdi.ts` — допустимые коды FDI для взрослых/детских (если используется в UI).

### Челюсть в hint

Маркеры **не** часть названия прайса:

```regexp
// WORD_LEFT/RIGHT = (?<![\p{L}\p{N}]) / (?![\p{L}\p{N}])
JAW_UPPER: вч | верхняя челюсть | upper
JAW_LOWER: нч | нижняя челюсть | lower
```

Удаляются в `normalizeCompositionHintForMatch` перед match.

---

## 7.3. Fuzzy match прайса

### Константы

| Константа | Значение | Смысл |
|-----------|----------|-------|
| `FUZZY_HINT_MIN_LEN` | 4 | Минимальная длина hint для fuzzy |
| `AMBIGUOUS_MATCH_SCORE_MARGIN` | 25 | Если top-2 scores ближе — неоднозначно |

### Скоринг (`scoreHintToCatalogItem`)

```
exact name match     → +1000
all hint tokens in name → +500
token count in name  → +3 per token
name contains hint   → +120
hint contains name   → +80
```

### При неоднозначности

`pickBestCatalogMatch` → если scores слишком близки → **`pickCheapestCatalogItem`**.

### Latin ↔ Cyrillic lookalikes

`foldScriptLookalikes`: `e→е`, `a→а`, `x→х`, … для Marco Rosa / Emax в письме vs прайс.

### Token equality

`tokensLooselyEqual`:
- exact match
- folded script match
- Levenshtein distance ≤ 1
- common stem (5 chars)
- prefix with length diff ≤ 1

---

## 7.4. Negation («без …»)

### Regex

```regexp
ORDER_NEGATION_RE =
  (?<![\p{L}\p{N}])
  (?:без|не\s+(?:нужен|нужна|требуется|делать|изготавливать))
  \s+
  ([^\n,.;()]{2,80})
```

**Не использовать `\b`** — кириллица.

### Пайплайн

```
negationPhrases = extractNegatedOrderPhrases(orderText)
hints = filterCompositionHintsByNegation(hints, orderText)
lines = filterResolvedLinesByNegation(lines, orderText)
```

### Проверка concept

```
isPriceConceptNegatedInOrderText(concept, orderText):
  for each negated phrase:
    if tokens of negated ⊆ tokens of concept (loose) → negated
    if any concept token matches negated → negated
```

Пример: «винт без немедленной нагрузки» → убрать позицию «немедленная нагрузка».

---

## 7.5. Sibling variants (дубликаты прайса)

Позиции с почти одинаковым названием: «сплинт» / «сплинт сложный», «винт» / «винт титановый».

### dedupeCompositionHintsBySpecificity

Оставляет **более специфичное** имя (больше токенов), если одно строго покрывает другое.

### dedupeResolvedLinesBySiblingVariants

Смотрит на `negationOrderText` и текст заказа — оставляет вариант, явно упомянутый в письме.

Тесты: `resolve-ai-composition-lines.test.ts` → `sibling price name variants`.

---

## 7.6. Specificity dedup

`isPriceNameStrictlyMoreSpecific(a, b)` — все токены `b` есть в `a`, и `a` длиннее.

Убирает пары «сплинт» + «сплинт сложный» из одного hint-листа.

---

## 7.7. awaitingData guard

См. том 6. Кратко:

| Паттерн | Действие |
|---------|----------|
| `CLOUD_STORAGE_URL_RE` | disk.yandex, yadi.sk, drive.google |
| `LINK_ALREADY_SENT_RE` | «прикрепляю ссылку» |
| `DATA_ON_LINK_RE` | «на диске есть КТ» |
| `FUTURE_DATA_PROMISE_RE` | «пришлю позже» (для derive flags) |

---

## 7.8. Shipment together guard

`lib/llm/order-email-shipment-together-guard.ts`

Фразы «отправить вместе с нарядом №…» — не создавать отдельный срочный срок / не дублировать состав.

---

## 7.9. Subject parse

`lib/llm/order-email-subject-parse.ts`

- `splitSubjectWorkAndPatient` — работа vs ФИО в теме
- `stripWorkNamesFromPatientName` — убрать названия работ из поля пациента
- `parsePatientNameFromEmailBody` — эвристика ФИО из тела

---

## 7.10. Structured body prefill

`lib/llm/order-email-structured-body.ts`

```
canUseHeuristicPrefill(body):
  if body matches structured clinic template → true

parseStructuredClinicEmailBody → fields without LLM
buildClientOrderTextFromBody → clientOrderText
```

Используется в `forPrefill` mode (черновик до save).

---

## 7.11. PDF Click-Order

`lib/llm/click-order-pdf-form.ts`

Парсинг PDF формы заказа (вложение) → `primaryPatientName`, тексты для промпта.

Подключается через `email-attachment-order-context.ts`.

---

## 7.12. Price overrides

При резолве прайса учитываются персональные цены:

```
resolvePriceOverrideMap(prisma, { clinicId, doctorId, priceListItemIds })
```

Цена в `ResolvedCompositionLine.unitPrice` уже с override.

---

## 7.13. composition summary (для self-correction)

`lib/llm/prediction-composition-summary.ts`

Каноническая строка для сравнения:

```
summarizeOrderConstructions(constructions):
  sort by priceListItemId/code
  format: "{code}|{name}|qty|teeth sorted"

summarizeAiConstructions(ai lines):
  same format from resolvedConstructions in predictionJson
```

**refHash = realSummary** (строка эталона).

---

## 7.14. Тестовые классы (обязательно при правках)

| Класс | Пример входа |
|-------|----------------|
| Negation RU | «коронка без силиконового ключа» |
| Sibling | immediate loading variants |
| Cyrillic boundaries | «… 178 от 10.02.2026» |
| awaitingData | «КТ пришлю позже» vs «прикрепляю ссылку на диск, КТ там» |
| Fuzzy latin | `Emax` vs `Емах` |
| teethFdi scalar | LLM returns `"46"` not array |

---

## 7.15. Псевдокод полного resolve

```
function resolveAiCompositionLines(hints, opts):
  hints = dedupeCompositionHintsBySpecificity(hints)
  if opts.negationOrderText:
    hints = filterCompositionHintsByNegation(hints, text)

  catalog = loadPriceListItemsForClient(clinicId, doctorId)

  for hint in hints:
    item = exact resolvePriceListItem(normalized hint)
    if !item:
      candidates = findAmbiguousMatches(hint, catalog)
      item = pickBestCatalogMatch(hint, candidates) ?? cheapest(candidates)
    if !item → warning, continue
    lines.push({ ...item, qty, teethFdi })

  lines = dedupeResolvedLinesByNameSpecificity(mergeByPriceItem(lines))
  lines = dedupeResolvedLinesBySiblingVariants(lines, negationText)
  lines = filterResolvedLinesByNegation(lines, negationText)
  return { lines, warnings, maxLeadWorkingDays }
```
