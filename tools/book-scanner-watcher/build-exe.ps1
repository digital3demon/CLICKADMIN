# Build single ClickLab-Scanner.exe (no zip pack)
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

& $Pip install pyinstaller opencv-python-headless watchdog rapidocr-onnxruntime -i $Mirror --trusted-host $Trusted --default-timeout=180

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
  --collect-all rapidocr_onnxruntime `
  --collect-all onnxruntime `
  --hidden-import=watchdog.observers.polling `
  --hidden-import=numpy `
  --hidden-import=rapidocr_onnxruntime `
  watch.py

$Exe = Join-Path $Dist "ClickLab-Scanner.exe"
if (-not (Test-Path $Exe)) { throw "EXE не собран: $Exe" }

$Desk = Join-Path $env:USERPROFILE "Desktop\ClickLab-Scanner.exe"
Copy-Item $Exe $Desk -Force

$Scan = "C:\Users\sevas\Pictures\тест сканер\ClickLab-Scanner.exe"
if (Test-Path (Split-Path -Parent $Scan)) {
  Copy-Item $Exe $Scan -Force
}

Write-Host "OK: $Exe"
Write-Host "Desktop: $Desk"
if (Test-Path $Scan) { Write-Host "Scanner folder: $Scan" }
Get-Item $Exe | Format-Table Name, @{N='MB';E={[math]::Round($_.Length/1MB,1)}}, FullName -AutoSize
