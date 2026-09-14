import type { Order, CashRegister } from '../types';
import { money } from './business';

export function paymentSummary(orders: Order[]) {
  const byMethod: Record<string, number> = {};
  let count = 0;
  for (const order of orders) {
    if (order.status === 'cancelado') continue;
    const payments = order.pagamentos.filter(p => !p.estornado);
    if (payments.length) count++;
    for (const payment of payments) byMethod[payment.formaId] = money((byMethod[payment.formaId] || 0) + payment.valor);
  }
  return { byMethod, count, total: money(Object.values(byMethod).reduce((sum, n) => sum + n, 0)) };
}
export function cashPayments(cash: CashRegister, methods: string[]) {
  return money(cash.transacoes.reduce((sum, tx) => {
    if (!tx.formaPagamento || !methods.includes(tx.formaPagamento)) return sum;
    if (tx.tipo === 'venda_manual') return sum + tx.valor;
    if (tx.tipo === 'saida_manual' && tx.pedidoId) return sum - tx.valor;
    return sum;
  }, 0));
}
