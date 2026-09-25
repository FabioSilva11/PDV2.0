import React from 'react';
import { act, renderHook, render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { PaymentModal } from '../components/pdv/PaymentModal';
import { POSView } from '../components/pdv/POSView';
import { INITIAL_CASH_REGISTER, INITIAL_TABLES } from '../data/seedData';
import type { CartItem, MenuItem, Order, PaymentMethodId } from '../types';

const key = 'murupi_restaurant_database_v1';
const product: MenuItem = { id: 'qa-product', nome: 'Hambúrguer QA 🍔', preco: 20,
  categoria: 'Bebidas', disponivel: true };
const item = (overrides: Partial<CartItem> = {}): CartItem => ({ cartItemId: 'qa-line',
  menuItemId: product.id, nome: product.nome, precoUnitario: 20, quantidade: 1,
  observacao: '', estacaoProducao: 'cozinha', ...overrides });
const wrapper = ({ children }: { children: React.ReactNode }) => <RestaurantProvider>{children}</RestaurantProvider>;
const boot = () => renderHook(() => useRestaurant(), { wrapper });
type API = ReturnType<typeof boot>['result'];
function sale(api: API, overrides: Partial<Order> = {}) {
  let order!: Order;
  act(() => { order = api.current.createOrder({ itens: [item()], ...overrides }); });
  return order;
}
function attempt(fn: () => unknown) { try { fn(); } catch { /* rejeição é permitida; verificar estado em seguida */ } }
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify({ staffResetApplied: true, operationalDemoResetApplied: true,
    menu: [product], orders: [], alerts: [], printQueue: [],
    tables: INITIAL_TABLES.map(t => ({ ...t, status: 'livre', valorAtual: 0, pedidoAtivoId: undefined })),
    cashRegister: { ...INITIAL_CASH_REGISTER, aberto: true, saldoInicial: 200, saldoAtualGaveta: 200, transacoes: [] } }));
});

describe('venda e matematica', () => {
  it.each([0.01, 0.10, 0.99, 1.99, 10.50, 99.99, 999.99])('MAT preço %s', price => {
    const { result } = boot(); expect(sale(result, { itens: [item({ precoUnitario: price })] }).total).toBe(price);
  });
  it('MAT 3 x 3,33 = 9,99', () => { const { result } = boot(); expect(sale(result, { itens: [item({ precoUnitario: 3.33, quantidade: 3 })] }).total).toBe(9.99); });
  it('MAT 0,10 + 0,20 = 0,30 sem saldo residual', () => { const { result } = boot(); expect(sale(result, { itens: [item({ precoUnitario: .1 }), item({ cartItemId: 'b', precoUnitario: .2 })] }).total).toBe(.3); });
  it.each([0.2, 10, 20])('MAT desconto %s', desconto => { const { result } = boot(); expect(sale(result, { desconto }).total).toBe(20 - desconto); });
  it('MAT acrescimo serviço e entrega', () => { const { result } = boot(); expect(sale(result, { taxaServico: 2, taxaEntrega: 7 }).total).toBe(29); });
  it('VEN pedido vazio deve ser rejeitado', () => { const { result } = boot(); act(() => attempt(() => result.current.createOrder({ itens: [] }))); expect(result.current.orders).toHaveLength(0); });
  it.each([-1, 0, NaN, Infinity])('VEN quantidade inválida %s', quantidade => { const { result } = boot(); act(() => attempt(() => result.current.createOrder({ itens: [item({ quantidade })] }))); expect(result.current.orders).toHaveLength(0); });
  it('VEN desconto acima do subtotal deve ser rejeitado', () => { const { result } = boot(); act(() => attempt(() => result.current.createOrder({ itens: [item()], desconto: 21 }))); expect(result.current.orders).toHaveLength(0); });
  it('PRO preço do carrinho preservado após alteração', () => { const { result } = boot(); const cart = item(); act(() => result.current.updateItemPrice(product.id, 25)); expect(sale(result, { itens: [cart] }).total).toBe(20); });
  it('PRO excluir produto preserva histórico', () => { const { result } = boot(); sale(result); act(() => result.current.deleteMenuItem(product.id)); expect(result.current.orders[0].itens[0].nome).toBe(product.nome); });
  it.each([-1, NaN, Infinity])('PRO preço inválido %s rejeitado', preco => { const { result } = boot(); act(() => attempt(() => result.current.updateItemPrice(product.id, preco))); expect(result.current.menu[0].preco).toBe(20); });
  it('LAN adicionais pagos e gratuitos', () => { const { result } = boot(); expect(sale(result, { itens: [item({ quantidade: 2, adicionais: [{ grupoId: 'g', addonId: 'a', nome: 'Queijo', preco: 3 }, { grupoId: 'g', addonId: 'b', nome: 'Molho', preco: 0 }] })] }).total).toBe(46); });
  it('LAN remover item preserva valor de adicionais restantes', () => { const { result } = boot(); const o = sale(result, { itens: [item({ adicionais: [{ grupoId: 'g', addonId: 'a', nome: 'Queijo', preco: 3 }] }), item({ cartItemId: 'remove' })] }); act(() => result.current.cancelOrderItem(o.id, 'remove', 'QA')); expect(result.current.orders[0].total).toBe(23); });
  it('SEG observação longa com emojis preservada', () => { const { result } = boot(); const observacao = 'Sem cebola 🍔 <script>QA</script> '.repeat(500); expect(sale(result, { itens: [item({ observacao })] }).itens[0].observacao).toBe(observacao); });
});

describe('pagamento e caixa', () => {
  it.each<PaymentMethodId>(['dinheiro', 'pix', 'debito', 'credito'])('PAG método %s', method => {
    const { result } = boot(); const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, method, 20, 20));
    expect(result.current.orders[0].statusPagamento).toBe('pago');
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(method === 'dinheiro' ? 220 : 200);
  });
  it('PAG dividido e parcial', () => { const { result } = boot(); const o = sale(result); act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 5)); expect(result.current.orders[0].saldoRestante).toBe(15); act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 15, 15)); expect(result.current.orders[0].statusPagamento).toBe('pago'); expect(result.current.cashRegister.saldoAtualGaveta).toBe(215); });
  it('PAG troco 150 para 100 registra receita 100', () => { const { result } = boot(); const o = sale(result, { itens: [item({ precoUnitario: 100 })] }); act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 100, 150)); expect(result.current.orders[0].pagamentos[0].troco).toBe(50); expect(result.current.orders[0].valorTotalPago).toBe(100); expect(result.current.cashRegister.saldoAtualGaveta).toBe(300); });
  it.each([-1, 0, NaN, Infinity, 21])('PAG valor inválido ou superior ao saldo %s', valor => { const { result } = boot(); const o = sale(result); act(() => attempt(() => result.current.addManualPaymentToOrder(o.id, 'pix', valor))); expect(result.current.orders[0].pagamentos).toHaveLength(0); expect(result.current.cashRegister.transacoes).toHaveLength(0); });
  it('PAG dinheiro recebido insuficiente', () => { const { result } = boot(); const o = sale(result); act(() => attempt(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 10))); expect(result.current.orders[0].pagamentos).toHaveLength(0); });
  it('PAG pedido inexistente não movimenta caixa', () => { const { result } = boot(); act(() => attempt(() => result.current.addManualPaymentToOrder('inexistente', 'dinheiro', 20, 20))); expect(result.current.cashRegister.saldoAtualGaveta).toBe(200); });
  it('PAG pedido cancelado não recebe pagamento', () => { const { result } = boot(); const o = sale(result); act(() => result.current.cancelOrder(o.id, 'QA')); act(() => attempt(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20))); expect(result.current.orders[0].pagamentos).toHaveLength(0); });
  it('CHAOS pagamento repetido 10 vezes', () => { const { result } = boot(); const o = sale(result); act(() => { for (let i = 0; i < 10; i++) attempt(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20)); }); expect(result.current.orders[0].pagamentos).toHaveLength(1); expect(result.current.cashRegister.saldoAtualGaveta).toBe(220); });
  it('PAG estorno único devolve caixa', () => { const { result } = boot(); const o = sale(result); act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20)); const p = result.current.orders[0].pagamentos[0]; act(() => result.current.reverseOrderPayment(o.id, p.id, 'QA')); expect(result.current.cashRegister.saldoAtualGaveta).toBe(200); expect(result.current.orders[0].saldoRestante).toBe(20); });
  it('CHAOS estorno repetido não retira dinheiro duas vezes', () => { const { result } = boot(); const o = sale(result); act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20)); const p = result.current.orders[0].pagamentos[0]; act(() => result.current.reverseOrderPayment(o.id, p.id, 'QA')); act(() => result.current.reverseOrderPayment(o.id, p.id, 'QA')); expect(result.current.cashRegister.saldoAtualGaveta).toBe(200); });
  it('CAI caixa fechado rejeita recebimento', () => { const { result } = boot(); const o = sale(result); act(() => result.current.closeCashRegister()); act(() => attempt(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20))); expect(result.current.orders[0].pagamentos).toHaveLength(0); });
  it('CAI suprimento e sangria', () => { const { result } = boot(); act(() => result.current.addCashMovement('suprimento', 50, 'QA')); act(() => result.current.addCashMovement('sangria', 30, 'QA')); expect(result.current.cashRegister.saldoAtualGaveta).toBe(220); });
  it('CAI sangria negativa rejeitada', () => { const { result } = boot(); act(() => attempt(() => result.current.addCashMovement('sangria', -50, 'QA'))); expect(result.current.cashRegister.saldoAtualGaveta).toBe(200); });
  it('CAI reabrir caixa aberto não apaga movimentações', () => { const { result } = boot(); act(() => result.current.addCashMovement('suprimento', 50, 'QA')); act(() => attempt(() => result.current.openCashRegister(200))); expect(result.current.cashRegister.saldoAtualGaveta).toBe(250); });
});

describe('mesas cozinha recuperacao e estresse', () => {
  it('MES reabrir mesa ocupada preserva valor', () => { const { result } = boot(); sale(result, { tipo: 'mesa', mesaNumero: 1 }); act(() => result.current.openTableWithOrder(1, 'Outro funcionário')); expect(result.current.tables.find(t => t.numero === 1)?.valorAtual).toBe(20); });
  it('MES transferência para mesa livre preserva pedido', () => { const { result } = boot(); const o = sale(result, { tipo: 'mesa', mesaNumero: 1 }); act(() => result.current.transferTable(1, 2)); expect(result.current.tables.find(t => t.numero === 2)?.pedidoAtivoId).toBe(o.id); expect(result.current.orders[0].mesaNumero).toBe(2); });
  it('COZ pedido cria fila de impressão', () => { const { result } = boot(); const o = sale(result); expect(result.current.printQueue.some(j => j.pedidoNumero === o.numero)).toBe(true); });
  it('REC remontagem offline preserva venda caixa', () => { const first = boot(); const o = sale(first.result); act(() => first.result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20)); first.unmount(); const { result } = boot(); expect(result.current.orders[0].id).toBe(o.id); expect(result.current.orders[0].statusPagamento).toBe('pago'); expect(result.current.cashRegister.saldoAtualGaveta).toBe(220); });
  it('CHAOS estresse 500 pedidos no mesmo lote têm IDs e números únicos', () => { const { result } = boot(); act(() => { for (let i = 0; i < 500; i++) result.current.createOrder({ itens: [item()] }); }); expect(result.current.orders).toHaveLength(500); expect(new Set(result.current.orders.map(o => o.id)).size).toBe(500); expect(new Set(result.current.orders.map(o => o.numero)).size).toBe(500); });
  it('DIA jornada sintética reconcilia caixa após estorno e sangria', () => { const { result } = boot(); const a = sale(result); act(() => result.current.addManualPaymentToOrder(a.id, 'dinheiro', 20, 50)); const b = sale(result); act(() => result.current.addManualPaymentToOrder(b.id, 'pix', 20)); const c = sale(result); act(() => result.current.addManualPaymentToOrder(c.id, 'dinheiro', 20, 20)); act(() => result.current.reverseOrderPayment(c.id, result.current.orders[0].pagamentos[0].id, 'QA')); act(() => result.current.cancelOrder(c.id, 'QA')); act(() => result.current.addCashMovement('sangria', 10, 'QA')); act(() => result.current.closeCashRegister()); expect(result.current.cashRegister.saldoAtualGaveta).toBe(210); expect(result.current.orders.filter(o => o.statusPagamento === 'pago').reduce((s, o) => s + o.total, 0)).toBe(40); });
  it('LEG pedido antigo sem pagamentos/itens é normalizado e ainda aceita edição', () => {
    localStorage.setItem(key, JSON.stringify({ staffResetApplied: true, operationalDemoResetApplied: true,
      menu: [product], orders: [{ id: 'legacy-1', operacaoId: 'op-1', numero: 1000, tipo: 'balcao', status: 'pendente', criadoEm: new Date().toISOString(), itens: [item()], subtotal: 20, desconto: 0, taxaServico: 0, taxaEntrega: 0, total: 20, statusPagamento: 'pendente', saldoRestante: 20, valorTotalPago: 0 }],
      alerts: [], printQueue: [], tables: [], cashRegister: { ...INITIAL_CASH_REGISTER, aberto: true, saldoInicial: 200, saldoAtualGaveta: 200, transacoes: [] } }));
    const { result } = boot();
    expect(result.current.orders[0].pagamentos).toEqual([]);
    act(() => result.current.cancelOrderItem('legacy-1', 'qa-line', 'QA'));
    expect(result.current.orders[0].itens).toHaveLength(0);
    act(() => result.current.addItemsToOrder('legacy-1', [item({ cartItemId: 'new' })]));
    expect(result.current.orders[0].itens).toHaveLength(1);
  });
});

describe('mesas com histórico de pedidos por sessão', () => {
  it('MESA primeiro lançamento recebe 1.0 e segundo recebe 1.1 sem sobrescrever o anterior', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente QA'));
    let a!: Order; let b!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'm1' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'm2' })] }); });
    expect(a.codigoMesa).toBe('1.0');
    expect(b.codigoMesa).toBe('1.1');
    expect(result.current.orders.filter(o => o.mesaSessaoId === a.mesaSessaoId)).toHaveLength(2);
    expect(result.current.tables.find(t => t.numero === 1)?.valorAtual).toBe(40);
  });

  it('MESA terceiro lançamento recebe 1.2 e mantém o histórico mesmo após o espelho dos anteriores', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(2));
    let a!: Order; let b!: Order; let c!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'a' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'b' })] }); });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => { c = result.current.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'c' })] }); });
    expect([a.codigoMesa, b.codigoMesa, c.codigoMesa]).toEqual(['1.0', '1.1', '1.2']);
    expect(result.current.orders.filter(o => o.mesaSessaoId === a.mesaSessaoId).map(o => o.codigoMesa)).toEqual(['1.2', '1.1', '1.0']);
  });

  it('MESA baixa manual quita todos os pedidos da sessão e libera a mesa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(3));
    let a!: Order; let b!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'a' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'b' })] }); });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => result.current.generateOrderMirror(b.id));
    act(() => result.current.requestTableBill(3));
    act(() => result.current.settleTableAccount(3, 'pix', 40));
    const sessionOrders = result.current.orders.filter(o => o.mesaSessaoId === a.mesaSessaoId);
    expect(sessionOrders.every(o => o.status === 'finalizado')).toBe(true);
    expect(sessionOrders.every(o => o.statusPagamento === 'pago')).toBe(true);
    expect(result.current.tables.find(t => t.numero === 3)?.status).toBe('livre');
  });

  it('MESA nova ocupação inicia nova sessão 2.0, sem reutilizar 1.0', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(4));
    let first!: Order;
    act(() => { first = result.current.createOrder({ tipo: 'mesa', mesaNumero: 4, itens: [item({ cartItemId: 'x1' })] }); });
    act(() => result.current.generateOrderMirror(first.id));
    act(() => result.current.settleTableAccount(4, 'pix', 20));
    act(() => result.current.openTableWithOrder(4, 'Novo Cliente'));
    let second!: Order;
    act(() => { second = result.current.createOrder({ tipo: 'mesa', mesaNumero: 4, itens: [item({ cartItemId: 'x2' })] }); });
    expect(first.codigoMesa).toBe('1.0');
    expect(second.codigoMesa).toBe('2.0');
    expect(second.mesaSessaoId).not.toBe(first.mesaSessaoId);
  });

  it('MESA adicionar itens pelo fluxo de mesa cria pedido novo em vez de editar o anterior', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(5));
    let first!: Order;
    act(() => { first = result.current.createOrder({ tipo: 'mesa', mesaNumero: 5, itens: [item({ cartItemId: 'old' })] }); });
    act(() => result.current.addItemsToTable(5, [item({ cartItemId: 'new' })]));
    const session = result.current.orders.filter(o => o.mesaSessaoId === first.mesaSessaoId).sort((a,b) => (a.mesaPedidoSequencia ?? 0) - (b.mesaPedidoSequencia ?? 0));
    expect(session).toHaveLength(2);
    expect(session.map(o => o.codigoMesa)).toEqual(['1.0', '1.1']);
    expect(session[0].itens[0].cartItemId).toBe('old');
    expect(session[1].itens[0].cartItemId).toBe('new');
  });
});

describe('interface pagamento', () => {
  it('UI venda completa pelo PDV registra pagamento e caixa', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
    fireEvent.click(view.container.querySelector('#product-card-qa-product')!);
    fireEvent.click(view.container.querySelector('#pos-pay-now-btn')!);
    fireEvent.click(view.container.querySelector('#payment-confirm-only-btn')!);
    expect(api.orders).toHaveLength(1);
    expect(api.orders[0].statusPagamento).toBe('pago');
    expect(api.orders[0].pagamentos).toHaveLength(1);
    expect(api.cashRegister.saldoAtualGaveta).toBe(220);
  });
  it.each(['HAMBÚRGUER', 'hambúrguer', 'hamburguer'])('UI busca produto por %s', query => {
    const view = render(<RestaurantProvider><POSView /></RestaurantProvider>);
    fireEvent.change(view.container.querySelector('#pos-search-input')!, { target: { value: query } });
    expect(view.container.querySelector('#product-card-qa-product')).not.toBeNull();
  });
  it('UI dinheiro insuficiente desabilita confirmação', () => { const view = render(<PaymentModal isOpen total={100} onClose={vi.fn()} onConfirm={vi.fn()} onReceiptTrigger={vi.fn()} />); fireEvent.change(view.container.querySelector('#cash-amount-input')!, { target: { value: '50' } }); expect(view.container.querySelector('#payment-confirm-only-btn')).toBeDisabled(); });
  it('CHAOS UI duplo clique 10 confirmações dispara uma operação', () => { const confirm = vi.fn(() => ({} as Order)); const view = render(<PaymentModal isOpen total={100} onClose={vi.fn()} onConfirm={confirm} onReceiptTrigger={vi.fn()} />); const button = view.container.querySelector('#payment-confirm-only-btn')!; act(() => { for (let i = 0; i < 10; i++) fireEvent.click(button); }); expect(confirm).toHaveBeenCalledTimes(1); });
});
describe('fluxo oficial pedido + espelho', () => {
  it('IMP pedido confirmado gera exatamente uma via PEDIDO e fica aguardando espelho', () => {
    const { result } = boot();
    const o = sale(result);
    const jobs = result.current.printQueue.filter(j => j.pedidoId === o.id);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].tipo).toBe('pedido');
    expect(jobs[0].pedidoNumero).toBe(o.numero);
    expect(jobs[0].grupoImpressaoId).toBe(o.impressoes?.[0].grupoId);
    expect(o.status).toBe('novo');
    expect(o.impressoes?.[0].espelhoJobId).toBeUndefined();
  });

  it('IMP gerar espelho cria a segunda via do MESMO pedido e marca como pronto', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    const jobs = result.current.printQueue.filter(j => j.pedidoId === o.id);
    expect(jobs).toHaveLength(2);
    expect(jobs.map(j => j.tipo).sort()).toEqual(['espelho', 'pedido']);
    expect(new Set(jobs.map(j => j.pedidoNumero)).size).toBe(1);
    expect(new Set(jobs.map(j => j.grupoImpressaoId)).size).toBe(1);
    expect(updated.status).toBe('pronto');
    expect(updated.impressoes?.[0].pedidoJobId).toBe(jobs.find(j => j.tipo === 'pedido')?.id);
    expect(updated.impressoes?.[0].espelhoJobId).toBe(jobs.find(j => j.tipo === 'espelho')?.id);
  });

  it('IMP gerar espelho duas vezes é idempotente', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.generateOrderMirror(o.id));
    expect(result.current.printQueue.filter(j => j.pedidoId === o.id)).toHaveLength(2);
  });

  it('IMP impressora do espelho offline bloqueia a conclusão e não finge que ficou pronto', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.togglePrinterStatus('prn-1'));
    expect(() => result.current.generateOrderMirror(o.id)).toThrow();
    expect(result.current.orders.find(x => x.id === o.id)?.status).toBe('novo');
    expect(result.current.orders.find(x => x.id === o.id)?.impressoes?.[0].espelhoJobId).toBeUndefined();
  });

  it('IMP pedido adicional cria novo par pendente sem duplicar o pedido anterior', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.addItemsToOrder(o.id, [item({ cartItemId: 'second' })]));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.status).toBe('novo');
    expect(updated.impressoes).toHaveLength(2);
    expect(updated.impressoes?.[1].espelhoJobId).toBeUndefined();
    const jobs = result.current.printQueue.filter(j => j.pedidoId === o.id);
    expect(jobs).toHaveLength(3);
    expect(jobs.filter(j => j.tipo === 'pedido')).toHaveLength(2);
    expect(new Set(jobs.map(j => j.pedidoNumero)).size).toBe(1);
  });

  it('IMP conteúdo das duas vias contém todos os itens do mesmo pedido', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ nome: 'Hambúrguer QA', quantidade: 2, observacao: 'Sem cebola' })] });
    act(() => result.current.generateOrderMirror(o.id));
    const jobs = result.current.printQueue.filter(j => j.pedidoId === o.id);
    for (const job of jobs) {
      expect(job.conteudoTexto).toContain(`PEDIDO #${o.numero}`);
      expect(job.conteudoTexto).toContain('2x Hambúrguer QA');
      expect(job.conteudoTexto).toContain('OBS: Sem cebola');
    }
  });

  it('UI confirmação não possui botão Enviar Cozinha e usa Confirmar Pedido', () => {
    const view = render(<RestaurantProvider><POSView /></RestaurantProvider>);
    fireEvent.click(view.container.querySelector('#product-card-qa-product')!);
    expect(view.container.querySelector('#pos-send-kitchen-btn')).toBeNull();
    expect(view.container.querySelector('#pos-confirm-order-btn')).not.toBeNull();
    expect(view.container.querySelector('#order-type-balcao')).not.toBeNull();
    expect(view.container.querySelector('#order-type-mesa')).not.toBeNull();
    expect(view.container.querySelector('#order-type-delivery')).not.toBeNull();
  });

  it('UI confirmação de pedido não cobra automaticamente', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
    fireEvent.click(view.container.querySelector('#product-card-qa-product')!);
    fireEvent.click(view.container.querySelector('#pos-confirm-order-btn')!);
    expect(api.orders).toHaveLength(1);
    expect(api.orders[0].statusPagamento).toBe('pendente');
    expect(api.orders[0].valorTotalPago).toBe(0);
  });

  it('MESA fechar conta sem pagamento não libera a mesa', () => {
    const { result } = boot();
    sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.requestTableBill(1));
    expect(() => result.current.settleTableAccount(1)).toThrow();
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('conta');
  });

  it('MESA fechar conta paga finaliza pedido e libera mesa', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.settleTableAccount(1, 'dinheiro', 20, 0));
    expect(result.current.orders.find(x => x.id === o.id)?.status).toBe('finalizado');
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('livre');
  });
});


describe('auditoria operacional aprofundada — impressão dupla e canais', () => {
  it('IMP cada lote registra exatamente os itens que pertencem ao par pedido + espelho', () => {
    const { result } = boot();
    const first = item({ cartItemId: 'first', nome: 'Primeiro item' });
    const second = item({ cartItemId: 'second', nome: 'Segundo item' });
    let o!: Order;
    act(() => { o = result.current.createOrder({ itens: [first] }); });
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.addItemsToOrder(o.id, [second]));
    act(() => result.current.generateOrderMirror(o.id));

    const jobs = result.current.printQueue.filter(j => j.pedidoId === o.id);
    expect(jobs).toHaveLength(4);
    const mirrors = jobs.filter(j => j.tipo === 'espelho');
    expect(mirrors).toHaveLength(2);
    expect(mirrors[0].conteudoTexto).toContain('Primeiro item');
    expect(mirrors[0].conteudoTexto).not.toContain('Segundo item');
    expect(mirrors[1].conteudoTexto).toContain('Segundo item');
    expect(mirrors[1].conteudoTexto).not.toContain('Primeiro item');
  });

  it('IMP pedido e espelho compartilham pedido, número e grupo de impressão', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    const jobs = result.current.printQueue.filter(j => j.pedidoId === o.id);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].pedidoId).toBe(jobs[1].pedidoId);
    expect(jobs[0].pedidoNumero).toBe(jobs[1].pedidoNumero);
    expect(jobs[0].grupoImpressaoId).toBe(jobs[1].grupoImpressaoId);
    expect(new Set(jobs.map(j => j.tipo))).toEqual(new Set(['pedido', 'espelho']));
  });

  it('IMP não usa uma impressora aleatória quando não existe pedido/espelho nem impressora geral disponível', () => {
    const { result } = boot();
    act(() => {
      result.current.togglePrinterStatus('prn-1');
      result.current.togglePrinterStatus('prn-2');
      result.current.togglePrinterStatus('prn-3');
    });
    const o = sale(result);
    expect(result.current.printQueue.find(j => j.pedidoId === o.id)?.status).toBe('falha');
    expect(() => result.current.generateOrderMirror(o.id)).toThrow();
    expect(result.current.orders.find(x => x.id === o.id)?.status).toBe('novo');
  });


  it('IMP item já espelhado não pode ser removido silenciosamente', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ cartItemId: 'printed-item' })] });
    act(() => result.current.generateOrderMirror(o.id));
    act(() => attempt(() => result.current.cancelOrderItem(o.id, 'printed-item', 'Correção QA')));
    expect(result.current.orders[0].itens).toHaveLength(1);
    expect(result.current.orders[0].itens[0].cartItemId).toBe('printed-item');
  });

  it('ADM reabrir pedido finalizado retorna a estado editável sem criar nova impressão', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20));
    act(() => result.current.updateOrderStatus(o.id, 'entregue'));
    act(() => result.current.updateOrderStatus(o.id, 'finalizado'));
    const jobsBefore = result.current.printQueue.filter(j => j.pedidoId === o.id).length;
    act(() => result.current.reopenOrder(o.id, 'Correção administrativa QA'));
    expect(result.current.orders[0].status).toBe('pronto');
    expect(result.current.printQueue.filter(j => j.pedidoId === o.id)).toHaveLength(jobsBefore);
  });

  it('ENT entrega mantém endereço, taxa e tipo no conteúdo impresso', () => {
    const { result } = boot();
    const o = sale(result, {
      tipo: 'delivery',
      nomeCliente: 'Cliente Entrega',
      telefoneCliente: '92999999999',
      taxaEntrega: 7,
      enderecoEntrega: { logradouro: 'Rua Teste', numero: '123', bairro: 'Centro' }
    });
    const job = result.current.printQueue.find(j => j.pedidoId === o.id && j.tipo === 'pedido')!;
    expect(job.conteudoTexto).toContain('TIPO: DELIVERY');
    expect(job.conteudoTexto).toContain('ENDEREÇO: Rua Teste, 123 - Centro');
    expect(job.conteudoTexto).toContain('TAXA ENTREGA: R$ 7.00');
  });

  it('SEG normalização elimina status legado de produção digital', () => {
    localStorage.setItem(key, JSON.stringify({
      operationalDemoResetApplied: true,
      menu: [product],
      orders: [{ ...saleLegacyFixture(), status: 'preparando', itens: [({ ...item(), statusProducao: 'preparando' } as any)] }],
      printQueue: [],
      tables: [],
      cashRegister: { ...INITIAL_CASH_REGISTER, aberto: true, saldoInicial: 200, saldoAtualGaveta: 200, transacoes: [] }
    }));
    const { result } = boot();
    expect(result.current.orders[0].status).toBe('novo');
    expect((result.current.orders[0].itens[0] as any).statusProducao).toBeUndefined();
  });
});

function saleLegacyFixture(): Order {
  return {
    id: 'legacy-status', numero: 1001, tipo: 'balcao', canal: 'Balcão', criadoEm: new Date().toISOString(),
    itens: [item()], subtotal: 20, desconto: 0, taxaServico: 0, taxaEntrega: 0, total: 20,
    status: 'novo', statusPagamento: 'pendente', pagamentos: [], valorTotalPago: 0, saldoRestante: 20
  };
}

describe('testes extensivos adicionais — invariantes de operação', () => {
  it('CAI pedido não pode ser criado com caixa fechado', () => {
    const { result } = boot();
    act(() => result.current.closeCashRegister());
    act(() => attempt(() => result.current.createOrder({ itens: [item()] })));
    expect(result.current.orders).toHaveLength(0);
  });

  it('VEN mesma operação não duplica pedido nem impressão', () => {
    const { result } = boot();
    const data = { operacaoId: 'op-idempotente', itens: [item()] };
    let a!: Order; let b!: Order;
    act(() => { a = result.current.createOrder(data); b = result.current.createOrder(data); });
    expect(b.id).toBe(a.id);
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.printQueue.filter(j => j.pedidoId === a.id)).toHaveLength(1);
  });

  it('MES não permite criar segundo pedido para mesa já ocupada', () => {
    const { result } = boot();
    sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => attempt(() => result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item()] })));
    expect(result.current.orders).toHaveLength(1);
  });

  it('MES adicionar itens à conta existente cria novo lote de impressão', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.addItemsToOrder(o.id, [item({ cartItemId: 'novo-item' })]));
    const updated = result.current.orders[0];
    expect(updated.status).toBe('novo');
    expect(updated.impressoes).toHaveLength(2);
    expect(updated.impressoes?.[1].itemIds).toEqual(['novo-item']);
  });

  it('PAG pagamento parcial não libera mesa', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ precoUnitario: 40 })] });
    act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20));
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('ocupada');
    expect(result.current.orders[0].saldoRestante).toBe(20);
  });

  it('PAG pagamento acima do saldo não altera caixa nem pedido', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => attempt(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 21, 21)));
    expect(result.current.orders[0].pagamentos).toHaveLength(0);
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(200);
  });

  it('CAN pedido pago não pode ser cancelado sem estorno', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    act(() => attempt(() => result.current.cancelOrder(o.id, 'Tentativa QA')));
    expect(result.current.orders[0].status).not.toBe('cancelado');
  });

  it('CAN cancelar item ainda não espelhado recalcula o total', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ cartItemId: 'a' }), item({ cartItemId: 'b' })] });
    act(() => result.current.cancelOrderItem(o.id, 'b', 'Erro de lançamento'));
    expect(result.current.orders[0].itens.map(i => i.cartItemId)).toEqual(['a']);
    expect(result.current.orders[0].total).toBe(20);
  });

  it('IMP reimpressão rejeita impressora offline', () => {
    const { result } = boot();
    const o = sale(result);
    const job = result.current.printQueue.find(j => j.pedidoId === o.id)!;
    act(() => result.current.togglePrinterStatus(job.impressoraId));
    expect(() => result.current.reprintJob(job.id)).toThrow();
  });

  it('IMP impressora geral é fallback explícito para uma finalidade sem impressora dedicada', () => {
    const { result } = boot();
    act(() => result.current.togglePrinterStatus('prn-1'));
    const o = sale(result);
    const job = result.current.printQueue.find(j => j.pedidoId === o.id)!;
    expect(job.impressoraId).toBe('prn-3');
  });

  it('STATUS não permite marcar entregue antes do espelho', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => attempt(() => result.current.updateOrderStatus(o.id, 'entregue')));
    expect(result.current.orders[0].status).toBe('novo');
  });

  it('STATUS gerar espelho muda somente para pronto e não paga automaticamente', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    expect(result.current.orders[0].status).toBe('pronto');
    expect(result.current.orders[0].statusPagamento).toBe('pendente');
  });

  it('PIX pagamento manual não altera a gaveta física', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(200);
    expect(result.current.cashRegister.transacoes[0].formaPagamento).toBe('pix');
  });

  it('CARTÃO pagamento manual não depende de integração com maquininha', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, 'credito', 20));
    expect(result.current.orders[0].statusPagamento).toBe('pago');
    expect(result.current.orders[0].pagamentos[0].formaId).toBe('credito');
  });

  it('MESA transferência atualiza o número da mesa do pedido', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.transferTable(1, 2));
    expect(result.current.orders.find(x => x.id === o.id)?.mesaNumero).toBe(2);
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('livre');
    expect(result.current.tables.find(t => t.numero === 2)?.pedidoAtivoId).toBe(o.id);
  });

  it('MESA pagamento completo libera a mesa somente depois da baixa', () => {
    const { result } = boot();
    sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.requestTableBill(1));
    act(() => result.current.settleTableAccount(1, 'pix', 20, 0));
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('livre');
    expect(result.current.tables.find(t => t.numero === 1)?.pedidoAtivoId).toBeUndefined();
  });
});
