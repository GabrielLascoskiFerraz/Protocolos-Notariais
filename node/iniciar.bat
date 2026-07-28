@echo off
cd /d "%~dp0"
if exist "Protocolos-Notariais.exe" (
  "Protocolos-Notariais.exe"
) else (
  node src\server.js
)
pause
