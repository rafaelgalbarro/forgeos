# ForgeOS — Cloudflare Tunnel setup (Windows PowerShell)
# Creates permanent tunnel to localhost:3000 for remote mobile access.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BinDir = Join-Path $Root ".forgeos\bin"
$Cloudflared = Join-Path $BinDir "cloudflared.exe"
$EnvLocal = Join-Path $Root ".env.local"

Write-Host "`n=== ForgeOS Cloudflare Tunnel Setup ===`n" -ForegroundColor Cyan

# 1. Download cloudflared
if (-not (Test-Path $Cloudflared)) {
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
    $ReleaseUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Write-Host "Descargando cloudflared desde GitHub…" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $ReleaseUrl -OutFile $Cloudflared -UseBasicParsing
    Write-Host "  OK: $Cloudflared" -ForegroundColor Green
} else {
    Write-Host "cloudflared ya instalado: $Cloudflared" -ForegroundColor Green
}

Write-Host @"

PASOS MANUALES (una sola vez):
1. Autenticarse en Cloudflare:
   & '$Cloudflared' tunnel login

2. Crear túnel permanente:
   & '$Cloudflared' tunnel create forgeos

3. Configurar DNS (ejemplo):
   & '$Cloudflared' tunnel route dns forgeos investment.tudominio.com

4. Crear config en %USERPROFILE%\.cloudflared\config.yml:
   tunnel: <TUNNEL-UUID>
   credentials-file: %USERPROFILE%\.cloudflared\<TUNNEL-UUID>.json
   ingress:
     - hostname: investment.tudominio.com
       service: http://localhost:3000
     - service: http_status:404

5. Obtener token (alternativa rápida):
   & '$Cloudflared' tunnel token forgeos
   → Guardar como CLOUDFLARE_TUNNEL_TOKEN en .env.local

6. Arrancar túnel:
   npm run tunnel
   o
   npm run investment:remote

"@ -ForegroundColor White

if (Test-Path $EnvLocal) {
    $content = Get-Content $EnvLocal -Raw
    if ($content -notmatch "FORGEOS_PUBLIC_URL") {
        Add-Content $EnvLocal "`n# URL pública del túnel Cloudflare`nFORGEOS_PUBLIC_URL=`n"
        Write-Host "Añadido FORGEOS_PUBLIC_URL= a .env.local" -ForegroundColor Green
    }
} else {
    Write-Host "Crea .env.local y añade FORGEOS_PUBLIC_URL=https://tu-subdominio.tudominio.com" -ForegroundColor Yellow
}

Write-Host "`nSetup script completado.`n" -ForegroundColor Cyan
