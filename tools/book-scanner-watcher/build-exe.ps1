# Build book-scanner-watcher.exe (onefile). Run from this directory.
# Usage:
#   powershell -File build-exe.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Py = "C:\Users\sevas\AppData\Local\Programs\Python\Python311\python.exe"
if (-not (Test-Path $Py)) {
  $Py = (Get-Command python -ErrorAction SilentlyContinue).Source
}
if (-not $Py) { throw "Python не найден" }

$Venv = Join-Path $Root ".venv-build"
if (-not (Test-Path $Venv)) {
  & $Py -m venv $Venv
}
$Pip = Join-Path $Venv "Scripts\pip.exe"
$PyInst = Join-Path $Venv "Scripts\pyinstaller.exe"
$PythonV = Join-Path $Venv "Scripts\python.exe"

& $Pip install --upgrade pip
& $Pip install -r requirements.txt pyinstaller

$Dist = Join-Path $Root "dist"
$Build = Join-Path $Root "build"
Remove-Item -Recurse -Force $Dist, $Build -ErrorAction SilentlyContinue

& $PyInst `
  --noconfirm `
  --clean `
  --onefile `
  --console `
  --name "book-scanner-watcher" `
  --collect-all cv2 `
  --collect-all numpy `
  --hidden-import=watchdog.observers.polling `
  watch.py

$Exe = Join-Path $Dist "book-scanner-watcher.exe"
if (-not (Test-Path $Exe)) { throw "EXE не собран: $Exe" }

Copy-Item (Join-Path $Root "config.example.env") (Join-Path $Dist "config.example.env") -Force
Write-Host "OK: $Exe"
Write-Host "Рядом с exe положите config.env (из config.example.env)."
