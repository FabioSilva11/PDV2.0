$path1 = 'src/context/RestaurantContext.tsx'
$content1 = Get-Content $path1 -Raw -Encoding UTF8

# Fix 1: Add turnosHistorico to EMPTY_CASH_REGISTER
$content1 = $content1 -replace "const EMPTY_CASH_REGISTER: CashRegister = \{`r?\n\s*id: 'csh-current',\s*\r?\n\s*aberto: false,\s*\r?\n\s*saldoInicial: 0,\s*\r?\n\s*saldoAtualGaveta: 0,\s*\r?\n\s*transacoes: \[\]", "const EMPTY_CASH_REGISTER: CashRegister = {\n  id: 'csh-current',\n  aberto: false,\n  turnosHistorico: [],\n  saldoInicial: 0,\n  saldoAtualGaveta: 0,\n  transacoes: []"
Set-Content -Path 'src/context/RestaurantContext.tsx' -Value $content1 -Encoding UTF8

# Fix 2: Update addCashMovement to use only 'entrada_manual' | 'saida_manual'
$content2 = Get-Content 'src/context/RestaurantContext.tsx' -Raw -Encoding UTF8
$content2 = $content2 -replace "const addCashMovement = useCallback\(\(tipo: 'suprimento' \| 'sangria' \| 'entrada_manual' \| 'saida_manual', valor: number, motivo: string\) => \{", "const addCashMovement = useCallback((tipo: 'entrada_manual' | 'saida_manual', valor: number, motivo: string) => {"
$content2 = $content2 -replace "const entrada = tipo === 'suprimento' \|\| tipo === 'entrada_manual';", "const entrada = tipo === 'entrada_manual';"
Set-Content -Path 'src/context/RestaurantContext.tsx' -Value $content2 -Encoding UTF8

# Fix 3: Update seed data - replace suprimento with entrada_manual and add turnoId
$path3 = 'src/data/seedData.ts'
$content3 = Get-Content $path3 -Raw -Encoding UTF8
$content3 = $content3 -replace "tipo: 'suprimento'", "tipo: 'entrada_manual'"
$content3 = $content3 -replace "operador: 'Ana Paula Ferreira'", "operador: 'Ana Paula Ferreira', turnoId: 'turno-1'"
$content3 = $content3 -replace "operadorAbertura: 'Ana Paula Ferreira',\s*`r?\n\s*abertoEm: '2026-09-10T09:30:00',\s*\n\s*saldoInicial:", "aberto: true,\n  turnosHistorico: [],\n  saldoInicial:"
Set-Content -Path 'src/data/seedData.ts' -Value $content3 -Encoding UTF8

Write-Host 'All fixes applied'