param([switch]$Quiet)
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\common.ps1"
$stateFile = Join-Path $script:Root '.run\state.json'

if (-not (Test-Path $stateFile)) {
    if (-not $Quiet) { Write-Host "PhishShield AI does not appear to be running (no saved process list)." }
    exit 0
}
try { $state = Get-Content $stateFile -Raw | ConvertFrom-Json } catch { $state = $null }

if ($state) {
    foreach ($item in @(@('Website', $state.frontendPid), @('Java backend', $state.backendPid), @('Detection engine', $state.enginePid))) {
        $name = $item[0]; $procId = $item[1]
        if ($procId) {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                & taskkill.exe /PID $procId /T /F | Out-Null
                if (-not $Quiet) { Write-Host "  Stopped $name (process $procId)" -ForegroundColor Green }
            } elseif (-not $Quiet) {
                Write-Host "  $name was already stopped"
            }
        }
    }
}
Remove-Item $stateFile -ErrorAction SilentlyContinue
if (-not $Quiet) { Write-Host "PhishShield AI has been stopped." -ForegroundColor Green }
exit 0
