@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-studio.ps1" %*
if errorlevel 1 pause
