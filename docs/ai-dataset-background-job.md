# Техническое задание: Фоновый сбор датасета для Fine-Tuning (Closed-Loop)

## Контекст
Система уже умеет генерировать уроки для ИИ (Self-Correction) при расхождении предсказания с эталоном. Необходимо добавить параллельный процесс: **постоянное фоновое накопление пар «Письмо → Эталонный наряд» в JSONL-файлы на диске**. 

Это позволит накапливать обучающую выборку для будущего fine-tuning без ручных выгрузок.

## Жесткие условия (Инварианты)
1. **Ground Truth:** В датасет (в поле `assistant`) должен попадать **только эталонный наряд** (то, что сохранил администратор), а не ошибочный ответ ИИ.
2. **Идемпотентность (Дедупликация):** Запись в файл должна происходить **только при изменении состава наряда** (смена `refHash`). Если админ нажал «Сохранить» 5 раз без изменения состава — в датасет уходит только 1 строка.
3. **Полнота данных:** В датасет должны попадать **и ошибки ИИ, и успешные предсказания** (когда ИИ угадал, и админ просто сохранил наряд).
4. **Неблокирующий I/O:** Запись в файл не должна блокировать основной поток Node.js (использовать `fs.promises.appendFile`).
5. **Ротация файлов:** Файлы датасета должны разбиваться по месяцам (`YYYY-MM`), чтобы избежать проблем с чтением гигантских файлов в будущем.
6. **DRY:** Логика сборки JSONL строки должна быть единой для фонового процесса и ручного эндпоинта `/api/ai-admin/export/route.ts`.

---

## Шаги реализации

### Шаг 1. Выделение логики сборки JSONL (DRY)
Создать файл `lib/llm/dataset-export.ts`.
Перенести в него логику формирования промпта и объекта `completion` из `app/api/ai-admin/export/route.ts`.

**Требования к функции `buildDatasetJsonlLine`:**
- Принимает: `db`, `tenantId`, `order` (со всеми нужными include), `emails` (массив писем).
- Возвращает: `Promise<string | null>` (готовую строку JSONL или null, если нет писем).
- Внутри использует `buildOrderEmailExtractUserPrompt` для `user` и формирует объект `completion` для `assistant`.

### Шаг 2. Реализация Storage Writer
Создать файл `lib/llm/dataset-storage.ts`.

**Требования:**
- Директория по умолчанию: `data/ai-dataset` (с возможностью переопределения через `process.env.AI_DATASET_DIR`).
- Функция `appendToDatasetFile(tenantId: string, jsonlLine: string): Promise<void>`.
- Имя файла: `{tenantId}-{YYYY-MM}.jsonl` (использовать `formatLocalDayKey` из `lib/server/log-dir.ts`).
- Автоматическое создание директории, если её нет (`fs.mkdir(dir, { recursive: true })`).

### Шаг 3. Интеграция в фоновый процесс (Self-Correction)
Отредактировать файл `lib/llm/analyze-prediction-error.ts` (функция `analyzePredictionError`).

**Псевдокод логики внутри функции:**
```typescript
  const aiSummary = summarizeAiConstructions(aiConstructions);
  const realSummary = summarizeOrderConstructions(realConstructions);
  const refHash = realSummary;

  // 1. Проверка на дубликат (Идемпотентность)
  if (prediction.selfCorrectionRefHash === refHash && prediction.selfCorrectionAt != null) {
    return; // Состав не менялся, выходим
  }

  // 2. ЗАПИСЬ В ДАТАСЕТ (Выполняется ВСЕГДА при новом refHash)
  try {
    const jsonlLine = await buildDatasetJsonlLine(db, tenantId, prediction.order, [prediction.email]);
    if (jsonlLine) {
      await appendToDatasetFile(tenantId, jsonlLine);
    }
  } catch (e) {
    console.error("[AI Dataset] Error appending to dataset:", e);
  }

  // 3. ГЕНЕРАЦИЯ УРОКОВ (Выполняется ТОЛЬКО при ошибке ИИ)
  if (aiSummary === realSummary) {
    // ИИ угадал. Урок не нужен, но датасет мы уже записали выше.
    await markSelfCorrectionDone(db, predictionId, refHash);
    return;
  }

  // ... далее идет существующий код генерации урока через chatCompletion ...
```

### Шаг 4. Рефакторинг ручного экспорта
Отредактировать `app/api/ai-admin/export/route.ts`.
Заменить дублирующуюся логику сборки JSONL на вызов новой функции `buildDatasetJsonlLine` в цикле.

### Шаг 5. Синхронизация с SaaS
После проверки локально, запустить скрипт синхронизации, чтобы изменения ушли в коммерческое зеркало:
```bash
npm run sync:saas
```
