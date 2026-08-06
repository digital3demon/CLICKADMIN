@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Сначала запустите install.bat
  pause
  exit /b 1
)
if not exist "config.env" (
  echo Нет config.env — запустите install.bat и заполните настройки.
  pause
  exit /b 1
)

".venv\Scripts\python.exe" watch.py
if errorlevel 1 pause
