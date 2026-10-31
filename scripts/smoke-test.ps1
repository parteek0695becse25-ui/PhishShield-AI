# End-to-end check: React proxy -> Java -> Python -> H2. Run while the app is started.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\common.ps1"
$stateFile = Join-Path $script:Root '.run\state.json'
if (-not (Test-Path $stateFile)) { Write-Bad "The app is not running. Start it with start.bat first."; exit 1 }
$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$base = "http://127.0.0.1:$($state.backendPort)/api"
$script:failed = 0

function Check($name, [scriptblock]$test) {
    try { $r = & $test; if ($r) { Write-Ok $name } else { Write-Bad $name; $script:failed++ } }
    catch { Write-Bad "$name ($($_.Exception.Message))"; $script:failed++ }
}
function Call($method, $path, $body, $token) {
    $h = @{}
    if ($token) { $h.Authorization = "Bearer $token" }
    $args2 = @{ Uri = "$base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
    if ($body) { $args2.Body = ($body | ConvertTo-Json); $args2.ContentType = 'application/json' }
    return Invoke-RestMethod @args2
}
function StatusOf($method, $path, $body, $token) {
    try { Call $method $path $body $token | Out-Null; return 200 }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
}

$login = Call 'POST' '/auth/login' @{ email = 'demo@phishshield.local'; password = 'Demo@1234' } $null
$t = $login.token
Check "Login with demo account" { [bool]$t }
Check "Protected endpoint rejects missing token (401)" { (StatusOf 'GET' '/scans' $null $null) -eq 401 }
Check "Java -> Python health" { (Call 'GET' '/health' $null $null).detectionEngine -eq 'UP' }

$harmless = Call 'POST' '/scans/message' @{ text = 'Hi, are we meeting for lunch tomorrow?' } $t
Check "Harmless message is LOW" { $harmless.riskLevel -eq 'LOW' }
$prize = Call 'POST' '/scans/message' @{ text = 'Congratulations! You have won Rs 25,00,000 lucky draw. Click http://bit.ly/claim-now and pay Rs 999 processing fee.' } $t
Check "Fake prize message is HIGH or CRITICAL" { $prize.riskLevel -in 'HIGH', 'CRITICAL' }
$urgent = Call 'POST' '/scans/message' @{ text = 'URGENT: Your SBI account will be blocked within 24 hours. Complete KYC now: http://sbi-kyc-update.xyz/login' } $t
Check "Urgent account warning is HIGH or CRITICAL" { $urgent.riskLevel -in 'HIGH', 'CRITICAL' }
$ip = Call 'POST' '/scans/url' @{ url = 'http://192.168.10.5/secure/login/verify-account.php' } $t
Check "IP-based URL is HIGH or CRITICAL" { $ip.riskLevel -in 'HIGH', 'CRITICAL' }
$ok = Call 'POST' '/scans/url' @{ url = 'https://www.wikipedia.org/wiki/Phishing' } $t
Check "Normal HTTPS URL is LOW" { $ok.riskLevel -eq 'LOW' }
Check "Invalid URL returns 400" { (StatusOf 'POST' '/scans/url' @{ url = 'not a real url' } $t) -eq 400 }
Check "Empty message returns 400" { (StatusOf 'POST' '/scans/message' @{ text = '  ' } $t) -eq 400 }

$list = Call 'GET' '/scans' $null $t
Check "Scan history lists saved scans" { @($list).Count -ge 5 }
Check "Scan details load" { (Call 'GET' "/scans/$($ip.id)" $null $t).id -eq $ip.id }
$stats = Call 'GET' '/dashboard/stats' $null $t
Check "Dashboard total matches history" { $stats.totalScans -eq @($list).Count }
Call 'DELETE' "/scans/$($harmless.id)" $null $t | Out-Null
Check "Deleted scan is gone (404)" { (StatusOf 'GET' "/scans/$($harmless.id)" $null $t) -eq 404 }
Check "Website proxy reaches the API" { (Invoke-RestMethod -Uri "http://127.0.0.1:$($state.frontendPort)/api/health").backend -eq 'UP' }

Write-Host ""
if ($script:failed -eq 0) { Write-Host "ALL CHECKS PASSED" -ForegroundColor Green; exit 0 }
Write-Host "$($script:failed) CHECK(S) FAILED" -ForegroundColor Red; exit 1
