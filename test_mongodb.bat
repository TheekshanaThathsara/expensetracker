@echo off
echo =================================================
echo MongoDB Connection Test
echo =================================================
echo.

echo Attempting to connect to MongoDB...
echo.

REM Create a temporary JavaScript file for MongoDB connection test
echo var conn = new Mongo("localhost:27017"); > mongo_test.js
echo var db = conn.getDB("expensedb"); >> mongo_test.js
echo print("Connected to MongoDB. Database: " + db); >> mongo_test.js
echo db.getCollectionNames(); >> mongo_test.js

REM Try to execute the script with MongoDB
echo Executing MongoDB connection test...
mongosh --quiet mongo_test.js

REM Clean up
del mongo_test.js

echo.
echo If you see no connection error messages above, MongoDB is running correctly.
echo If you see errors, please make sure MongoDB is installed and running.
echo.
echo =================================================
pause
