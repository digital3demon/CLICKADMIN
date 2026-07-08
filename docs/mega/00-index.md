# Dental Lab CRM — Мега-документация (индекс)

> Версия: снимок кодовой базы `dental-lab-crm` (lab).  
> Инфраструктура: **Timeweb Cloud**, **PostgreSQL**, **S3**, **standalone Next.js**.  
> Назначение: дать инженеру достаточно деталей, чтобы воспроизвести систему «с нуля» по той же архитектуре.

---

## Как читать

| Том | Файл | О чём |
|-----|------|--------|
| 1 | [01-infrastructure-timeweb.md](./01-infrastructure-timeweb.md) | Деплой, env, build, PostgreSQL, S3, cron, логи |
| 2 | [02-data-model-prisma.md](./02-data-model-prisma.md) | Prisma: Tenant, Order, Mail, AI, Kaiten, Finance |
| 3 | [03-auth-rbac-middleware.md](./03-auth-rbac-middleware.md) | JWT, сессии, tenant, RBAC, middleware |
| 4 | [04-orders-lifecycle.md](./04-orders-lifecycle.md) | Создание, PATCH, ревизии, номера, post-create |
| 5 | [05-mail-imap-smtp.md](./05-mail-imap-smtp.md) | IMAP sync, правила, read/unread, order-from-mail |
| 6 | [06-ai-pipeline.md](./06-ai-pipeline.md) | Shadow mode, extract, enrich, self-correction, dataset |
| 7 | [07-ai-heuristics.md](./07-ai-heuristics.md) | FDI, negation, fuzzy match, sibling dedup, margins |
| 8 | [08-kaiten-kanban.md](./08-kaiten-kanban.md) | Kaiten API, чат, `!!!`/`???`, Telegram, CRM kanban |
| 9 | [09-finance-erp.md](./09-finance-erp.md) | Сверки, банк, payroll, склад, веса строк |
| 10 | [10-ui-routes.md](./10-ui-routes.md) | Страницы App Router, компоненты, UX-паттерны |
| 11 | [11-api-catalog.md](./11-api-catalog.md) | Каталог API routes по модулям |
| 12 | [12-invariants-edge-cases.md](./12-invariants-edge-cases.md) | Инварианты, кириллица, очереди, idempotency |

Дополнительно в `docs/`:
- `crm-technical-overview.md` — краткий overview
- `tenant-boundary.md` — границы tenant
- `ai-dataset-background-job.md` — фоновый датасет

---

## Глоссарий

| Термин | Значение |
|--------|----------|
| **Tenant** | Организация (лаборатория). Все строки БД привязаны к `tenantId`. |
| **Наряд / Order** | Производственный заказ: пациент, врач, клиника, состав, сроки. |
| **Ground Truth** | Эталон, который сохранил администратор (human label). |
| **Shadow Prediction** | Фоновый прогон ИИ по письму без блокировки UI. |
| **Self-Correction** | Сравнение prediction vs эталон → уроки + JSONL датасет. |
| **Composition** | Состав наряда: строки `OrderConstruction` / позиции прайса. |
| **FDI** | Международная зубная нумерация (`"46"`, `"53"`). |
| **Kaiten** | Внешняя канбан-доска (REST API). |
| **CRM Kanban** | Встроенная доска в CRM (может жить без Kaiten). |

---

## Системные инварианты (обязательны при любой доработке)

1. **Tenant isolation:** любой `findUnique` / `update` по id ресурса включает `tenantId` из сессии.
2. **Почта:** правила и папки **не** меняют `isRead` без явного действия пользователя.
3. **ИИ датасет:** в `assistant` JSONL только **эталон админа**, не ошибка ИИ.
4. **Self-correction:** запись в датасет при **новом** `refHash` состава; уроки — только при расхождении.
5. **Regexp RU:** не использовать `\b` для кириллицы; границы через `\p{L}` / `(?:^|\s)`.
6. **S3 Timeweb:** `S3_FORCE_PATH_STYLE=true`.
7. **LLM очередь:** один tenant — одна serial-очередь на shadow/self-correction (rate limit).

---

## Высокоуровневая архитектура

```
┌─────────────┐     IMAP      ┌──────────────┐
│ Yandex Mail │◄──────────────│  mail-sync   │
└─────────────┘               │  (cron/API)  │
                              └──────┬───────┘
                                     ▼
┌─────────────┐   JWT/cookies  ┌──────────────┐   Prisma    ┌────────────┐
│  Browser    │◄──────────────►│  Next.js     │◄───────────►│ PostgreSQL │
│  (React)    │                │  App Router  │             │ (Timeweb)  │
└─────────────┘                └──────┬───────┘             └────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐    ┌──────────┐      ┌──────────┐
              │ Kaiten   │    │ SprutDock│      │ S3       │
              │ REST API │    │ / LLM    │      │ Storage  │
              └──────────┘    └──────────┘      └──────────┘
```

---

## Lab vs SaaS

- **Lab:** `dental-lab-crm` — одна лаборатория, один технический tenant.
- **SaaS:** `dental-crm-saas` — зеркало кода (`npm run sync:saas`), multi-tenant по `slug` поддомена.
- Бизнес-логика **общая**; различие — tenant resolution и plan entitlements.

---

## Быстрые команды разработчика

```powershell
Set-Location "c:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run dev
npm run typecheck
npx vitest run lib/llm/order-email-extract.test.ts
npm run build
npm run sync:saas
```
