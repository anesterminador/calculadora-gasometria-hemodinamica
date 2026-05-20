@echo off
setlocal enabledelayedexpansion

rem ============================================================
rem Se foi iniciado sem argumentos (duplo clique no Explorer),
rem reabre em uma janela CMD que NAO fecha sozinha.
rem ============================================================
if "%1"=="" (
    start "Enviar para GitHub" cmd /k "%~f0" _keep
    goto :eof
)

cd /d "%~dp0"
chcp 65001 >nul 2>&1

rem ============================================================
rem 1) Atualiza a versao do cache do PWA (sw.js)
rem ============================================================
if exist "sw.js" (
  powershell -ExecutionPolicy Bypass -File "%~dp0bump-sw-version.ps1"
)

echo.
echo ===============================
echo   Enviar Site para GitHub
echo ===============================
echo.

set "msg=Atualizacao do site"
set /p msg="Mensagem do commit (Enter = Atualizacao do site): "
if "%msg%"=="" set "msg=Atualizacao do site"

echo.
echo [1/3] Adicionando alteracoes...
git add .

echo.
echo [2/3] Fazendo commit...
git commit -m "%msg%"
if errorlevel 1 (
    echo.
    echo Nenhuma alteracao para enviar, ou erro no commit.
    goto :fim
)

rem ============================================================
rem 3) Push redirecionando stdin de NUL.
rem    O OneDrive Service / Windows Search Indexer seguram
rem    handles em .git/objects/XX/ apos cada push, e o git
rem    pergunta "Should I try again? (y/n)" varias vezes. Com
rem    stdin = NUL o git recebe EOF e assume "n", terminando
rem    automaticamente sem travar a janela. As pastas vazias
rem    que sobram em .git/objects nao prejudicam o repositorio.
rem ============================================================
echo.
echo [3/3] Enviando para o GitHub...
git push <NUL
if errorlevel 1 (
    echo.
    echo Erro ao enviar para o GitHub.
    echo Possiveis causas: sem conexao, credenciais expiradas
    echo ou conflito remoto - nesse caso, rode 'git pull' antes.
)

:fim
echo.
echo === Concluido ===
echo.
pause
