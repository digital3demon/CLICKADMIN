# Том 5. Почта (IMAP / SMTP)

---

## 5.1. Архитектура почтового модуля

```
Cron / Manual trigger
       │
       ▼
mail-sync.service.ts ──► IMAP (imapflow)
       │
       ├── EmailFolder (uidValidity, lastSyncedUid)
       ├── Email (body, headers, isRead)
       ├── EmailAttachment → mail-attachment-storage (S3/disk)
       └── Mail rules → move/copy folder (без isRead!)
       │
       ▼
UI /api/mail/* ──► SMTP send (nodemailer)
       │
       ▼
order-from-mail.ts ──► createOrder + post-create pipeline
```

Ключевые файлы:
- `lib/mail/mail-sync.service.ts` — синхронизация
- `lib/mail/mail-service.ts` — API context, access
- `lib/mail/mail-queue.ts` — очередь sync jobs
- `lib/mail/order-from-mail.ts` — наряд из письма
- `lib/mail/order-source-emails.ts` — цепочка писем наряда

---

## 5.2. Синхронизация IMAP

### Триггеры

| Триггер | Endpoint |
|---------|----------|
| Cron | `GET /api/cron/mail-sync` |
| Ручной | `POST /api/mail/sync` |
| Priority | `POST /api/mail/sync-priority` |

### Режимы sync (`EmailSyncMode`)

- `FULL` — все папки по правилам
- `RECENT` — только недавние UID
- `PRIORITY` — входящие + INBOX first

### Псевдокод sync account

```
function syncEmailAccount(accountId, mode):
  account = load with folders, rules
  connect IMAP with decrypted password
  for each folder where shouldSyncFolderForMode(type, mode):
    uidValidity = folder.uidValidity from server
    if uidValidity changed → reset lastSyncedUid
    fetch messages with UID > lastSyncedUid
    for each message:
      upsert Email by (accountId, uid)
      save attachments to storage
      evaluateIncomingRules(message) → target folder (move on server)
      // НЕ трогать isRead при правилах!
    update folder.lastSyncedUid
  disconnect
```

### Инвариант isRead

**`isRead` живёт только в CRM** и не связан с флагом `\\Seen` в Яндекс.Почте / IMAP:

- прочтение в веб-клиенте Яндекса **не** отмечает письмо прочитанным в CRM;
- прочтение / «прочитано» / «все прочитано» в CRM **не** ставит `\\Seen` на сервере почты;
- правила почты и автоматические перемещения **не** меняют `isRead`.

Меняет `isRead` только явное действие в CRM: открытие письма, кнопки «прочитано» / «непрочитано».

---

## 5.3. Правила почты (Mail Rules)

Файл: `lib/mail/mail-sync.service.ts` — `evaluateIncomingRules`, `ruleMatches`.

### Условия (`MailRuleCondition`)

Примеры: `FROM_CONTAINS`, `SUBJECT_CONTAINS`, `BODY_CONTAINS`, `HAS_ATTACHMENT`.

### Действия

Перемещение в папку IMAP, применение цвета, теги (см. schema `MailRule`).

### Валидация

`validateRuleResult` — проверка, что целевая папка существует на сервере.

---

## 5.4. Шифрование credentials

`lib/mail/encryption.ts` — AES для паролей IMAP/SMTP в `EmailAccount`.

Ключ из env (`MAIL_ENCRYPTION_KEY` или общий secret).

---

## 5.5. Доступ по ролям

`EmailAccount.allowedRoles` — JSON array ролей.

`mailAccountAccessWhere(tenantId, userId, role)` — фильтр в list API.

---

## 5.6. Отправка писем (SMTP)

`POST /api/mail/send`

- Шаблоны ответа: `lib/mail/email-reply-template.ts`
- Подстановка номера наряда: `substituteOrderNumberPlaceholders`
- HTML ↔ plain: `lib/mail/reply-body-plain-text.ts`
- Inline images в ответе

### Reply target

`EmailSourceOrder.isReplyTarget` — какое письмо цепочки использовать для ответа.

---

## 5.7. Наряд из письма

### Поток

```
User clicks "Создать наряд" on Email
  → POST /api/mail/create-order or order-from-mail
  → resolve clinic/doctor from From/Subject/body heuristics
  → createOrder(...)
  → EmailSourceOrder link
  → runOrderPostCreatePipeline (shadow AI)
```

Файлы:
- `lib/mail/order-from-mail.ts`
- `lib/order-import-export.ts` — resolve clinic/doctor ids

### Digital Demon rules

`lib/mail/order-digitaldemon-apply.ts` — ретро-применение правил к существующим письмам.

---

## 5.8. Цепочка писем наряда

`lib/mail/order-source-emails.ts` — `fetchOrderSourceEmails`

Все `EmailSourceOrder` для orderId, сортировка по `receivedAt`.

Используется в:
- AI prediction prompt (несколько писем в треде)
- Resolve client ids from source email

---

## 5.9. Очистка текста письма

`lib/mail/mail-text-cleanup.ts`

- `cleanMailTextBody` — убрать quoted reply, подписи
- `mailHtmlToText` — HTML → plain
- `dedupeDuplicateBracketUrls` — дубли URL в скобках

**Для ИИ:** тело передаётся после cleanup; кириллица сохраняется.

---

## 5.10. Вложения почты

Storage: `lib/mail/mail-attachment-storage.ts` (аналог order attachments).

В AI catalog: `{ id, fileName, mimeType, size }` — LLM выбирает `suggestedAttachmentIds` только из каталога.

PDF Click-Order: `lib/llm/click-order-pdf-form.ts` — парсинг формы из PDF вложения.

---

## 5.11. Cron mail-sync

```
GET /api/cron/mail-sync
Authorization: Bearer $CRON_SECRET
```

Или internal header `INTERNAL_MAIL_SYNC_SECRET` (middleware).

Обрабатывает `EmailSyncJob` queue, priority accounts first.

---

## 5.12. UI почты

Страница: `app/mail/page.tsx`

- Список папок слева
- Список писем с фильтром read/unread
- Просмотр + создание наряда
- Ответ с шаблоном

---

## 5.13. Edge cases

| Ситуация | Поведение |
|----------|-----------|
| uidValidity сменился | Сброс sync cursor, полный resync папки |
| Дубликат Message-ID | Upsert по uid в рамках account+folder |
| Пустое тело | Fallback на htmlBody → preview |
| Очень длинное письмо | Truncate в промпт ИИ (см. run-order-email-prediction) |
| Несколько пациентов в письме | LLM: только первый в `patientName`, warning в массив |
