# Remove generated Prisma client, then prisma generate (Windows).
# If query_engine*.node is locked, stops node.exe processes tied to THIS repo only, then retries.

param(
  [switch] $KillAllNode
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Stop-NodeForThisRepo {
  param([string] $RepoRoot)
  $full = (Resolve-Path $RepoRoot).Path
  $fullLower = $full.ToLowerInvariant()
  $fullFwd = $fullLower -replace "\\", "/"
  $killed = [System.Collections.ArrayList]@()
  $procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
  foreach ($proc in $procs) {
    $cmd = $proc.CommandLine
    if (-not $cmd) { continue }
    $c = $cmd.ToLowerInvariant()
    if (-not $c.Contains($fullLower) -and -not $c.Contains($fullFwd)) { continue }
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      [void]$killed.Add($proc.ProcessId)
    } catch { }
  }
  return @($killed)
}

function Stop-AllNode {
  Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch { }
  }
}

function Remove-PrismaClientDir {
  param([string] $Dir)
  if (-not (Test-Path $Dir)) { return $true }
  try {
    Remove-Item -LiteralPath $Dir -Recurse -Force -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

$prismaDir = Join-Path $root "node_modules\.prisma\client"

if (-not (Remove-PrismaClientDir -Dir $prismaDir)) {
  Write-Host "Could not remove (file locked). Stopping node.exe for this repo..."
  $pids = Stop-NodeForThisRepo -RepoRoot $root
  if (@($pids).Count -gt 0) {
    Write-Host ("Stopped PIDs: " + ($pids -join ", "))
  } else {
    Write-Host "No matching node.exe found for this folder."
  }
  Start-Sleep -Seconds 2
  if (-not (Remove-PrismaClientDir -Dir $prismaDir)) {
    if ($KillAllNode) {
      Write-Host "KillAllNode: stopping every node.exe ..."
      Stop-AllNode
      Start-Sleep -Seconds 2
    }
    if (-not (Remove-PrismaClientDir -Dir $prismaDir)) {
      Write-Host ""
      Write-Host "Still locked. Try:"
      Write-Host "  1) Stop npm run dev / Prisma Studio."
      Write-Host "  2) Close Cursor/VS Code, run this script from an external cmd window."
      Write-Host "  3) Re-run with: powershell -File scripts/prisma-clean-generate.ps1 -KillAllNode"
      Write-Host "     (stops ALL node.exe on this PC - save other work first.)"
      exit 1
    }
  }
}

Write-Host "npx prisma generate"
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done."
