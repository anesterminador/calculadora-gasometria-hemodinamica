# ============================================================
# backup.ps1
# Cria um zip com todo o conteudo desta pasta, EXCETO arquivos
# .zip (para nao empilhar backups dentro de backups).
#
# Saida: backup-AAAA-MM-DD_HH-MM-SS.zip na propria pasta.
#
# Pode ser executado:
#   - via fazer-backup.bat (duplo clique)
#   - ou diretamente: powershell -File backup.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$zipName = "backup-$timestamp.zip"
$zipPath = Join-Path $scriptDir $zipName

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

Write-Host "Listando arquivos para backup..." -ForegroundColor Cyan

# Pega tudo recursivo (inclui hidden + system para nao perder .git)
# Exclui:
#   - arquivos .zip (filtro pedido)
#   - o proprio arquivo de saida (defensivo, caso a colecao seja avaliada
#     depois da criacao do zip)
$files = Get-ChildItem -Path $scriptDir -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Extension -ne '.zip' -and
        $_.FullName -ne $zipPath
    }

$total = $files.Count
if ($total -eq 0) {
    Write-Host "Nenhum arquivo para zipar." -ForegroundColor Yellow
    return
}

$sizeBytes = ($files | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($sizeBytes / 1MB, 2)

Write-Host "  Arquivos:        $total"
Write-Host "  Tamanho bruto:   $sizeMB MB"
Write-Host ""
Write-Host "Compactando em $zipName ..." -ForegroundColor Cyan

# Usa ZipFile.Open + CreateEntry para preservar a estrutura de pastas
# relativa ao diretorio do script (Compress-Archive perde estrutura em
# alguns cenarios de pipeline)
$basePrefix = $scriptDir.TrimEnd('\') + '\'
$zip = [System.IO.Compression.ZipFile]::Open(
    $zipPath,
    [System.IO.Compression.ZipArchiveMode]::Create
)

$processed = 0
$lastPct = -1
try {
    foreach ($f in $files) {
        # Caminho relativo, usando '/' (convencao zip)
        $relative = $f.FullName.Substring($basePrefix.Length).Replace('\', '/')

        $entry = $zip.CreateEntry(
            $relative,
            [System.IO.Compression.CompressionLevel]::Optimal
        )
        $entryStream = $entry.Open()
        try {
            $fileStream = [System.IO.File]::OpenRead($f.FullName)
            try {
                $fileStream.CopyTo($entryStream)
            } finally {
                $fileStream.Dispose()
            }
        } finally {
            $entryStream.Dispose()
        }

        $processed++
        $pct = [math]::Floor(($processed / $total) * 100)
        if ($pct -ne $lastPct -and ($pct % 10 -eq 0)) {
            Write-Host "  $pct% ($processed/$total)"
            $lastPct = $pct
        }
    }
} finally {
    $zip.Dispose()
}

$zipInfo = Get-Item $zipPath
$zipMB = [math]::Round($zipInfo.Length / 1MB, 2)
$ratio = if ($sizeBytes -gt 0) {
    [math]::Round((1 - ($zipInfo.Length / $sizeBytes)) * 100, 1)
} else { 0 }

Write-Host ""
Write-Host "=== Backup concluido ===" -ForegroundColor Green
Write-Host "  Arquivo:    $zipName"
Write-Host "  Local:      $zipPath"
Write-Host "  Tamanho:    $zipMB MB"
Write-Host "  Compressao: $ratio%"
