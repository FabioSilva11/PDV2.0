import React from 'react';
import { act, renderHook, render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { PaymentModal } from '../components/pdv/PaymentModal';
import { POSView } from '../components/pdv/POSView';
import { INITIAL_CASH_REGISTER, INITIAL_INGREDIENTS, INITIAL_TABLES } from '../data/seedData';
import type { CartItem, MenuItem, Order, PaymentMethodId } from '../types';

const key = 'murupi_restaurant_database_v1';
const product: MenuItem = { id: 'qa-product', nome: 'Hambúrguer QA 🍔', preco: 20,
  categoria: 'Bebidas', disponivel: true, estoqueControlado: true,
  fichaTecnica: [{ ingredienteId: 'ing-1', nome: 'Unidade QA', quantidade: 1, unidade: 'un', custoEstimado: 1 }] };
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
    menu: [product], orders: [], alerts: [], auditLogs: [], printQueue: [],
    ingredients: [{ ...INITIAL_INGREDIENTS[0], estoqueAtual: 1000, estoqueMinimo: 0 }],
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
  it('PER usuário sem permissão não exclui produto', () => { const { result } = boot(); act(() => result.current.setCurrentUser({ ...result.current.currentUser, cargo: 'Garçom', permissoes: { cancelarPedido: false, aplicarDesconto: false, reabrirCaixa: false, modificarEstoque: false, visualizarFinanceiro: false, reabrirConta: false, excluirProduto: false, fecharMesa: false, estornarPagamento: false } })); act(() => attempt(() => result.current.deleteMenuItem(product.id))); expect(result.current.menu).toHaveLength(1); });
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

describe('estoque mesas cozinha recuperacao e estresse', () => {
  it('EST venda baixa ficha técnica', () => { const { result } = boot(); sale(result); expect(result.current.ingredients[0].estoqueAtual).toBe(999); });
  it('EST cancelamento antes de preparo devolve estoque', () => { const { result } = boot(); const o = sale(result); act(() => result.current.cancelOrder(o.id, 'Cliente desistiu antes do preparo')); expect(result.current.ingredients[0].estoqueAtual).toBe(1000); });
  it('EST mesa primeira inclusão baixa apenas uma vez', () => { const { result } = boot(); act(() => result.current.addItemsToTable(1, [item()])); expect(result.current.ingredients[0].estoqueAtual).toBe(999); });
  it('ATAQUE concorrencia última unidade aceita uma venda', () => { const { result } = boot(); act(() => result.current.updateIngredient({ ...result.current.ingredients[0], estoqueAtual: 1 })); act(() => { for (let i = 0; i < 2; i++) attempt(() => result.current.createOrder({ itens: [item()] })); }); expect(result.current.orders).toHaveLength(1); });
  it('ATAQUE estoque entradas simultâneas não perdem atualização', () => { const { result } = boot(); act(() => { result.current.addStockMovement('ing-1', 'entrada', 1, 'QA A'); result.current.addStockMovement('ing-1', 'entrada', 1, 'QA B'); }); expect(result.current.ingredients[0].estoqueAtual).toBe(1002); });
  it('MES reabrir mesa ocupada preserva valor', () => { const { result } = boot(); sale(result, { tipo: 'mesa', mesaNumero: 1 }); act(() => result.current.openTableWithOrder(1, 'Outro funcionário')); expect(result.current.tables.find(t => t.numero === 1)?.valorAtual).toBe(20); });
  it('MES transferência para mesa livre preserva pedido', () => { const { result } = boot(); const o = sale(result, { tipo: 'mesa', mesaNumero: 1 }); act(() => result.current.transferTable(1, 2)); expect(result.current.tables.find(t => t.numero === 2)?.pedidoAtivoId).toBe(o.id); expect(result.current.orders[0].mesaNumero).toBe(2); });
  it('COZ pedido cria fila de impressão', () => { const { result } = boot(); const o = sale(result); expect(result.current.printQueue.some(j => j.pedidoNumero === o.numero)).toBe(true); });
  it('REC remontagem offline preserva venda caixa e estoque', () => { const first = boot(); const o = sale(first.result); act(() => first.result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20)); first.unmount(); const { result } = boot(); expect(result.current.orders[0].id).toBe(o.id); expect(result.current.orders[0].statusPagamento).toBe('pago'); expect(result.current.cashRegister.saldoAtualGaveta).toBe(220); expect(result.current.ingredients[0].estoqueAtual).toBe(999); });
  it('CHAOS estresse 500 pedidos no mesmo lote têm IDs e números únicos', () => { const { result } = boot(); act(() => { for (let i = 0; i < 500; i++) result.current.createOrder({ itens: [item()] }); }); expect(result.current.orders).toHaveLength(500); expect(new Set(result.current.orders.map(o => o.id)).size).toBe(500); expect(new Set(result.current.orders.map(o => o.numero)).size).toBe(500); });
  it('DIA jornada sintética reconcilia caixa após estorno e sangria', () => { const { result } = boot(); const a = sale(result); act(() => result.current.addManualPaymentToOrder(a.id, 'dinheiro', 20, 50)); const b = sale(result); act(() => result.current.addManualPaymentToOrder(b.id, 'pix', 20)); const c = sale(result); act(() => result.current.addManualPaymentToOrder(c.id, 'dinheiro', 20, 20)); act(() => result.current.reverseOrderPayment(c.id, result.current.orders[0].pagamentos[0].id, 'QA')); act(() => result.current.cancelOrder(c.id, 'QA')); act(() => result.current.addCashMovement('sangria', 10, 'QA')); act(() => result.current.closeCashRegister()); expect(result.current.cashRegister.saldoAtualGaveta).toBe(210); expect(result.current.orders.filter(o => o.statusPagamento === 'pago').reduce((s, o) => s + o.total, 0)).toBe(40); });
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

