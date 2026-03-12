@echo off
@echo off

rem Se foi iniciado sem argumentos (ex.: duplo clique), reabra em uma janela que nao fecha automaticamente.
if "%1"=="" (
    start "" cmd /k "%~f0" _keep
    goto :eof
)

rem A partir daqui, estamos na janela principal (_keep)
cd /d "%~dp0"

rem Atualiza automaticamente a versao do cache do PWA (sw.js)
if exist "sw.js" (
  powershell -Command "$p = Get-Content 'sw.js'; if ($p -match 'hemodinamica-v(\d+)') { $n = [int]$Matches[1] + 1; $p -replace 'hemodinamica-v\d+', 'hemodinamica-v' + $n | Set-Content 'sw.js' }"
)

echo.
echo Enviar Site para GitHub
echo ========================
echo.

set "msg=Atualizacao do site"
set /p msg="Mensagem do commit (Enter = Atualizacao do site): "
if "%msg%"=="" set "msg=Atualizacao do site"

echo.
echo Adicionando alteracoes...
git add .

echo Fazendo commit...
git commit -m "%msg%"

if errorlevel 1 (
    echo.
    echo Nenhuma alteracao para enviar, ou ocorreu um erro.
) else (
    echo Enviando para o GitHub...
    git push
)

echo.
pause
