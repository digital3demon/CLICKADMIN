@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo === Установка вотчера сканера книг (Click Lab CRM) ===
echo.

where python >nul 2>&1
if errorlevel 1 (
  echo Python не найден. Установите Python 3.11+ с https://www.python.org/downloads/
  echo При установке отметьте "Add python.exe to PATH".
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Создаю виртуальное окружение...
  python -m venv .venv
  if errorlevel 1 (
    echo Не удалось создать venv.
    pause
    exit /b 1
  )
)

echo Ставлю зависимости (нужен интернет)...
".venv\Scripts\python.exe" -m pip install --upgrade pip --default-timeout=120
".venv\Scripts\python.exe" -m pip install -r requirements.txt --default-timeout=120
if errorlevel 1 (
  echo Ошибка pip install. Проверьте сеть / VPN и повторите.
  pause
  exit /b 1
)

if not exist "config.env" (
  copy /Y config.example.env config.env >nul
  echo.
  echo Создан config.env — откройте его и заполните:
  echo   WATCH_DIR     — папка сканера
  echo   CRM_BASE_URL  — адрес CRM
  echo   CRM_API_KEY   — ключ из Конфигурация → API
  echo.
  notepad config.env
)

echo.
echo Готово. Запуск: Start-Scanner.bat
echo Можно добавить Start-Scanner.bat в автозагрузку Windows.
pause
