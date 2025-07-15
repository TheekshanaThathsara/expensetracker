@echo off
echo =================================================
echo Expense Tracker - Frontend Helper Script
echo =================================================
echo.

REM Get the computer's IP address
echo Getting your computer's IP address...
for /f "tokens=4" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set IP_ADDR=%%a
  goto :found_ip
)

:found_ip
echo Your IP address is: %IP_ADDR%

echo.
echo =================================================
echo Creating environment configuration...
echo.

REM Create .env file with IP configuration
echo REACT_APP_API_URL=http://%IP_ADDR%:8080/api > frontend\.env

echo Created .env file with API URL: http://%IP_ADDR%:8080/api
echo.
echo =================================================
echo Starting React Native Application
echo =================================================
echo.
echo Please make sure your backend server is running before starting the frontend.
echo.

cd frontend
echo Installing dependencies...
npm install

echo.
echo Starting Expo development server...
npx expo start

pause
