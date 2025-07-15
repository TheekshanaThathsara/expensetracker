@echo off
echo =================================================
echo API Endpoint Test Tool
echo =================================================
echo.

set API_URL=http://localhost:8080/api/expenses

echo Testing API endpoint: %API_URL%
echo.

REM Try using curl to test the API
echo Testing with curl...
curl -v %API_URL%

echo.
echo =================================================
echo If you see "Failed to connect" above, your server might not be running.
echo If you see "200 OK" and JSON data, your API is working properly.
echo.
echo Next steps if connection failed:
echo 1. Make sure your Spring Boot app is running
echo 2. Check MongoDB is running
echo 3. Verify port 8080 is not blocked by firewall
echo 4. Check for any error messages in your Spring Boot console
echo =================================================
echo.
pause
