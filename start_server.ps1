Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Starting HouseTour 3D Studio & Player Engine" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $ScriptDir "builder_service")

$VenvPython = Join-Path (Get-Location) "venv\Scripts\python.exe"

if (Test-Path $VenvPython) {
    Write-Host "[OK] Using virtual environment at builder_service\venv" -ForegroundColor Green
    & $VenvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} else {
    Write-Host "[WARN] venv not found, falling back to global python..." -ForegroundColor Yellow
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}
