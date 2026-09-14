import type { CartItem, Order } from '../types';

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function amount(n: number, label = 'Valor', allowZero = true) {
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 10_000_000) throw new Error(`${label} inválido.`);
  return money(n);
}
export function quantity(n: number, allowZero = false) {
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 100_000) throw new Error('Quantidade inválida.');
  return n;
}
export const normalizeSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function subtotal(items: CartItem[]) {
  let cents = 0;
  for (const item of items) {
    quantity(item.quantidade);
    let price = amount(item.precoUnitario, 'Preço');
    for (const addon of item.adicionais || []) price = money(price + amount(addon.preco, 'Adicional'));
    cents += Math.round(price * 100 * item.quantidade);
  }
  return amount(cents / 100, 'Total');
}
export function totals(items: CartItem[], discount = 0, service = 0, delivery = 0) {
  const sub = subtotal(items);
  discount = amount(discount, 'Desconto');
  if (discount > sub) throw new Error('Desconto maior que o subtotal.');
  return { subtotal: sub, desconto: discount, taxaServico: amount(service), taxaEntrega: amount(delivery), total: amount(sub - discount + service + delivery) };
}
export function reconcile(order: Order): Order {
  const paid = money(order.pagamentos.filter(p => !p.estornado).reduce((sum, p) => sum + p.valor, 0));
  const balance = money(Math.max(0, order.total - paid));
  return { ...order, valorTotalPago: paid, saldoRestante: balance,
    statusPagamento: balance === 0 ? 'pago' : paid > 0 ? 'pago_parcial' : 'pendente' };
}
