# Click Lab — сканер в заказ

## Для пользователей

ZIP: `ClickLab-Scanner-Watcher.zip` (на рабочем столе после сборки) или `dist/ClickLab-Scanner.exe`.

1. Запустите **ClickLab-Scanner.exe**
2. Вкладка **Настройки** — папка сканера, адрес CRM, API-ключ, автозапуск с Windows
3. **Начать работу** — вкладка **Сканы**: миниатюры с зелёной/красной рамкой
4. Двойной клик — увеличить; ПКМ — ссылка на заказ / корректировка номера / удаление

Python на ПК не нужен.

## Сборка

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm\tools\book-scanner-watcher"
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-exe.ps1
```
