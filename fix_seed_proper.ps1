$path = 'src/data/seedData.ts'
$content = Get-Content $path -Raw

# Replace suprimento with entrada_manual and add turnoId to transactions
$content = $content -replace 'tipo: '\''suprimento'\'', 'tipo: '\''entrada_manual'\''
$content = $content -replace 'operador: '\''Ana Paula Ferreira'\'', 'operador: '\''Ana Paula Ferreira'\'', turnoId: '\''turno-1'\''' 
$content = $content -replace "operadorAbertura: 'Ana Paula Ferreira',\s*\nabertoEm: '2026-09-10T09:30:00',\s*\nsaldoInicial:", "aberto: true,\n  turnosHistorico: [],\n  saldoInicial:"

Set-Content -Path 'src/data/seedData.ts' -Value $content -Encoding UTF8
Write-Host 'Done'