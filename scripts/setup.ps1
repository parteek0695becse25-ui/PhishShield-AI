$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\common.ps1"
Set-Location $script:Root
Remove-Item (Join-Path $script:Root '.setup-complete') -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "PhishShield AI - setup" -ForegroundColor Cyan
Write-Host "This checks your tools, installs what is missing and prepares the project."
Write-Host "It does not need administrator rights unless Windows itself asks for it."

# ------------------------------------------------------------------ 1. tools
Write-Step "Step 1 of 5: checking required software"
Refresh-Path
$javaMajor = Get-JavaMajor
$py = Get-PythonCommand
$nodeMajor = Get-NodeMajor
$npmOk = Test-NpmOk

function Show-Status {
    if ($javaMajor -ge 21) { Write-Ok "Java $javaMajor found" } else { Write-Bad "Java 21 or newer is missing (found: $javaMajor)" }
    if ($py) { Write-Ok "Python found ($py)" } else { Write-Bad "Python 3.10 or newer is missing" }
    if ($nodeMajor -ge 18) { Write-Ok "Node.js $nodeMajor found" } else { Write-Bad "Node.js 18 or newer is missing" }
    if ($npmOk) { Write-Ok "npm found" } else { Write-Bad "npm is missing (it comes with Node.js)" }
}
Show-Status

$missing = @()
if ($javaMajor -lt 21) { $missing += @{ Name = 'Java 21 (JDK)'; Id = 'EclipseAdoptium.Temurin.21.JDK' } }
if (-not $py) { $missing += @{ Name = 'Python 3.12'; Id = 'Python.Python.3.12' } }
if ($nodeMajor -lt 18 -or -not $npmOk) { $missing += @{ Name = 'Node.js LTS'; Id = 'OpenJS.NodeJS.LTS' } }

if ($missing.Count -gt 0) {
    Write-Step "Installing missing software"
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Bad "Windows package manager (winget) was not found, so I cannot install automatically."
        Write-Host "  Please install the missing items manually (links are also in README.md):"
        foreach ($m in $missing) { Write-Host "   - $($m.Name)" }
        Write-Host "   Java 21 : https://adoptium.net/temurin/releases/?version=21"
        Write-Host "   Python  : https://www.python.org/downloads/   (tick 'Add python.exe to PATH')"
        Write-Host "   Node.js : https://nodejs.org/en/download"
        Write-Host "  Then close this window and run setup.bat again."
        exit 1
    }
    Write-Host "  winget is available. These will be installed:"
    foreach ($m in $missing) { Write-Host "   - $($m.Name)  ($($m.Id))" }
    Write-Host "  Windows may show a permission (UAC) prompt for some installers. That is normal."
    $answer = Read-Host "  Install now? [Y/n]"
    if ($answer -match '^(n|no)$') {
        Write-Warn2 "Installation skipped. Install the items above manually and run setup.bat again."
        exit 1
    }
    foreach ($m in $missing) {
        Write-Host ""
        Write-Host "  Installing $($m.Name)..." -ForegroundColor Cyan
        & winget install --id $m.Id -e --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) { Write-Warn2 "winget reported exit code $LASTEXITCODE for $($m.Name). Checking again below." }
    }
    Refresh-Path
    $javaMajor = Get-JavaMajor
    $py = Get-PythonCommand
    $nodeMajor = Get-NodeMajor
    $npmOk = Test-NpmOk
    Write-Step "Re-checking after installation"
    Show-Status
    if ($javaMajor -lt 21 -or -not $py -or $nodeMajor -lt 18 -or -not $npmOk) {
        Write-Host ""
        Write-Warn2 "Something is still not visible in this window. This is normal right after an install."
        Write-Host "  Close this window, double-click setup.bat again, and it will continue."
        Write-Host "  If it still fails, install manually using the links in README.md."
        exit 1
    }
}

# ------------------------------------------------------------------ 2. maven
Write-Step "Step 2 of 5: build tool for the Java backend (Maven)"
$mvn = Get-MavenCommand
if ($mvn) {
    Write-Ok "Maven available"
} else {
    $toolsDir = Join-Path $script:Root '.tools'
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $zip = Join-Path $toolsDir 'maven.zip'
    $url = 'https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip'
    Write-Host "  Downloading portable Maven 3.9.9 into .tools (about 9 MB, no installation)..."
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
        Remove-Item $zip -ErrorAction SilentlyContinue
    } catch {
        Write-Bad "Could not download Maven: $($_.Exception.Message)"
        Write-Host "  Check your internet connection or download it yourself from:"
        Write-Host "  $url"
        Write-Host "  and unzip it so that .tools\apache-maven-3.9.9\bin\mvn.cmd exists."
        exit 1
    }
    $mvn = Get-MavenCommand
    if (-not $mvn) { Write-Bad "Maven was downloaded but could not be found."; exit 1 }
    Write-Ok "Maven ready"
}

# ------------------------------------------------------------------ 3. python
Write-Step "Step 3 of 5: Python detection engine"
$venvDir = Join-Path $script:Root 'ai-engine\.venv'
$venvPy = Join-Path $venvDir 'Scripts\python.exe'
if (-not (Test-Path $venvPy)) {
    Write-Host "  Creating virtual environment..."
    & cmd.exe /c "$py -m venv `"$venvDir`""
}
if (-not (Test-Path $venvPy)) { Write-Bad "Could not create the Python virtual environment."; exit 1 }
Write-Host "  Installing Python packages (first time can take a minute)..."
& $venvPy -m pip install --disable-pip-version-check -r (Join-Path $script:Root 'ai-engine\requirements.txt')
if ($LASTEXITCODE -ne 0) { Write-Bad "pip could not install the Python packages. Check your internet connection."; exit 1 }
& $venvPy -c "import fastapi, pydantic, uvicorn"
if ($LASTEXITCODE -ne 0) { Write-Bad "Python packages did not install correctly."; exit 1 }
Write-Host "  Running detection engine self-tests..."
Push-Location (Join-Path $script:Root 'ai-engine')
& $venvPy -m unittest discover -s tests
$testExit = $LASTEXITCODE
Pop-Location
if ($testExit -ne 0) { Write-Bad "The detection engine self-tests failed."; exit 1 }
Write-Ok "Python engine ready"

# ------------------------------------------------------------------ 4. frontend
Write-Step "Step 4 of 5: React frontend"
Push-Location (Join-Path $script:Root 'frontend')
Write-Host "  Installing frontend packages (first time can take a few minutes)..."
& npm.cmd install --no-audit --no-fund
$npmExit = $LASTEXITCODE
Pop-Location
if ($npmExit -ne 0) { Write-Bad "npm install failed. Check your internet connection and try again."; exit 1 }
Write-Ok "Frontend ready"

# ------------------------------------------------------------------ 5. java
Write-Step "Step 5 of 5: Java backend (downloads libraries the first time)"
Push-Location (Join-Path $script:Root 'backend-java')
& $mvn -B -DskipTests package
$mvnExit = $LASTEXITCODE
Pop-Location
$jar = Join-Path $script:Root 'backend-java\target\phishshield-backend.jar'
if ($mvnExit -ne 0 -or -not (Test-Path $jar)) {
    Write-Bad "The Java backend could not be built. Read the Maven messages above."
    exit 1
}
Write-Ok "Backend built"

New-Item -ItemType Directory -Force -Path (Join-Path $script:Root 'logs'), (Join-Path $script:Root 'data'), (Join-Path $script:Root '.run') | Out-Null
Set-Content -Path (Join-Path $script:Root '.setup-complete') -Value (Get-Date -Format s)
Write-Host ""
Write-Host "SETUP SUCCESSFUL" -ForegroundColor Green
Write-Host "Next step: double-click start.bat"
exit 0
