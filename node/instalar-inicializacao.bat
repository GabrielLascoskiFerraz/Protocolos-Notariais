@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Execute este arquivo como Administrador.
  pause
  exit /b 1
)
set "APP=%~dp0Protocolos-Notariais.exe"
if not exist "%APP%" (
  echo Executavel nao encontrado em %APP%
  pause
  exit /b 1
)
schtasks /Create /TN "Protocolos Notariais" /SC ONSTART /RU SYSTEM /RL HIGHEST /TR "\"%APP%\"" /F
schtasks /Run /TN "Protocolos Notariais"
echo Inicializacao automatica instalada.
pause
