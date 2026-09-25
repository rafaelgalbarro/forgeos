$Root = $PSScriptRoot
$Python = Join-Path $Root "services\ibkr-broker\.venv\Scripts\python.exe"
$IbkrDir = Join-Path $Root "services\ibkr-broker"
$ApiKey = "9TbnaQRIf67NR3NpWpCPmlMoVxKOYiDAfWbLHKOa67RDIg_tvHaxuTHuEBsqNAbR"
$NodePath = "C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node"

Write-Host "1. Comprobando TWS en 127.0.0.1:7497..."
$tws = Test-NetConnection -ComputerName 127.0.0.1 -Port 7497 -WarningAction SilentlyContinue
if ($tws.TcpTestSucceeded -ne $true) {
    Write-Host "ERROR: TWS no esta corriendo. Abre TWS paper (puerto 7497) y vuelve a ejecutar."
    exit 1
}
Write-Host "OK - TWS activo"

Write-Host "2. Arrancando IBKR FastAPI en puerto 8002..."
$env:IBKR_HOST = "127.0.0.1"
$env:IBKR_PORT = "7497"
$env:INTERNAL_API_KEY = $ApiKey
$env:APPROVAL_SECRET = "forgeos-approval-secret-local-2026-forgeos"
$env:IBKR_READ_ONLY = "false"
$env:LIVE_TRADING_ENABLED = "true"
Start-Process -FilePath $Python -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8002" -WorkingDirectory $IbkrDir -WindowStyle Hidden
Write-Host "OK - uvicorn iniciado"

Write-Host "3. Esperando 3 segundos..."
Start-Sleep -Seconds 3

Write-Host "4. Conectando a TWS..."
$headers = @{ "X-Internal-Api-Key" = $ApiKey }
Invoke-WebRequest -Uri "http://127.0.0.1:8002/api/ibkr/connect" -Method POST -Headers $headers -UseBasicParsing | Out-Null
Write-Host "OK - connect enviado"

Write-Host "5. Arrancando npm run dev..."
$env:PATH = $NodePath + ";" + $env:PATH
$env:IBKR_INTERNAL_API_KEY = $ApiKey
$env:IBKR_SERVICE_URL = "http://127.0.0.1:8002"
Set-Location $Root
npm run dev
