# Click Lab — сканер в заказ

## Для пользователей

Один файл: **ClickLab-Scanner.exe** (на рабочем столе после сборки).

1. Положите `ClickLab-Scanner.exe` куда удобно (можно в папку сканера)
2. Запустите → вкладка **Настройки**: папка сканера, адрес CRM, API-ключ
3. **Начать работу**

Настройки и лог хранятся в `%LOCALAPPDATA%\ClickLabScanner\` (не засоряют папку сканов).
Не запускайте exe изнутри ZIP — скопируйте файл на диск.

## Сборка

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm\tools\book-scanner-watcher"
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-exe.ps1
```
