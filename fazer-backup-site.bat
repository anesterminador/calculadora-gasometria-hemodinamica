@echo off
setlocal

rem ============================================================
rem Se foi iniciado sem argumentos (duplo clique no Explorer),
rem reabre em uma janela CMD que NAO fecha sozinha.
rem ============================================================
if "%1"=="" (
    start "Backup do Site" cmd /k "%~f0" _keep
    goto :eof
)

cd /d "%~dp0"
chcp 65001 >nul 2>&1

echo.
echo ===============================
echo   Backup do site
echo ===============================
echo.
echo Vai zipar TUDO desta pasta, exceto arquivos .zip
echo O backup eh salvo aqui mesmo, com data e hora no nome.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1"

if errorlevel 1 (
    echo.
    echo Erro ao criar o backup.
)

echo.
pause
