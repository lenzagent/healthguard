@echo off
REM HealthGuard APK Build Script — run in Windows PowerShell or CMD
REM Prerequisites: Android Studio installed, Node.js installed

cd /d D:\VSCODE\health\healthguard-app

echo [1/5] Installing Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera

echo [2/5] Building Next.js for static export...
set CAPACITOR_BUILD=1
call npm run build

echo [3/5] Initializing Capacitor Android project...
call npx cap init HealthGuard com.healthguard.ai --web-dir=out
call npx cap add android

echo [4/5] Syncing web assets to Android...
call npx cap sync

echo [5/5] Building APK...
cd android
call gradlew assembleDebug

echo.
echo APK built at: androidppuild\outputspk\debugpp-debug.apk
echo.
echo Copy to phone and install!
pause
