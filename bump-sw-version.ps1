$path = Join-Path $PSScriptRoot 'sw.js'
if (-not (Test-Path $path)) { return }

$content = Get-Content $path -Raw
if ($content -match 'hemodinamica-v(\d+)') {
    $n = [int]$Matches[1] + 1
    $new = $content -replace 'hemodinamica-v\d+', "hemodinamica-v$n"
    Set-Content -Path $path -Value $new
}

