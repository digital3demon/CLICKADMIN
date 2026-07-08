# Том 12. Инварианты и граничные случаи

Сводка правил, нарушение которых даёт «тихие» баги в production.

---

## 12.1. Tenant isolation

```
ИНВАРИАНТ: ∀ query по tenant-scoped id → where включает tenantId из session
```

**Запрещено:**
```typescript
prisma.order.findUnique({ where: { id } })  // BAD
```

**Правильно:**
```typescript
prisma.order.findFirst({ where: { id, tenantId: session.tenantId } })
```

Документ: `docs/tenant-boundary.md`.

---

## 12.2. Почта: isRead

```
ИНВАРИАНТ: isRead меняется только явным действием пользователя
```

Mail rules, IMAP move, sync — **не** трогают `isRead`.

Тестируется регрессией при изменении `mail-sync.service.ts`.

---

## 12.3. ИИ: Ground Truth

```
ИНВАРИАНТ: JSONL assistant = эталон админа (Order после save)
ИНВАРИАНТ: запись в датасет только при новом refHash состава
ИНВАРИАНТ: aiLessons только при aiSummary ≠ realSummary
```

Human label = «сохранил админ», не обязательно «вручную исправил».

---

## 12.4. ИИ: очереди

```
ИНВАРИАНТ: один serial queue на tenant для shadow prediction
ИНВАРИАНТ: один serial queue на tenant для self-correction
ИНВАРИАНТ: gap 2000ms между LLM вызовами в batch
```

Параллельные вызовы на одном tenant → rate limit провайдера.

---

## 12.5. Regexp и кириллица

```
ИНВАРИАНТ: не использовать \b для русских границ слов
```

Использовать:
- `(?<![\p{L}\p{N}])` / `(?![\p{L}\p{N}])` с флагом `u`
- или `(?:^|\s)` для простых кейсов

Примеры файлов: `resolve-ai-composition-lines.ts`, `order-email-awaiting-data-guard.ts`.

**Тест:** минимум один кейс с кириллицей до и после искомого фрагмента.

---

## 12.6. awaitingData

```
ИНВАРИАНТ: LLM может выставить isAwaiting=true
ИНВАРИАНТ: guard сбрасывает false positive если ссылка уже в письме
```

Класс ошибки: **резолв**, не парсинг.

Будущее (вне scope): блокировка наряда, notify при досыле.

---

## 12.7. Composition resolve

```
ИНВАРИАНТ: LLM не возвращает priceListItemId — только nameHint
ИНВАРИАНТ: negation «без X» удаляет X из hints и lines
ИНВАРИАНТ: при ambiguous fuzzy → cheaper item
```

---

## 12.8. FDI teethFdi

```
ИНВАРИАНТ: в БД Json; в app string[]
ИНВАРИАНТ: Zod preprocess скаляр → [скаляр]
```

---

## 12.9. S3 Timeweb

```
ИНВАРИАНТ: S3_FORCE_PATH_STYLE=true
ИНВАРИАНТ: diskRelPath prefix "s3:" для объектов в bucket
```

---

## 12.10. Idempotency

| Операция | Ключ |
|----------|------|
| AiOrderPrediction create | `(tenantId, orderId, emailId)` unique |
| Dataset append | `selfCorrectionRefHash` |
| Email upsert | `(accountId, folderId, uid)` |
| Order number | `YYMM` + seq |

---

## 12.11. SQLite → PostgreSQL

Legacy код с `SQLITE_BUSY` retry — на PostgreSQL не нужен.

Новые route handlers: таймаут multipart, лимит размера upload.

---

## 12.12. Build / migrate

```
ИНВАРИАНТ: build требует DATABASE_URL для prisma migrate deploy
```

Локально без БД: `npx next build` может пройти, `npm run build` — нет.

---

## 12.13. Sync SaaS

После существенных правок lab:
```powershell
Set-Location "c:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run sync:saas
```

Не синхронизировать: `*.db`, debug scripts `check-order-*.js`.

---

## 12.14. Чеклист приёмки (регрессия)

- [ ] `npx vitest run lib/llm/` — exit 0
- [ ] `npm run typecheck` — exit 0
- [ ] PATCH order с изменением состава → новая строка в `data/ai-dataset/*.jsonl`
- [ ] PATCH без изменения состава → дубликата в JSONL нет
- [ ] Diff Viewer: page=1, limit=10, totalPages корректен
- [ ] Письмо «КТ пришлю позже» → awaitingData в prediction
- [ ] Письмо «прикрепляю ссылку на диск, КТ там» → awaitingData сброшен guard'ом
- [ ] Mail rule move → isRead не изменился

---

## 12.15. Классы ошибок (напоминание)

| Класс | Где чинить |
|-------|------------|
| Парсинг | regex, Zod, PDF parser |
| Резолв | fuzzy match, awaitingData, clinic/doctor id |
| Отображение | React state, pagination UI |
| Промпт | LLM instructions, schema |

Симптом пользователя — пример, не спецификация. Фикс на класс + тест на класс.

---

## 12.16. Аудит документации

При изменении кода обновлять том:

| Изменение | Том |
|-----------|-----|
| Новое поле Prisma | 02 |
| Новый env | 01 |
| Новая эвристика ИИ | 06, 07 |
| Новый API route | 11 |
| Новый UI page | 10 |
| Новый инвариант | 12 + 00 |
