import { describe, expect, it } from 'vitest';
import { mergeSnapshots, SyncConflict } from '../lib/mergeSnapshots';
import { paymentSummary, cashPayments } from '../utils/reports';
import type { CashRegister, Order } from '../types';

const order = (payments: any[], status = 'finalizado'): Order => ({ id: 'o', numero: 1, tipo: 'balcao', canal: 'Balcão', criadoEm: '2026-01-01', itens: [], subtotal: 20, desconto: 0, taxaServico: 0, taxaEntrega: 0, total: 20, status: status as Order['status'], statusPagamento: 'pago', pagamentos: payments, valorTotalPago: 20, saldoRestante: 0 });
const cash = (transactions: CashRegister['transacoes']): CashRegister => ({ id: 'c', aberto: true, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: transactions });

describe('relatórios e sincronização', () => {
  it('REL só soma recebimentos não estornados e ignora pedidos cancelados', () => {
    const report = paymentSummary([order([{ formaId: 'pix', valor: 20 }]), order([{ formaId: 'dinheiro', valor: 15, estornado: true }]), order([{ formaId: 'credito', valor: 50 }], 'cancelado')]);
    expect(report.total).toBe(20); expect(report.byMethod).toEqual({ pix: 20 });
  });
  it('CAI conciliação desconta estorno de dinheiro', () => expect(cashPayments(cash([{ id: 'a', tipo: 'venda_manual', valor: 20, motivo: '', formaPagamento: 'dinheiro', horario: '', pedidoId: 'o', operador: '' }, { id: 'b', tipo: 'saida_manual', valor: 20, motivo: '', formaPagamento: 'dinheiro', horario: '', pedidoId: 'o', operador: '' }]), ['dinheiro'])).toBe(0));
  it('SYNC junta pedidos independentes de dois terminais', () => {
    const merged = mergeSnapshots({ orders: [] }, { orders: [{ id: 'local' }] }, { orders: [{ id: 'remote' }] });
    expect(merged.orders.map((item: any) => item.id).sort()).toEqual(['local', 'remote']);
  });
  it('SYNC recusa alteração concorrente do mesmo valor', () => expect(() => mergeSnapshots({ cashRegister: { saldoAtualGaveta: 200 } }, { cashRegister: { saldoAtualGaveta: 220 } }, { cashRegister: { saldoAtualGaveta: 230 } })).toThrow(SyncConflict));
});
