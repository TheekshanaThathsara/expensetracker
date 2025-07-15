# ExpenseTracker Network Troubleshooting Guide

This guide will help you resolve connection issues between the frontend and backend of your Expense Tracker application.

## Common Connection Issues

If you're experiencing errors like:
- `ERR_CONNECTION_TIMED_OUT`
- Network request failed
- Cannot connect to backend

Follow these steps to troubleshoot:

## 1. Make Sure the Backend Server is Running

```bash
# Navigate to the backend directory
cd backend/expensetracker

# Run the Spring Boot application
./mvnw spring-boot:run
```

Check that it starts without errors and shows that it's listening on port 8080.

## 2. Check MongoDB Connection

Ensure MongoDB is running:

```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl status mongod
```

## 3. IP Address Configuration

### For Android Emulator:
- Use `10.0.2.2` instead of `localhost` to access your computer's localhost
- This is already configured in the app

### For Physical Android Device:
1. Connect your device to the same WiFi network as your computer
2. Find your computer's IP address:
   - On Windows: Run `ipconfig` in Command Prompt
   - On macOS/Linux: Run `ifconfig` or `ip addr` in Terminal
3. Update the IP address in `services/api.ts` if needed

### For iOS Simulator:
- `localhost` should work correctly
- This is already configured in the app

### For Web Testing:
- Make sure to run both frontend and backend on the same machine
- Check browser console for CORS errors

## 4. Check Firewall Settings

Make sure your firewall is not blocking connections on port 8080.

## 5. Testing API Directly

Test if the API is accessible:

```bash
# Using curl
curl http://localhost:8080/api/expenses

# Or open in browser
http://localhost:8080/api/expenses
```

## 6. Restart Development Server

Sometimes clearing the cache and restarting helps:

```bash
# For React Native frontend
cd frontend
npm start --reset-cache
```

## 7. Check Network Logs

If you still have issues, look at the network logs in:
- Android: Chrome DevTools
- iOS: Safari Developer Tools
- Web: Browser DevTools Network tab

## Contact Support

If you continue experiencing issues after trying these steps, please contact our support team with:
- Screenshots of error messages
- Your environment details (OS, emulator/device version)
- Steps to reproduce the issue
