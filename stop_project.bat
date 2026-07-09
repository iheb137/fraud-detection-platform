@echo off
title Tunisie Telecom - Arret des services
color 0C
cls

echo.
echo  ============================================================
echo   ARRET DE TOUS LES SERVICES
echo  ============================================================
echo.

echo [1/3] Arret Frontend Angular (port 4200)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
echo       OK

echo [2/3] Arret Backend Spring Boot (port 8081)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
echo       OK

echo [3/3] Arret ML Service FastAPI (port 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
echo       OK

echo.
echo   Tous les services sont arretes.
echo.
pause
