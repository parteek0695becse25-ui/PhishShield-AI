$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\common.ps1"
Set-Location $script:Root
Refresh-Path

$runDir = Join-Path $script:Root '.run'
$logDir = Join-Path $script:Root 'logs'
$stateFile = Join-Path $runDir 'state.json'
$venvPy = Join-Path $script:Root 'ai-engine\.venv\Scripts\python.exe'
$jar = Join-Path $script:Root 'backend-java\target\phishshield-backend.jar'
$nodeModules = Join-Path $script:Root 'frontend\node_modules'

Write-Host ""
Write-Host "PhishShield AI - start" -ForegroundColor Cyan

# ---- 1. setup done?
if (-not (Test-Path (Join-Path $script:Root '.setup-complete')) -or -not (Test-Path $venvPy) -or -not (Test-Path $jar) -or -not (Test-Path $nodeModules)) {
    Write-Bad "Setup has not been completed yet."
    Write-Host "  Please double-click setup.bat first, wait for 'SETUP SUCCESSFUL', then run start.bat again."
    exit 1
}
if ((Get-JavaMajor) -lt 21) { Write-Bad "Java 21 was not found. Run setup.bat again."; exit 1 }
if (-not (Test-NpmOk)) { Write-Bad "npm was not found. Run setup.bat again."; exit 1 }

# ---- 2. already running?
if (Test-Path $stateFile) {
    Write-Host "  An earlier run was recorded. Stopping it first..."
    & "$PSScriptRoot\stop.ps1" -Quiet
}

New-Item -ItemType Directory -Force -Path $runDir, $logDir, (Join-Path $script:Root 'data') | Out-Null
Get-ChildItem $logDir -Filter *.log -ErrorAction SilentlyContinue | Remove-Item -ErrorAction SilentlyContinue

# ---- 3. ports
$enginePort = Get-FreePort 8000
$backendPort = Get-FreePort 8080
$frontPort = Get-FreePort 5173
if ($enginePort -eq 0 -or $backendPort -eq 0 -or $frontPort -eq 0) {
    Write-Bad "Could not find free network ports. Close other programs and try again."
    exit 1
}
if ($enginePort -ne 8000) { Write-Warn2 "Port 8000 is busy, the detection engine will use $enginePort." }
if ($backendPort -ne 8080) { Write-Warn2 "Port 8080 is busy, the backend will use $backendPort." }
if ($frontPort -ne 5173) { Write-Warn2 "Port 5173 is busy, the website will use $frontPort." }

$pids = @{}
function Save-State {
    @{ enginePid = $pids.engine; backendPid = $pids.backend; frontendPid = $pids.frontend;
       enginePort = $enginePort; backendPort = $backendPort; frontendPort = $frontPort } |
        ConvertTo-Json | Set-Content -Path $stateFile
}
function Fail-Start($name, $logs) {
    Write-Bad "$name did not start correctly."
    foreach ($l in $logs) { Show-LogTail $l }
    Write-Host ""
    Write-Host "  Stopping everything that was started..."
    & "$PSScriptRoot\stop.ps1" -Quiet
    Write-Host "  Full logs are in the logs folder."
    exit 1
}
function Wait-Service($name, $url, $proc, $timeoutSec, $logs) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if ($proc.HasExited) { Fail-Start $name $logs }
        if (Test-Url $url) { Write-Ok "$name is ready"; return }
        Start-Sleep -Milliseconds 800
    }
    Fail-Start "$name (timed out after $timeoutSec seconds)" $logs
}

# ---- 4. engine
Write-Step "Starting the Python detection engine on port $enginePort"
$engine = Start-Process -FilePath $venvPy -WorkingDirectory (Join-Path $script:Root 'ai-engine') `
    -ArgumentList @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', "$enginePort") `
    -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'engine.log') -RedirectStandardError (Join-Path $logDir 'engine.err.log')
$pids.engine = $engine.Id; Save-State
Wait-Service 'Detection engine' "http://127.0.0.1:$enginePort/health" $engine 60 @((Join-Path $logDir 'engine.err.log'), (Join-Path $logDir 'engine.log'))

# ---- 5. backend
Write-Step "Starting the Java backend on port $backendPort"
$env:ENGINE_URL = "http://127.0.0.1:$enginePort"
$backend = Start-Process -FilePath 'java' -WorkingDirectory $script:Root `
    -ArgumentList @('-Xmx512m', '-jar', $jar, "--server.port=$backendPort") `
    -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'backend.log') -RedirectStandardError (Join-Path $logDir 'backend.err.log')
$pids.backend = $backend.Id; Save-State
Wait-Service 'Java backend' "http://127.0.0.1:$backendPort/api/health" $backend 120 @((Join-Path $logDir 'backend.log'), (Join-Path $logDir 'backend.err.log'))

# ---- 6. frontend
Write-Step "Starting the React website on port $frontPort"
$env:VITE_API_PROXY = "http://127.0.0.1:$backendPort"
$front = Start-Process -FilePath 'cmd.exe' -WorkingDirectory (Join-Path $script:Root 'frontend') `
    -ArgumentList @('/c', "npm.cmd run dev -- --host 127.0.0.1 --port $frontPort --strictPort") `
    -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'frontend.log') -RedirectStandardError (Join-Path $logDir 'frontend.err.log')
$pids.frontend = $front.Id; Save-State
Wait-Service 'Website' "http://127.0.0.1:$frontPort/" $front 90 @((Join-Path $logDir 'frontend.log'), (Join-Path $logDir 'frontend.err.log'))

# ---- 7. done
$site = "http://127.0.0.1:$frontPort/"
Write-Host ""
Write-Host "PhishShield AI is running" -ForegroundColor Green
Write-Host "  Website         : $site"
Write-Host "  Backend API     : http://127.0.0.1:$backendPort/api/health"
Write-Host "  Detection engine: http://127.0.0.1:$enginePort/docs"
Write-Host "  Demo login      : demo@phishshield.local   password: Demo@1234"
Write-Host "  Logs            : the logs folder"
Write-Host "  To stop         : double-click stop.bat"
Start-Process $site
exit 0
