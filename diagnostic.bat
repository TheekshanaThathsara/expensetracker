@echo off
echo =================================================
echo Expense Tracker - Connection Diagnostic Tool
echo =================================================
echo.

echo This script will check your system setup and help diagnose
echo connection issues between the frontend and backend.
echo.

REM Check if Java is installed
echo Checking Java installation...
java -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Java is not installed or not in PATH.
  echo Please install Java from: https://adoptopenjdk.net/
  echo.
) else (
  echo [OK] Java is installed.
  echo.
)

REM Check if Node.js is installed
echo Checking Node.js installation...
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js from: https://nodejs.org/
  echo.
) else (
  echo [OK] Node.js is installed.
  echo.
)

REM Check if MongoDB is installed
echo Checking MongoDB installation...
mongosh --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] MongoDB is not installed or not in PATH.
  echo Please install MongoDB from: https://www.mongodb.com/try/download/community
  echo.
) else (
  echo [OK] MongoDB is installed.
  echo.
)

REM Check if MongoDB service is running
echo Checking MongoDB service status...
sc query MongoDB >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [WARNING] MongoDB service is not running or not installed as a service.
  echo Try starting MongoDB manually or install it as a service.
  echo.
) else (
  echo [OK] MongoDB service is registered.
  echo.
)

REM Check port 8080 availability
echo Checking if port 8080 is available...
netstat -ano | findstr :8080 >nul
if %ERRORLEVEL% EQU 0 (
  echo [WARNING] Port 8080 is already in use by another application.
  echo Consider changing the port in your application.properties file.
  echo.
) else (
  echo [OK] Port 8080 is available.
  echo.
)

REM Check if backend application files exist
echo Checking backend application files...
if not exist "backend\expensetracker\src\main\java\com\example\expensetracker\ExpensetrackerApplication.java" (
  echo [ERROR] Backend application files not found.
  echo Make sure your project structure is correct.
  echo.
) else (
  echo [OK] Backend application files found.
  echo.
)

REM Check if frontend application files exist
echo Checking frontend application files...
if not exist "frontend\app.json" (
  echo [ERROR] Frontend application files not found.
  echo Make sure your project structure is correct.
  echo.
) else (
  echo [OK] Frontend application files found.
  echo.
)

REM Get the computer's IP address for reference
echo Getting your computer's IP address...
for /f "tokens=4" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set IP_ADDR=%%a
  goto :found_ip
)

:found_ip
echo Your IP address is: %IP_ADDR%
echo This is the address devices on the same network should use to connect to your API.
echo.

echo =================================================
echo Connection Diagnostic Summary
echo =================================================
echo.
echo If any of the checks above show [ERROR] or [WARNING],
echo please resolve those issues before trying to connect.
echo.
echo Here are the next steps to fix connection issues:
echo.
echo 1. Run the backend server using: run_backend.bat
echo 2. In another command prompt, run: run_frontend.bat
echo 3. For detailed troubleshooting steps, see:
echo    CONNECTION_TROUBLESHOOTING.md
echo.
echo =================================================

pause
