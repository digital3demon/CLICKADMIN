# tar.gz bundle for Linux server (same as package-server-archive.sh).
# From repo root: npm run package:server-tar:ps1
#   .\scripts\package-server-archive.ps1
#   .\scripts\package-server-archive.ps1 -SkipBuild
#   .\scripts\package-server-archive.ps1 -WithDb
# Keep ASCII-only strings so Windows PowerShell 5.1 parses reliably.

param(
  [switch]$SkipBuild,
  [switch]$WithDb
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not $SkipBuild) {
  Write-Host "==> npm run build" -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$standalone = Join-Path $ProjectRoot ".next\standalone\server.js"
if (-not (Test-Path $standalone)) {
  Write-Error "Missing .next\standalone - run npm run build first."
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BundleName = "dental-lab-crm-server-$Stamp"
$Stage = Join-Path $ProjectRoot "dist\$BundleName"
$Dist = Join-Path $ProjectRoot "dist"
$Archive = Join-Path $Dist "$BundleName.tar.gz"

if (-not (Test-Path $Dist)) {
  New-Item -ItemType Directory -Path $Dist -Force | Out-Null
}
if (Test-Path $Stage) {
  Remove-Item $Stage -Recurse -Force
}
New-Item -ItemType Directory -Path $Stage -Force | Out-Null

Write-Host "==> copy standalone" -ForegroundColor Cyan
Copy-Item -Path (Join-Path $ProjectRoot ".next\standalone\*") -Destination $Stage -Recurse

$nextParent = Join-Path $Stage ".next"
if (-not (Test-Path $nextParent)) {
  New-Item -ItemType Directory -Path $nextParent -Force | Out-Null
}
$staticDest = Join-Path $Stage ".next\static"
if (Test-Path $staticDest) {
  Remove-Item $staticDest -Recurse -Force
}
Copy-Item -Path (Join-Path $ProjectRoot ".next\static") -Destination $staticDest -Recurse

Copy-Item -Path (Join-Path $ProjectRoot "public") -Destination (Join-Path $Stage "public") -Recurse
# Standalone may already include a partial prisma/ (output tracing). Copy-Item into that folder
# nests prisma/prisma — remove first, then copy the full repo prisma tree.
$prismaDest = Join-Path $Stage "prisma"
if (Test-Path $prismaDest) {
  Remove-Item $prismaDest -Recurse -Force
}
Copy-Item -Path (Join-Path $ProjectRoot "prisma") -Destination $prismaDest -Recurse
$envExample = Join-Path $ProjectRoot ".env.example"
if (Test-Path $envExample) {
  Copy-Item -Path $envExample -Destination (Join-Path $Stage ".env.example") -Force
}

foreach ($pat in @("*.db-wal", "*.db-shm")) {
  Get-ChildItem -Path (Join-Path $Stage "prisma") -Filter $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force
  }
}

if ($WithDb) {
  $dbSrc = Join-Path $ProjectRoot "prisma\dev.db"
  if (Test-Path $dbSrc) {
    Copy-Item -Path $dbSrc -Destination (Join-Path $Stage "prisma\dev.db") -Force
    "1" | Set-Content -Path (Join-Path $Stage "prisma\.BUNDLED_DB") -Encoding ascii
    Write-Host "    + prisma\dev.db" -ForegroundColor Cyan
  }
}

# Do NOT copy prisma CLI from dev node_modules: transitive deps (effect, ...) are missing,
# and Windows engines break Linux. On server use: npx prisma@VERSION migrate deploy
$prismaVer = (& node (Join-Path $ProjectRoot "scripts\write-prisma-cli-version.cjs")).Trim()
Set-Content -Path (Join-Path $Stage ".prisma-cli-version") -Value $prismaVer -Encoding ascii
Write-Host "==> pinned Prisma CLI version for server: $prismaVer (use npx)" -ForegroundColor Cyan

$chunks = Join-Path $Stage ".next\static\chunks"
if (-not (Test-Path $chunks) -or -not (Get-ChildItem $chunks -ErrorAction SilentlyContinue)) {
  Write-Error "Missing .next\static\chunks - build may have failed."
}

Write-Host "==> repair-standalone-bundle" -ForegroundColor Cyan
& node (Join-Path $ProjectRoot "scripts\repair-standalone-bundle.cjs") $Stage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Copy-Item -Path (Join-Path $ProjectRoot "scripts\ecosystem.standalone-bundle.cjs") -Destination (Join-Path $Stage "ecosystem.config.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\start-netangels.cjs") -Destination (Join-Path $Stage "start-netangels.cjs") -Force
$stageScripts = Join-Path $Stage "scripts"
New-Item -ItemType Directory -Path $stageScripts -Force | Out-Null
Copy-Item -Path (Join-Path $ProjectRoot "scripts\prisma-migrate-deploy.cjs") -Destination (Join-Path $stageScripts "prisma-migrate-deploy.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\ensure-tenant-columns-sqlite.cjs") -Destination (Join-Path $stageScripts "ensure-tenant-columns-sqlite.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\ensure-user-telegram-phone-sqlite.cjs") -Destination (Join-Path $stageScripts "ensure-user-telegram-phone-sqlite.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\ensure-doctor-extra-columns-sqlite.cjs") -Destination (Join-Path $stageScripts "ensure-doctor-extra-columns-sqlite.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\ensure-clinic-price-overrides-sqlite.cjs") -Destination (Join-Path $stageScripts "ensure-clinic-price-overrides-sqlite.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\ensure-role-module-access-sqlite.cjs") -Destination (Join-Path $stageScripts "ensure-role-module-access-sqlite.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\split-copy-pricing-from-clients.cjs") -Destination (Join-Path $stageScripts "split-copy-pricing-from-clients.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\split-copy-orders-from-clients.cjs") -Destination (Join-Path $stageScripts "split-copy-orders-from-clients.cjs") -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\prisma-migrate-deploy.cjs") -Destination (Join-Path $Stage "prisma-migrate-deploy.cjs") -Force
$nvmrc = Join-Path $ProjectRoot ".nvmrc"
if (Test-Path $nvmrc) {
  Copy-Item -Path $nvmrc -Destination (Join-Path $Stage ".nvmrc") -Force
}
$envTpl = Join-Path $ProjectRoot "scripts\env-kaiten-server.template.env"
if (Test-Path $envTpl) {
  Copy-Item $envTpl $Stage -Force
}
$ngx = Join-Path $ProjectRoot "scripts\nginx-dental-lab-crm.example.conf"
if (Test-Path $ngx) {
  Copy-Item $ngx $Stage -Force
}

& node (Join-Path $ProjectRoot "scripts\write-server-bundle-readme.cjs") $Stage $BundleName $Stamp $prismaVer
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> tar.gz" -ForegroundColor Cyan
if (Test-Path $Archive) {
  Remove-Item $Archive -Force
}
Push-Location $Dist
try {
  tar -czf $Archive $BundleName
  if ($LASTEXITCODE -ne 0) {
    Write-Error "tar failed with exit $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Done: $Archive" -ForegroundColor Green
Get-Item $Archive | Format-List FullName, Length, LastWriteTime
