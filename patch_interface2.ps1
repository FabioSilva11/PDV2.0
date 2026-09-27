$path = 'src/context/RestaurantContext.tsx'
$content = Get-Content $path -Raw
$content = $content -replace 'freeTableManually: \(tableNumber: number\) => void;\s*\n\s*// Cash Register', "freeTableManually: (tableNumber: number) => void;\n  getPendingFinancialOrders: () => Order[];\n  getPendingFinancialAccounts: () => Account[];\n  getCurrentTurno: () => TurnoOperacional | undefined;\n  getCurrentTurnoId: () => TurnoId | undefined;\n  validarPendenciasFechamento: () => PendenciaFechamento[];\n\n  // Cash Register\n  cashRegister: CashRegister;"
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host 'Done'