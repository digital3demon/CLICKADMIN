@echo off
chcp 65001 >nul
cd /d "%~dp0"
title dental-lab-crm — тестовый запуск

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [Ошибка] Node.js не найден. Установите LTS с https://nodejs.org/
  echo При установке включите опцию "Add to PATH".
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo [Ошибка] npm не найден. Переустановите Node.js LTS с галкой Add to PATH.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo [1/5] npm install ^(первый раз может занять несколько минут^)...
  call npm install
  if errorlevel 1 goto :fail
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Создан файл .env из .env.example ^(при необходимости отредактируйте^).
  ) else (
    echo.
    echo [Ошибка] Нет файла .env.example — не могу создать .env
    goto :fail
  )
)

set "PRISMA_CLI=%~dp0node_modules\.bin\prisma.cmd"

echo.
echo [2/5] prisma generate...
if exist "%PRISMA_CLI%" (
  call "%PRISMA_CLI%" generate
) else (
  call npx prisma generate
)
if errorlevel 1 goto :fail

echo.
echo [3/5] prisma migrate deploy...
if exist "%PRISMA_CLI%" (
  call "%PRISMA_CLI%" migrate deploy
) else (
  call npx prisma migrate deploy
)
if errorlevel 1 goto :fail

if not exist ".next\BUILD_ID" (
  echo.
  echo [4/5] npm run build ^(первый запуск или после обновления кода^)...
  call npm run build
  if errorlevel 1 goto :fail
) else (
  echo.
  echo [4/5] Папка .next уже есть — пропускаем build.
  echo       Чтобы пересобрать с нуля, удалите папку .next и запустите Запуск.bat снова.
)

echo.
echo [5/5] Запуск сервера…
set HOSTNAME=0.0.0.0
set PORT=3000
if not defined NODE_ENV set NODE_ENV=production
echo.
echo  Откройте в браузере:  http://localhost:%PORT%
echo  Вход:                http://localhost:%PORT%/login
echo  С другого ПК в сети: http://ВАШ-IP:%PORT%
echo.
echo  Остановка: Ctrl+C или закройте это окно
echo.
call npm run start -- --hostname 0.0.0.0 --port %PORT%
goto :eof

:fail
echo.
echo [Ошибка] См. сообщения выше.
pause
exit /b 1
