@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Backend və Expo-nu iki ayrı pəncərədə açır
start "Simo - Backend API" cmd /k ""%~dp02-BACKEND.bat""
timeout /t 8 /nobreak >nul
start "Simo - Expo Go" cmd /k ""%~dp03-EXPO-GO.bat""
