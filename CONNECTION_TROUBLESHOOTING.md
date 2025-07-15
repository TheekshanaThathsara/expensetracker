# Expense Tracker Connection Troubleshooting Guide

If you're experiencing connection issues between the frontend and backend of your Expense Tracker application, follow this step-by-step guide to diagnose and fix the problems.

## Error: "Failed to load expenses" or "ERR_CONNECTION_REFUSED" 

These errors occur when your frontend application cannot connect to the backend API server. Here's how to fix it:

## Step 1: Make Sure Your Backend Server Is Running

1. Open a command prompt and navigate to your project directory
2. Run the provided script to start your backend:
   ```
   run_backend.bat
   ```
3. Make sure there are no error messages in the console
4. The server should display a message indicating it's running on port 8080

## Step 2: Test MongoDB Connection

1. Run the MongoDB connection test script:
   ```
   test_mongodb.bat
   ```
2. If the script shows errors, make sure MongoDB is installed and running:
   - On Windows: Check Services app to see if MongoDB service is running
   - On macOS/Linux: Run `sudo systemctl status mongod`

## Step 3: Test API Endpoint Directly

1. Run the API test script:
   ```
   test_api.bat
   ```
2. If the test fails, your backend server might not be running correctly
3. Also open the API test page in your browser:
   ```
   api_test.html
   ```
4. Click "Test Connection" to see if your API is accessible

## Step 4: Check IP Configuration

When connecting from a device to your computer, you need to use the correct IP address:

1. Run the frontend helper script to automatically detect your IP:
   ```
   run_frontend.bat
   ```
2. This script will:
   - Find your computer's IP address
   - Create a .env file with the correct API URL
   - Start the frontend application

## Step 5: Check for Network/Firewall Issues

If you still have connection issues:

1. Temporarily disable your firewall to test if it's blocking connections
2. Make sure port 8080 is not being used by another application:
   ```
   netstat -ano | findstr :8080
   ```
3. If port 8080 is in use, you can change the port in `application.properties`

## Step 6: Common Platform-Specific Solutions

### For Android Emulator:
- Use `10.0.2.2` instead of `localhost` to access your computer (already configured)
- Make sure the emulator has network connectivity

### For iOS Simulator:
- `localhost` should work correctly (already configured)

### For Web Browser:
- Check for CORS issues in browser developer console
- Make sure backend has CORS configured (already set up)

### For Physical Devices:
- Connect to the same WiFi network as your development computer
- Use your computer's actual IP address (automatically set by `run_frontend.bat`)

## Need More Help?

If you continue to experience issues:
1. Look at the backend logs for error messages
2. Check the network tab in your browser's developer tools
3. Try accessing your API from another tool like Postman

Remember to restart both frontend and backend after making any configuration changes.
