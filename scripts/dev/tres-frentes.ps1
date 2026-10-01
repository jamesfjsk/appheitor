# Cria as frentes do Cursor em pastas ao lado do repositório (sem argumento: p12, p16 e p15a).
# Uso, na pasta appheitor, depois do commit: powershell -ExecutionPolicy Bypass -File scripts\dev\tres-frentes.ps1
# Uma frente só: powershell -ExecutionPolicy Bypass -File scripts\dev\tres-frentes.ps1 p17
param([string[]]$Frentes = @('p12', 'p16', 'p15a'))
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$parent = Split-Path -Parent $repo
Set-Location $repo
if (git status --porcelain) { Write-Host 'Primeiro o commit: o git status precisa estar limpo.'; exit 1 }
foreach ($f in $Frentes) {
  $dir = Join-Path $parent "appheitor-$f"
  if (-not (Test-Path $dir)) { git worktree add $dir -b $f main }
  Copy-Item (Join-Path $repo '.env') (Join-Path $dir '.env') -Force
  Push-Location $dir
  Write-Host "Instalando dependências em $dir ..."
  npm ci --no-audit --no-fund
  if ($f -eq 'p15a') { npm --prefix functions ci --no-audit --no-fund }
  Pop-Location
  Write-Host "Pronta: $dir"
}
Write-Host ''
Write-Host 'Abra cada pasta numa janela do Cursor e cole o comando da frente.'
