@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Execute este arquivo como Administrador.
  pause
  exit /b 1
)
schtasks /End /TN "Protocolos Notariais" >nul 2>&1
schtasks /Delete /TN "Protocolos Notariais" /F
echo Inicializacao automatica removida.
pause
