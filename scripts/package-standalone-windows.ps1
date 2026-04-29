# Portable standalone build for Windows. Run from repo root: npm run package:windows
# Keep this script ASCII-only so Windows PowerShell 5.1 parses it regardless of file encoding.
#
# Bundles prisma\dev.db when present (full CRM database). First run: START.bat skips
# db push + seed and starts the server. If dev.db is missing, portable uses db push + seed.

param(
  [string]$SqliteSourcePath = "",
  [switch]$SkipBundledDatabase
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "==> npm run build (portable single-user: NEXT_PUBLIC_CRM_SINGLE_USER=1)" -ForegroundColor Cyan
$prevSingle = $env:NEXT_PUBLIC_CRM_SINGLE_USER
$env:NEXT_PUBLIC_CRM_SINGLE_USER = "1"
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  if ($null -eq $prevSingle) {
    Remove-Item Env:\NEXT_PUBLIC_CRM_SINGLE_USER -ErrorAction SilentlyContinue
  } else {
    $env:NEXT_PUBLIC_CRM_SINGLE_USER = $prevSingle
  }
}

$standalone = Join-Path $ProjectRoot ".next\standalone"
if (-not (Test-Path $standalone)) {
  Write-Error "Missing .next\standalone. Set output: 'standalone' in next.config.ts and run npm run build."
}

$out = Join-Path $ProjectRoot "dist\dental-lab-crm-portable"
if (Test-Path $out) {
  Remove-Item $out -Recurse -Force
}
New-Item -ItemType Directory -Path $out | Out-Null

Write-Host "==> Copy .next\standalone -> dist\dental-lab-crm-portable" -ForegroundColor Cyan
Copy-Item -Path (Join-Path $standalone "*") -Destination $out -Recurse

# Standalone may already contain .next\static (stub). Remove it, then copy full build static tree.
$staticSrc = Join-Path $ProjectRoot ".next\static"
$staticDest = Join-Path $out ".next\static"
if (Test-Path $staticSrc) {
  $nextParent = Join-Path $out ".next"
  if (-not (Test-Path $nextParent)) {
    New-Item -ItemType Directory -Path $nextParent -Force | Out-Null
  }
  if (Test-Path $staticDest) {
    Remove-Item $staticDest -Recurse -Force
  }
  Copy-Item -Path $staticSrc -Destination $staticDest -Recurse -Force
}

$publicSrc = Join-Path $ProjectRoot "public"
if (Test-Path $publicSrc) {
  Copy-Item -Path $publicSrc -Destination (Join-Path $out "public") -Recurse
}

Write-Host "==> Copy prisma folder" -ForegroundColor Cyan
# Standalone may already include a partial prisma/; Copy-Item into it nests prisma/prisma.
$prOut = Join-Path $out "prisma"
if (Test-Path $prOut) {
  Remove-Item $prOut -Recurse -Force
}
Copy-Item -Path (Join-Path $ProjectRoot "prisma") -Destination $prOut -Recurse
foreach ($pat in @("*.db-wal", "*.db-shm")) {
  Get-ChildItem -Path $prOut -Filter $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "   - omit SQLite sidecar: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Force
  }
}

function Resolve-BundleSqliteSource([string]$root, [string]$explicit) {
  if ($explicit.Trim().Length -gt 0) {
    $p = $explicit.Trim()
    if (-not [IO.Path]::IsPathRooted($p)) {
      $p = Join-Path $root $p
    }
    if (Test-Path $p) { return $p }
    Write-Warning "Portable: -SqliteSourcePath not found: $p"
    return $null
  }
  $def = Join-Path $root "prisma\dev.db"
  if (Test-Path $def) { return $def }
  $envPath = Join-Path $root ".env"
  if (-not (Test-Path $envPath)) { return $null }
  foreach ($line in Get-Content $envPath -Encoding UTF8) {
    $t = $line.Trim()
    if ($t.StartsWith("#")) { continue }
    if ($t -notmatch '^\s*DATABASE_URL\s*=\s*(.+)\s*$') { continue }
    $raw = $Matches[1].Trim()
    if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
    if ($raw.StartsWith("'") -and $raw.EndsWith("'")) { $raw = $raw.Substring(1, $raw.Length - 2) }
    if ($raw -match '^file:\./(.+)$') {
      $rel = $Matches[1].Trim()
      $joined = Join-Path (Join-Path $root "prisma") $rel
      if (Test-Path $joined) { return $joined }
    }
    break
  }
  return $null
}

if (-not $SkipBundledDatabase) {
  $dbSrc = Resolve-BundleSqliteSource $ProjectRoot $SqliteSourcePath
  if ($null -ne $dbSrc) {
    $dbDst = Join-Path $prOut "dev.db"
    Copy-Item -Path $dbSrc -Destination $dbDst -Force
    $marker = Join-Path $prOut ".PORTABLE_FULL_DB"
    "1" | Set-Content -Path $marker -Encoding ascii
    $sz = (Get-Item $dbDst).Length
    Write-Host ('   + bundled SQLite prisma\dev.db ' + $sz + ' bytes - first start without seed') -ForegroundColor Cyan
  } else {
    Write-Host '   ! no SQLite found to bundle (prisma\dev.db or DATABASE_URL in .env) - portable will db push + seed' -ForegroundColor Yellow
  }
} else {
  Write-Host "   - SkipBundledDatabase: portable first run uses db push + seed" -ForegroundColor DarkGray
}

$destNm = Join-Path $out "node_modules"
if (-not (Test-Path $destNm)) {
  New-Item -ItemType Directory -Path $destNm | Out-Null
}

function Copy-NodeModule($name) {
  $src = Join-Path $ProjectRoot "node_modules\$name"
  $dst = Join-Path $destNm $name
  if (Test-Path $src) {
    Write-Host "   + node_modules\$name" -ForegroundColor DarkGray
    if (Test-Path $dst) {
      Remove-Item $dst -Recurse -Force
    }
    Copy-Item -Path $src -Destination $dst -Recurse -Force
  }
}

# Prisma CLI pulls @prisma/config -> effect, c12, ... (not under @prisma/). Copy full production dep tree.
function Copy-NpmDependencyTree([string]$srcNmRoot, [string]$dstNmRoot, [string]$entryName) {
  $seen = @{}
  $q = New-Object System.Collections.Generic.Queue[string]
  $q.Enqueue($entryName)
  while ($q.Count -gt 0) {
    $pkg = $q.Dequeue()
    if ($seen.ContainsKey($pkg)) { continue }
    $seen[$pkg] = $true

    $rel = $pkg.Replace("/", [string][char]92)
    $src = Join-Path $srcNmRoot $rel
    if (-not (Test-Path $src)) {
      Write-Warning "Portable pack: skip missing package: $pkg"
      continue
    }
    $dst = Join-Path $dstNmRoot $rel
    if (Test-Path $dst) {
      Remove-Item $dst -Recurse -Force
    }
    $par = Split-Path $dst -Parent
    if (-not (Test-Path $par)) {
      New-Item -ItemType Directory -Path $par -Force | Out-Null
    }
    Copy-Item -Path $src -Destination $dst -Recurse -Force
    Write-Host "   + prisma-cli-dep $rel" -ForegroundColor DarkGray

    $pj = Join-Path $src "package.json"
    if (-not (Test-Path $pj)) { continue }
    $raw = Get-Content $pj -Raw -Encoding UTF8
    try {
      $jo = $raw | ConvertFrom-Json
    } catch {
      continue
    }
    if ($null -eq $jo.dependencies) { continue }
    foreach ($p in $jo.dependencies.PSObject.Properties) {
      $q.Enqueue($p.Name)
    }
  }
}

Write-Host "==> Extra node_modules: Prisma, exceljs, pino, Noto (PDF)" -ForegroundColor Cyan
Copy-NodeModule ".prisma"
Copy-NodeModule "@prisma"
Copy-NodeModule "prisma"
$srcNm = Join-Path $ProjectRoot "node_modules"
Copy-NpmDependencyTree $srcNm $destNm "prisma"
Copy-NodeModule "bcryptjs"
Copy-NodeModule "exceljs"

# Next.js standalone file trace does not pull pino - needed for /api/health, /api/orders, etc.
$pinoPkgs = @(
  "pino",
  "atomic-sleep",
  "on-exit-leak-free",
  "pino-abstract-transport",
  "pino-std-serializers",
  "process-warning",
  "quick-format-unescaped",
  "real-require",
  "safe-stable-stringify",
  "sonic-boom",
  "thread-stream",
  "split2",
  "@pinojs/redact"
)
foreach ($pkg in $pinoPkgs) {
  Copy-NodeModule $pkg
}

$fontNotoSrc = Join-Path $ProjectRoot "node_modules\@fontsource\noto-sans"
$fontNotoDst = Join-Path $destNm "@fontsource\noto-sans"
if (Test-Path $fontNotoSrc) {
  Write-Host "   + node_modules\@fontsource\noto-sans" -ForegroundColor DarkGray
  if (Test-Path $fontNotoDst) {
    Remove-Item $fontNotoDst -Recurse -Force
  }
  $fontParent = Join-Path $destNm "@fontsource"
  if (-not (Test-Path $fontParent)) {
    New-Item -ItemType Directory -Path $fontParent -Force | Out-Null
  }
  Copy-Item -Path $fontNotoSrc -Destination $fontNotoDst -Recurse -Force
}

Write-Host "==> Prisma CLI (node_modules\.bin) for offline migrate" -ForegroundColor Cyan
$binSrc = Join-Path $ProjectRoot "node_modules\.bin"
$binDst = Join-Path $destNm ".bin"
if (-not (Test-Path $binDst)) {
  New-Item -ItemType Directory -Path $binDst -Force | Out-Null
}
foreach ($pat in @("prisma", "prisma.cmd", "prisma.ps1")) {
  $fs = Join-Path $binSrc $pat
  if (Test-Path $fs) {
    Copy-Item -Path $fs -Destination (Join-Path $binDst $pat) -Force
  }
}

$envExample = Join-Path $ProjectRoot ".env.standalone.example"
Copy-Item -Path $envExample -Destination (Join-Path $out ".env.standalone.example") -Force
Copy-Item -Path $envExample -Destination (Join-Path $out ".env") -Force
Write-Host "   + .env (pre-filled)" -ForegroundColor DarkGray

Copy-Item -Path (Join-Path $ProjectRoot "scripts\PORTABLE-WINDOWS-RU.txt") -Destination (Join-Path $out "PORTABLE-WINDOWS-RU.txt") -Force
# Cyrillic filename "Zapusk.bat" without non-ASCII bytes in this script (UTF-8/no-BOM safe).
$zapuskName = (-join @(
    [char]0x0417, [char]0x0430, [char]0x043F, [char]0x0443, [char]0x0441, [char]0x043A
  )) + ".bat"
Copy-Item -Path (Join-Path $ProjectRoot "scripts\portable-run.bat") -Destination (Join-Path $out $zapuskName) -Force
Copy-Item -Path (Join-Path $ProjectRoot "scripts\portable-run.bat") -Destination (Join-Path $out "START.bat") -Force
# UTF-8 BOM breaks cmd.exe if it appears before @echo off - strip BOM from both launchers.
foreach ($batPath in @((Join-Path $out "START.bat"), (Join-Path $out $zapuskName))) {
  if (Test-Path $batPath) {
    $bytes = [IO.File]::ReadAllBytes($batPath)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
      $trim = $bytes[3..($bytes.Length - 1)]
      [IO.File]::WriteAllBytes($batPath, $trim)
    }
  }
}

# Standalone embeds the developer PC path in server.js + required-server-files.json.
# On another machine that breaks /_next/static (page shell loads, scripts/CSS 404).
Write-Host "==> Repair embedded paths for portable (any folder / any PC)" -ForegroundColor Cyan
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$serverJsPath = Join-Path $out "server.js"
if (Test-Path $serverJsPath) {
  $t = [IO.File]::ReadAllText($serverJsPath, $utf8NoBom)
  $emptyTrace = '"outputFileTracingRoot":""'
  $emptyTurbo = '"turbopack":{}'
  $t = $t -replace '"outputFileTracingRoot":"(?:[^"\\]|\\.)*"', $emptyTrace
  $t = $t -replace '"turbopack":\{"root":"(?:[^"\\]|\\.)*"\}', $emptyTurbo
  $oldHost = "const hostname = process.env.HOSTNAME || '0.0.0.0'"
  $newHost = "const hostname = process.env.CRM_BIND_HOST || process.env.HOSTNAME || '0.0.0.0'"
  if ($t.Contains($oldHost)) {
    $t = $t.Replace($oldHost, $newHost)
  }
  [IO.File]::WriteAllText($serverJsPath, $t, $utf8NoBom)
}
$rsfPath = Join-Path $out ".next\required-server-files.json"
if (Test-Path $rsfPath) {
  $r = [IO.File]::ReadAllText($rsfPath, $utf8NoBom)
  $appDot = '"appDir":"."'
  $emptyTrace2 = '"outputFileTracingRoot":""'
  $emptyTurbo2 = '"turbopack":{}'
  $r = $r -replace '"appDir"\s*:\s*"(?:[^"\\]|\\.)*"', $appDot
  $r = $r -replace '"outputFileTracingRoot"\s*:\s*"(?:[^"\\]|\\.)*"', $emptyTrace2
  $r = $r -replace '(?s)"turbopack"\s*:\s*\{[^}]*\}', $emptyTurbo2
  [IO.File]::WriteAllText($rsfPath, $r, $utf8NoBom)
}

Write-Host "==> Verify Prisma CLI in portable (deps like effect present)" -ForegroundColor Cyan
Push-Location $out
try {
  & node "node_modules\prisma\build\index.js" --version
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Prisma CLI self-check failed in portable folder (exit $LASTEXITCODE)."
  }
} finally {
  Pop-Location
}

$zipPath = Join-Path (Join-Path $ProjectRoot "dist") "dental-lab-crm-portable.zip"
Write-Host "==> Zip -> $zipPath" -ForegroundColor Cyan
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
Compress-Archive -LiteralPath $out -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "Done: $out" -ForegroundColor Green
Write-Host "Archive: $zipPath" -ForegroundColor Green
Write-Host "Tester: Node.js LTS, unpack, double-click Zapusk.bat (Cyrillic name in folder)"
Write-Host "See PORTABLE-WINDOWS-RU.txt in the portable folder."
