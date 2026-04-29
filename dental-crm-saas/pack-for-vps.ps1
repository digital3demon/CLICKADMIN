#Requires -Version 5.1
# Zip for VPS deploy: excludes node_modules, .next, .git, .env*, *.db, etc.
# Usage:  .\pack-for-vps.ps1
#         .\pack-for-vps.ps1 -ProjectPath "D:\work\my-app"
# Output: Desktop\deploy-archives\<folder-name>-vps-<timestamp>.zip

param(
    [string]$ProjectPath = $PSScriptRoot,
    [string]$OutDir = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'deploy-archives')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    Write-Error "Path not found: $ProjectPath"
}

$project = (Resolve-Path -LiteralPath $ProjectPath).Path
$name = Split-Path $project -Leaf
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipName = "${name}-vps-${stamp}.zip"

if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}
$zipPath = Join-Path $OutDir $zipName

# tar excludes are relative to project root (Windows 10+ built-in tar)
$excludeDirs = @(
    'node_modules',
    '.next',
    '.git',
    '.turbo',
    'coverage',
    'dist',
    '.vercel',
    'playwright-report',
    'test-results'
)
$excludeFiles = @(
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test'
)

$tarArgs = [System.Collections.ArrayList]@()
[void]$tarArgs.Add('-a')
[void]$tarArgs.Add('-c')
[void]$tarArgs.Add('-f')
[void]$tarArgs.Add($zipPath)
foreach ($e in $excludeDirs) {
    [void]$tarArgs.Add('--exclude')
    [void]$tarArgs.Add($e)
}
foreach ($e in $excludeFiles) {
    [void]$tarArgs.Add('--exclude')
    [void]$tarArgs.Add($e)
}
[void]$tarArgs.Add('--exclude')
[void]$tarArgs.Add('*.db')
[void]$tarArgs.Add('.')

$tar = Get-Command tar -ErrorAction SilentlyContinue
if (-not $tar) {
    Write-Error "tar not found. Install Git for Windows or use Windows 10+."
}

Write-Host "Project: $project"
Write-Host "Archive: $zipPath"
Write-Host ""

Push-Location -LiteralPath $project
try {
    & tar @tarArgs
    if ($LASTEXITCODE -ne 0) {
        throw "tar exited with code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

$item = Get-Item -LiteralPath $zipPath
$mb = [math]::Round($item.Length / 1MB, 2)
Write-Host "Done: $($item.Name) ($mb MiB)"
