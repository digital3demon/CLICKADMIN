# Шаблон договора — Legal Design (синие акценты)

## Визуал

| Элемент | Значение |
|---------|----------|
| Акцент | `#2563eb` (CRM `--sidebar-blue`) |
| Акцент тёмный | `#1d4ed8` |
| Текст | `#111827` |
| Подписи полей | `#6b7280` |
| Рамки блоков | `#e5e7eb`, скругление ~10 pt |
| Шрифт | Noto Sans (кириллица в PDF) |

**Не включаем:** QR-код, блок «Почему это хороший договор?», логотипы hh/legalpics.

## Сетка

- Шапка: заголовок «ДОГОВОР», поля № / место / дата.
- Стороны: две карточки в ряд (Заказчик / Поставщик).
- Разделы: ~30% слева — номер и название; ~70% справа — пункты; между ними вертикальная линия `#2563eb`.

## Реестр полей (PDF AcroForm = key в CRM)

| key | PDF field | Описание |
|-----|-----------|----------|
| `contract_number` | `contract_number` | Номер договора |
| `contract_place` | `contract_place` | Место заключения |
| `contract_date` | `contract_date` | Дата |
| `client_name` | `client_name` | Наименование заказчика |
| `client_inn` | `client_inn` | ИНН |
| `client_kpp` | `client_kpp` | КПП |
| `client_ogrn` | `client_ogrn` | ОГРН |
| `client_ceo` | `client_ceo` | ФИО директора |
| `client_email` | `client_email` | E-mail |
| `client_address` | `client_address` | Юр. адрес |
| `client_requisites` | `client_requisites` | Банковские реквизиты (multiline) |

Поставщик (КЛИКЛАБ) — статический текст в шаблоне.

## DOCX (опционально)

Плейсхолдеры в `«кавычках»`, цвет **синий** `2563EB` или legacy **красный** `FF0000`.

## Сборка шаблона PDF

```powershell
Set-Location "c:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
node scripts/build-contract-pdf-template.cjs
node scripts/validate-contract-template.cjs
```

## Проверка

- Открыть `data/templates/typical-contract-ooo.pdf` в Acrobat: поля редактируются после заполнения из CRM.
- `node scripts/generate-test-contract.cjs` — тестовый PDF и DOCX в `data/templates/out/`.
