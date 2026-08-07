# Build self-contained GUI exe (no console window)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Mirror = "https://pypi.tuna.tsinghua.edu.cn/simple"
$Trusted = "pypi.tuna.tsinghua.edu.cn"
$Py = "C:\Users\sevas\AppData\Local\Programs\Python\Python311\python.exe"
if (-not (Test-Path $Py)) {
  $Py = (Get-Command python -ErrorAction SilentlyContinue).Source
}
if (-not $Py) { throw "Python не найден" }

$Venv = Join-Path $Root ".venv-build"
if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
  & $Py -m venv $Venv
}
$Pip = Join-Path $Venv "Scripts\pip.exe"
$PyInst = Join-Path $Venv "Scripts\pyinstaller.exe"

& $Pip install pyinstaller opencv-python-headless watchdog -i $Mirror --trusted-host $Trusted --default-timeout=120

$Dist = Join-Path $Root "dist"
$Build = Join-Path $Root "build"
Remove-Item -Recurse -Force $Dist, $Build -ErrorAction SilentlyContinue

& $PyInst `
  --noconfirm `
  --clean `
  --onefile `
  --windowed `
  --name "ClickLab-Scanner" `
  --collect-all cv2 `
  --hidden-import=watchdog.observers.polling `
  --hidden-import=numpy `
  watch.py

$Exe = Join-Path $Dist "ClickLab-Scanner.exe"
if (-not (Test-Path $Exe)) { throw "EXE не собран: $Exe" }

$PackDir = Join-Path $Dist "ClickLab-Scanner"
Remove-Item -Recurse -Force $PackDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $PackDir | Out-Null
Copy-Item $Exe (Join-Path $PackDir "ClickLab-Scanner.exe")
Copy-Item (Join-Path $Root "README.md") (Join-Path $PackDir "README.md") -Force

@"
Click Lab — сканер в заказ
==========================

1. Запустите ClickLab-Scanner.exe
2. В окне укажите папку сканера, адрес CRM и API-ключ (с пояснениями на экране)
3. Нажмите «Сохранить настройки», затем «Начать работу»

Python устанавливать не нужно.
"@ | Set-Content -Path (Join-Path $PackDir "КАК ЗАПУСТИТЬ.txt") -Encoding UTF8

$Zip = Join-Path $Root "book-scanner-watcher-exe.zip"
if (Test-Path $Zip) { Remove-Item $Zip -Force }
Compress-Archive -Path (Join-Path $PackDir "*") -DestinationPath $Zip -Force

$Desk = Join-Path $env:USERPROFILE "Desktop\ClickLab-Scanner-Watcher.zip"
Copy-Item $Zip $Desk -Force

Write-Host "OK: $Exe"
Write-Host "ZIP: $Zip"
Write-Host "Desktop: $Desk"
Get-Item $Exe, $Zip | Format-Table Name, @{N='MB';E={[math]::Round($_.Length/1MB,1)}} -AutoSize
