@echo off
echo =================================================
echo Expense Tracker Backend Startup Helper
echo =================================================
echo.

REM Check if MongoDB is running
echo Checking if MongoDB service is running...
sc query MongoDB >nul
if %ERRORLEVEL% EQU 0 (
  echo MongoDB service is running.
) else (
  echo MongoDB service is not running or not installed.
  echo Attempting to start MongoDB service...
  net start MongoDB
  if %ERRORLEVEL% EQU 0 (
    echo MongoDB service started successfully.
  ) else (
    echo Failed to start MongoDB service.
    echo Please make sure MongoDB is installed and configured properly.
    echo You can download MongoDB from: https://www.mongodb.com/try/download/community
    pause
    exit /b 1
  )
)

echo.
echo =================================================
echo Starting Spring Boot Application
echo =================================================

cd backend\expensetracker
call mvnw spring-boot:run

pause
