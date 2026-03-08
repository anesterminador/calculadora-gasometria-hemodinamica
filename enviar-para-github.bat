@echo off
cd /d "%~dp0"

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
