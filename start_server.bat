@echo off
title HouseTour 3D Studio Service
echo ====================================================
echo   Starting HouseTour 3D Studio & Player Engine
echo ====================================================
echo.
cd /d "%~dp0builder_service"

if exist venv\Scripts\python.exe (
    echo [OK] Using virtual environment at builder_service\venv
    venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) else (
    echo [WARN] venv not found in builder_service, trying system python...
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
)

pause
