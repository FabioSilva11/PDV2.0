$path = 'src/data/seedData.ts'
$content = Get-Content $path -Raw
$content = $content -replace '@"export const INITIAL_CASH_REGISTER: CashRegister = \{[\s\S]*?\n\};@"s', 'export const INITIAL_CASH_REGISTER: CashRegister = {
  id: '\''csh-today-01'\'',
  aberto: true,
  turnosHistorico: [],
  saldoInicial: 200.00,
  saldoAtualGaveta: 350.00, // Saldo inicial (200) + Entrada manual (100) + Venda Dinheiro (50)
  transacoes: [
    { id: '\''tx-1'\'', tipo: '\''abertura'\'', valor: 200.00, motivo: '\''Fundo de troco inicial do turno'\'', horario: '\''2026-09-10T09:30:00'\'', operador: '\''Ana Paula Ferreira'\'', turnoId: '\''turno-1'\'' },
    { id: '\''tx-2'\'', tipo: '\''entrada_manual'\'', valor: 100.00, motivo: '\''Reforço de moedas e notas miúdas'\'', horario: '\''2026-09-10T10:05:00'\'', operador: '\''Ana Paula Ferreira'\'', turnoId: '\''turno-1'\'' },
    { id: '\''tx-3'\'', tipo: '\''venda_manual'\'', valor: 50.00, motivo: '\''Recebimento em dinheiro Pedido #1000'\'', formaPagamento: '\''dinheiro'\'', horario: '\''2026-09-10T11:40:10'\'', pedidoId: '\''ord-1000'\'', operador: '\''Ana Paula Ferreira'\'', turnoId: '\''turno-1'\'' }
  ]
};'
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host 'Done'