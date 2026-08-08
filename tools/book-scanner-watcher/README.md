# Click Lab — сканер в заказ

## Для пользователей

Один файл: **ClickLab-Scanner.exe** (на рабочем столе после сборки).

1. Положите `ClickLab-Scanner.exe` куда удобно (можно в папку сканера)
2. Запустите → вкладка **Настройки**: папка сканера, адрес CRM, API-ключ
3. **Начать работу**

Программа сама читает QR; если не вышло — локальный OCR номера наряда (~2 с) и отправка в CRM.
Настройки и лог: `%LOCALAPPDATA%\ClickLabScanner\`.
Не запускайте exe изнутри ZIP.

## Сборка

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm\tools\book-scanner-watcher"
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-exe.ps1
```
