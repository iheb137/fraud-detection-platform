@echo off
title Tunisie Telecom - Fraud Detection Platform
color 0A
cls
echo.
echo  ============================================================
echo   TUNISIE TELECOM - FRAUD DETECTION PLATFORM
echo  ============================================================
echo.
echo   [1] Demarrer tous les services
echo   [2] Arreter tous les services
echo   [3] Redemarrer tous les services
echo   [4] Quitter
echo.
set /p choice=  Votre choix : 
if "%choice%"=="1" goto START_SERVICES
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" exit

:STOP
cls
echo  Arret de tous les services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
echo  Frontend Angular : ARRETE
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
echo  Backend Spring Boot : ARRETE
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
echo  ML Service FastAPI : ARRETE
echo.
if "%choice%"=="2" pause & exit
goto START_SERVICES

:RESTART
goto STOP

:START_SERVICES
cls
echo.
echo  Demarrage de tous les services...
echo.
echo  [1/4] PostgreSQL...
sc query postgresql-x64-18 | find "RUNNING" >nul 2>&1
if %errorlevel% == 0 (echo        DEJA EN COURS) else (net start postgresql-x64-18 >nul 2>&1 && echo        DEMARRE)
echo.
echo  [2/4] ML Service FastAPI (port 8000)...
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if %errorlevel% == 0 (echo        DEJA EN COURS) else (start "ML Service" /min cmd /c "cd /d C:\Users\saafi\fraud-detection-platform\ml-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" && timeout /t 5 /nobreak >nul && echo        DEMARRE)
echo.
echo  [3/4] Backend Spring Boot (port 8081)...
netstat -ano | findstr :8081 | findstr LISTENING >nul 2>&1
if %errorlevel% == 0 (echo        DEJA EN COURS) else (start "Backend" /min "C:\Users\saafi\fraud-detection-platform\run_backend.bat" && timeout /t 25 /nobreak >nul && echo        DEMARRE)
echo.
echo  [4/4] Frontend Angular (port 4200)...
netstat -ano | findstr :4200 | findstr LISTENING >nul 2>&1
if %errorlevel% == 0 (echo        DEJA EN COURS) else (start "Frontend" /min cmd /c "cd /d C:\Users\saafi\fraud-detection-platform\frontend && ng serve --port 4200" && timeout /t 15 /nobreak >nul && echo        DEMARRE)
cls
echo.
echo  ============================================================
echo   TUNISIE TELECOM - FRAUD DETECTION PLATFORM - RUNNING
echo  ============================================================
echo.
echo   PostgreSQL    localhost:5432
echo   ML Service    http://localhost:8000
echo   Backend API   http://localhost:8081
echo   Frontend      http://localhost:4200
echo   Swagger       http://localhost:8081/swagger-ui/index.html
echo.
echo   ADMIN      : admin@tunisietelecom.tn      / Admin@2025
echo   SUPERADMIN : superadmin@tunisietelecom.tn / Admin@2025
echo   ANALYSTE   : analyste@tunisietelecom.tn   / Admin@2025
echo.
echo  ============================================================
pause >nul
start "" "http://localhost:4200"
pause
