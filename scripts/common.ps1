# Shared helpers for PhishShield AI scripts (ASCII only on purpose for Windows PowerShell 5.1).
$script:Root = Split-Path -Parent $PSScriptRoot

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

function Write-Step($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host "  [OK]   $text" -ForegroundColor Green }
function Write-Warn2($text) { Write-Host "  [WARN] $text" -ForegroundColor Yellow }
function Write-Bad($text) { Write-Host "  [FAIL] $text" -ForegroundColor Red }

function Get-ToolOutput($command) {
    try { return (& cmd.exe /c "$command 2>&1" | Out-String) } catch { return "" }
}

function Get-JavaMajor {
    $out = Get-ToolOutput "java -version"
    if ($out -match 'version "(\d+)(?:\.(\d+))?') {
        $major = [int]$Matches[1]
        if ($major -eq 1 -and $Matches[2]) { return [int]$Matches[2] }
        return $major
    }
    return 0
}

function Get-PythonCommand {
    foreach ($cmd in @('python', 'py -3')) {
        $out = Get-ToolOutput "$cmd --version"
        if ($out -match 'Python (\d+)\.(\d+)') {
            if ([int]$Matches[1] -eq 3 -and [int]$Matches[2] -ge 10) { return $cmd }
        }
    }
    return $null
}

function Get-NodeMajor {
    $out = Get-ToolOutput "node --version"
    if ($out -match 'v(\d+)\.') { return [int]$Matches[1] }
    return 0
}

function Test-NpmOk {
    $out = Get-ToolOutput "npm.cmd --version"
    return ($out -match '^\s*\d+\.\d+')
}

function Test-PortFree([int]$port) {
    try {
        $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse('127.0.0.1'), $port)
        $l.Start(); $l.Stop()
        return $true
    } catch { return $false }
}

function Get-FreePort([int]$preferred) {
    for ($p = $preferred; $p -lt ($preferred + 30); $p++) {
        if (Test-PortFree $p) { return $p }
    }
    return 0
}

function Test-Url($url, [int]$timeoutSec = 2) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSec
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch { return $false }
}

function Show-LogTail($path, [int]$lines = 25) {
    if (Test-Path $path) {
        Write-Host "  ---- last lines of $path ----" -ForegroundColor DarkGray
        Get-Content $path -Tail $lines | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }
}

function Get-MavenCommand {
    $local = Join-Path $script:Root '.tools\apache-maven-3.9.9\bin\mvn.cmd'
    if (Test-Path $local) { return $local }
    $out = Get-ToolOutput "mvn -version"
    if ($out -match 'Apache Maven') { return 'mvn' }
    return $null
}
