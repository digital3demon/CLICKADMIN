# Скриншоты UI

PNG-файлы для [`docs/crm-ui-overview.md`](../crm-ui-overview.md).

## Как переснять

1. Запустите CRM локально:

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
npm run dev
```

2. Откройте в браузере `http://localhost:3000` в окне **не уже 1440px** и **не ниже 560px** по высоте (десктопная оболочка с сайдбаром 1/7).

3. Пройдите ключевые экраны и сохраните снимки с теми же именами:

| Имя файла | URL |
|-----------|-----|
| `01-home.png` | `/` |
| `02-orders.png` | `/orders` |
| `03-kanban.png` | `/kanban` |
| `04-mail.png` | `/mail` (лучше с настроенным ящиком — список + viewer) |
| `05-directory.png` | `/directory` |
| `06-finance-office.png` | `/finance-office` |
| `07-clients.png` | `/clients` |
| `08-analytics.png` | `/analytics` |
| `09-shipments.png` | `/shipments?tab=today` |

4. Положите файлы в эту папку (`docs/screenshots/`).

## Замечания

- Для документации предпочтительны **обе темы**: хотя бы один набор в светлой, один в тёмной — или два файла на экран (`*-light.png`, `*-dark.png`).
- На скриншотах не должно быть персональных данных клиентов, если файлы уходят в git/PR — при необходимости используйте demo-режим или тестовую БД.
- Карточка наряда: URL вида `/orders/or_<base64>`, не номер наряда — откройте заказ из списка и снимите как `10-order-edit.png` (добавьте строку в overview при необходимости).
