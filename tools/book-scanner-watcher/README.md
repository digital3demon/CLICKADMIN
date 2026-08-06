# Раздача админам: папка tools/book-scanner-watcher (или zip этой папки без .venv*).

## Вариант A — установщик (рекомендуется)

1. Скопируйте папку `book-scanner-watcher` на ПК у сканера.
2. Запустите **install.bat** (нужны Python 3.11+ и интернет один раз).
3. В `config.env` укажите папку сканера, URL CRM и API-ключ (Конфигурация → API).
4. Запускайте **Start-Scanner.bat** (можно в автозагрузку).

## Вариант B — один .exe

Если собран `dist\book-scanner-watcher.exe` (скрипт `build-exe.ps1`):

1. Скопируйте exe и `config.example.env` → рядом `config.env`.
2. Заполните config.env, запустите exe.

Сборка exe (на машине разработчика, нужен PyPI):

```powershell
cd "C:\Users\sevas\Documents\Курсор проекты\dental-lab-crm\tools\book-scanner-watcher"
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-exe.ps1
```

## Безопасность

- `config.env` с ключом не коммитьте и не шарьте в общий чат.
- Отозвать ключ: CRM → Конфигурация → API.
