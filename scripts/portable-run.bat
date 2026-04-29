@echo off
setlocal EnableExtensions
REM First lines ASCII only (no UTF-8 BOM before @echo off — otherwise batch may not run).
echo.
echo dental-lab-crm: starting...
cd /d "%~dp0" 2>nul
if errorlevel 1 (
  echo ERROR: cannot cd to script folder.
  pause
  exit /b 1
)
echo Folder: %CD%
echo.

if not exist "server.js" (
  echo ERROR: server.js not found. Unzip the full folder; do not run from inside the ZIP.
  echo NET: netu server.js. Raspakujte papku polnostju.
  pause
  exit /b 1
)

set CRM_BIND_HOST=0.0.0.0

node -v >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not in PATH. Install LTS from https://nodejs.org/
  echo        and enable "Add to PATH", then log off or reboot.
  echo OSHIBKA: Node ne najden.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.standalone.example" (
    copy /Y ".env.standalone.example" ".env" >nul
    echo Created .env from example.
  )
)

set "ROOT=%~dp0"
set "PR_BIN=%ROOT%node_modules\.bin\prisma.cmd"
set "PR_JS=%ROOT%node_modules\prisma\build\index.js"

if exist "%ROOT%prisma\.PORTABLE_FULL_DB" (
  echo Bundled full database: prisma\dev.db ^(skipping db push and seed^).
  goto after_db
)

echo Running: prisma db push (SQLite schema from schema.prisma^)...
REM migrate deploy alone leaves DB out of sync with schema in this repo; db push matches the app.
if exist "%PR_BIN%" (
  call "%PR_BIN%" db push --skip-generate
) else if exist "%PR_JS%" (
  call node "%PR_JS%" db push --skip-generate
) else (
  call npx --no-install prisma db push --skip-generate
)
if errorlevel 1 (
  echo.
  echo ERROR: prisma db push failed. Close other CRM copies or apps using prisma\dev.db
  pause
  exit /b 1
)

echo Running: node prisma\seed.js (demo data^)...
call node prisma\seed.js
if errorlevel 1 (
  echo.
  echo ERROR: prisma seed failed. Check Node version ^(20+^) and messages above.
  pause
  exit /b 1
)

:after_db

set HOSTNAME=0.0.0.0
set PORT=3000
if not defined NODE_ENV set NODE_ENV=production

echo.
echo OK. Open in browser:  http://localhost:%PORT%
echo      or try:         http://127.0.0.1:%PORT%
echo Stop: Ctrl+C or close this window.
echo.
node server.js
echo.
echo Server stopped. ERRORLEVEL=%ERRORLEVEL%
pause
endlocal
