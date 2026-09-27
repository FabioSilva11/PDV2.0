$path = 'src/context/RestaurantContext.tsx'
$content = Get-Content $path -Raw
$content = $content -replace "const EMPTY_CASH_REGISTER: CashRegister = \{\s*id: 'csh-current',\s*\n\s*aberto: false,\s*\n\s*saldoInicial: 0,\s*\n\s*saldoAtualGaveta: 0,\s*\n\s*transacoes: \[\]", "const EMPTY_CASH_REGISTER: CashRegister = {\n  id: 'csh-current',\n  aberto: false,\n  turnosHistorico: [],\n  saldoInicial: 0,\n  saldoAtualGaveta: 0,\n  transacoes: []"
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host 'Done'