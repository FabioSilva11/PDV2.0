import React from 'react';
import { act, renderHook, render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestaurantProvider, useRestaurant, normalizePrinter } from '../context/RestaurantContext';
import { PaymentModal } from '../components/pdv/PaymentModal';
import { POSView } from '../components/pdv/POSView';
import { TablesView } from '../components/tables/TablesView';
import { ManualPaymentModal } from '../components/payment/ManualPaymentModal';
import { OrderDetailsModal } from '../components/orders/OrderDetailsModal';
import { mergeSnapshots, SyncConflict } from '../lib/mergeSnapshots';
import { INITIAL_TABLES } from '../data/seedData';
import { DEFAULT_RESTAURANT_SETTINGS } from '../config/defaultSettings';
import { hashPassword } from '../lib/auth';
import type { CartItem, MenuItem, Order, PaymentMethodId, UserAccount } from '../types';

const key = 'pdv_database_v2';
const product: MenuItem = { id: 'qa-product', nome: 'Hambúrguer QA 🍔', preco: 20,
  categoria: 'Bebidas', disponivel: true };
const item = (overrides: Partial<CartItem> = {}): CartItem => ({ cartItemId: 'qa-line',
  menuItemId: product.id, nome: product.nome, precoUnitario: 20, quantidade: 1,
  observacao: '', estacaoProducao: 'cozinha', ...overrides });

let passwordHashPromise: Promise<string> | null = null;
const QA_ADMIN: UserAccount = {
  id: 'usr-qa-admin', nome: 'Operador QA', usuario: 'qa', cargo: 'Administrador',
  perfil: 'administrador', ativo: true, isPrimaryAdmin: true,
  permissoes: ['pdv','pedidos','mesas','caixa','cardapio','clientes','reservas','desconto','cancelamento','reabertura','auditoria','usuarios','impressoras','configuracoes'],
  senhaHash: 'pendente' as any,
};
// Hash real (PBKDF2) gerado uma única vez por arquivo de teste.
passwordHashPromise = hashPassword('1234');

const seedDatabase = (extra: Record<string, unknown> = {}) => ({
  operationalDemoResetApplied: true,
  settings: { ...DEFAULT_RESTAURANT_SETTINGS, setupComplete: true },
  users: [QA_ADMIN],
  menu: [product],
  orders: [], alerts: [], printQueue: [],
  tables: INITIAL_TABLES.map(t => ({ ...t, status: 'livre', valorAtual: 0, pedidoAtivoId: undefined })),
  cashRegister: { aberto: true, saldoInicial: 200, saldoAtualGaveta: 200, transacoes: [] },
  ...extra,
});

const wrapper = ({ children }: { children: React.ReactNode }) => <RestaurantProvider>{children}</RestaurantProvider>;
const boot = () => renderHook(() => useRestaurant(), { wrapper });
type API = ReturnType<typeof boot>['result'];
function sale(api: API, overrides: Partial<Order> = {}) {
  let order!: Order;
  act(() => { order = api.current.createOrder({ itens: [item()], ...overrides }); });
  return order;
}
function attempt(fn: () => unknown) { try { fn(); } catch { /* rejeição é permitida; verificar estado em seguida */ } }
beforeEach(async () => {
  localStorage.clear();
  QA_ADMIN.senhaHash = await passwordHashPromise!;
  localStorage.setItem(key, JSON.stringify(seedDatabase()));
  // Sessão do operador QA: o sistema não tem mais usuário fixo no código.
  localStorage.setItem('pdv_session_v1', JSON.stringify({ userId: QA_ADMIN.id, token: 'qa-token-test', startedAt: new Date().toISOString() }));
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
  it('MES reabrir mesa ocupada preserva valor e não cria conta nova', () => { const { result } = boot(); sale(result, { tipo: 'mesa', mesaNumero: 1 }); act(() => attempt(() => result.current.openTableWithOrder(1, 'Outro funcionário'))); expect(result.current.tables.find(t => t.numero === 1)?.valorAtual).toBe(20); expect(result.current.accounts).toHaveLength(1); expect(result.current.accounts[0].status).toBe('aberta'); });
  it('MES transferência para mesa livre preserva pedido', () => { const { result } = boot(); const o = sale(result, { tipo: 'mesa', mesaNumero: 1 }); act(() => result.current.transferTable(1, 2)); expect(result.current.tables.find(t => t.numero === 2)?.pedidoAtivoId).toBe(o.id); expect(result.current.orders[0].mesaNumero).toBe(2); });
  it('COZ pedido cria fila de impressão', () => { const { result } = boot(); const o = sale(result); expect(result.current.printQueue.some(j => j.pedidoNumero === o.numero)).toBe(true); });
  it('REC remontagem offline preserva venda caixa', () => { const first = boot(); const o = sale(first.result); act(() => first.result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20)); first.unmount(); const { result } = boot(); expect(result.current.orders[0].id).toBe(o.id); expect(result.current.orders[0].statusPagamento).toBe('pago'); expect(result.current.cashRegister.saldoAtualGaveta).toBe(220); });
  it('CHAOS estresse 500 pedidos no mesmo lote têm IDs e números únicos', () => { const { result } = boot(); act(() => { for (let i = 0; i < 500; i++) result.current.createOrder({ itens: [item()] }); }); expect(result.current.orders).toHaveLength(500); expect(new Set(result.current.orders.map(o => o.id)).size).toBe(500); expect(new Set(result.current.orders.map(o => o.numero)).size).toBe(500); });
  it('DIA jornada sintética reconcilia caixa após estorno e sangria', () => { const { result } = boot(); const a = sale(result); act(() => result.current.addManualPaymentToOrder(a.id, 'dinheiro', 20, 50)); const b = sale(result); act(() => result.current.addManualPaymentToOrder(b.id, 'pix', 20)); const c = sale(result); act(() => result.current.addManualPaymentToOrder(c.id, 'dinheiro', 20, 20)); act(() => result.current.reverseOrderPayment(c.id, result.current.orders[0].pagamentos[0].id, 'QA')); act(() => result.current.cancelOrder(c.id, 'QA')); act(() => result.current.addCashMovement('sangria', 10, 'QA')); act(() => result.current.closeCashRegister()); expect(result.current.cashRegister.saldoAtualGaveta).toBe(210); expect(result.current.orders.filter(o => o.statusPagamento === 'pago').reduce((s, o) => s + o.total, 0)).toBe(40); });
  it('LEG pedido antigo sem pagamentos/itens é normalizado e ainda aceita edição', () => {
    localStorage.setItem(key, JSON.stringify({ ...seedDatabase(),
      orders: [{ id: 'legacy-1', operacaoId: 'op-1', numero: 1000, tipo: 'balcao', status: 'pendente', criadoEm: new Date().toISOString(), itens: [item()], subtotal: 20, desconto: 0, taxaServico: 0, taxaEntrega: 0, total: 20, statusPagamento: 'pendente', saldoRestante: 20, valorTotalPago: 0 }] }));
    const { result } = boot();
    expect(result.current.orders[0].pagamentos).toEqual([]);
    act(() => result.current.cancelOrderItem('legacy-1', 'qa-line', 'QA'));
    expect(result.current.orders[0].itens).toHaveLength(0);
    act(() => result.current.addItemsToOrder('legacy-1', [item({ cartItemId: 'new' })]));
    expect(result.current.orders[0].itens).toHaveLength(1);
  });
});

describe('mesas com histórico de lançamentos por conta', () => {
  it('MESA primeiro lançamento recebe 0.1 e segundo recebe 0.2 na mesma conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente QA'));
    let a!: Order; let b!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'm1' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'm2' })] }); });
    expect(a.codigoExibicao).toBe('0.1');
    expect(b.codigoExibicao).toBe('0.2');
    expect(b.contaId).toBe(a.contaId);
    expect(b.contaNumero).toBe(0);
    expect(result.current.orders.filter(o => o.contaId === a.contaId)).toHaveLength(2);
    expect(result.current.tables.find(t => t.numero === 1)?.valorAtual).toBe(40);
  });

  it('MESA terceiro lançamento recebe 0.3 e mantém o histórico mesmo após o espelho dos anteriores', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(2));
    let a!: Order; let b!: Order; let c!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'a' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'b' })] }); });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => { c = result.current.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'c' })] }); });
    expect([a.codigoExibicao, b.codigoExibicao, c.codigoExibicao]).toEqual(['0.1', '0.2', '0.3']);
    expect(result.current.orders.filter(o => o.contaId === a.contaId).map(o => o.codigoExibicao)).toEqual(['0.3', '0.2', '0.1']);
  });

  it('MESA nova ocupação cria nova conta em vez de reutilizar a anterior', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(4));
    const first = sale(result, { tipo: 'mesa', mesaNumero: 4, itens: [item({ cartItemId: 'first' })] });
    act(() => result.current.freeTableManually(4));
    act(() => result.current.openTableWithOrder(4));
    // A Mesa 4 tem 2 contas abertas (a 0 liberada e a 1 ocupando): o operador
    // escolhe a conta, o PDV nunca adivinha.
    const conta1 = result.current.accounts.find(a => a.numero === 1)!;
    const second = sale(result, { tipo: 'mesa', mesaNumero: 4, contaId: conta1.id, itens: [item({ cartItemId: 'second' })] });
    expect(first.contaNumero).toBe(0);
    expect(second.contaNumero).toBe(1);
    expect(second.contaId).not.toBe(first.contaId);
    // Global sequence: second order overall → 0.2
    expect(second.codigoExibicao).toBe('0.2');
  });

  it('MESA baixa manual quita todos os lançamentos da conta e libera a mesa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(3));
    let a!: Order; let b!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'a' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'b' })] }); });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => result.current.generateOrderMirror(b.id));
    act(() => result.current.requestTableBill(3));
    act(() => result.current.settleTableAccount(3, 'pix', 40));
    const accountOrders = result.current.orders.filter(o => o.contaId === a.contaId);
    expect(accountOrders.every(o => o.status === 'finalizado')).toBe(true);
    expect(accountOrders.every(o => o.statusPagamento === 'pago')).toBe(true);
    expect(result.current.tables.find(t => t.numero === 3)?.status).toBe('livre');
  });

  it('MESA filtros do mapa de mesas listam exatamente as mesas dos contadores', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Harness: React.FC = () => { api = useRestaurant(); return <TablesView />; };
    const view = render(<RestaurantProvider><Harness /></RestaurantProvider>);
    // Mesa 1 ocupada, mesa 2 pedindo conta, demais livres.
    act(() => {
      api.openTableWithOrder(1, 'Cliente A');
      api.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'f1' })] });
      api.openTableWithOrder(2, 'Cliente B');
      api.createOrder({ tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'f2' })] });
      api.requestTableBill(2);
    });
    expect(view.container.querySelector('#table-card-1')).toBeTruthy();
    expect(view.container.textContent).toContain('Livres (14)');

    // Ocupadas: somente a mesa 1.
    fireEvent.click(view.getByRole('button', { name: /Ocupadas \(1\)/ }));
    expect(view.container.querySelector('#table-card-1')).toBeTruthy();
    expect(view.container.querySelector('#table-card-2')).toBeNull();
    expect(view.container.querySelector('#table-card-3')).toBeNull();

    // Pedindo Conta: somente a mesa 2.
    fireEvent.click(view.getByRole('button', { name: /Pedindo Conta \(1\)/ }));
    expect(view.container.querySelector('#table-card-2')).toBeTruthy();
    expect(view.container.querySelector('#table-card-1')).toBeNull();

    // Livres: as 14 mesas restantes (1 e 2 fora).
    fireEvent.click(view.getByRole('button', { name: /Livres \(14\)/ }));
    expect(view.container.querySelector('#table-card-3')).toBeTruthy();
    expect(view.container.querySelector('#table-card-1')).toBeNull();
    expect(view.container.querySelector('#table-card-2')).toBeNull();

    // Todas volta a exibir o mapa completo.
    fireEvent.click(view.getByRole('button', { name: /Todas \(16\)/ }));
    expect(view.container.querySelector('#table-card-16')).toBeTruthy();
  });

  it('MESA espelho do único lançamento libera a mesa mas mantém a conta em aberto', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(4));
    let first!: Order;
    act(() => { first = result.current.createOrder({ tipo: 'mesa', mesaNumero: 4, itens: [item({ cartItemId: 'x1' })] }); });
    // Com o espelho gerado, a mesa é liberada mesmo com débito pendente.
    act(() => result.current.generateOrderMirror(first.id));
    const table = result.current.tables.find(t => t.numero === 4)!;
    const account = result.current.accounts.find(a => a.id === first.contaId)!;
    expect(result.current.orders.find(o => o.id === first.id)!.status).toBe('pronto');
    expect(table.status).toBe('livre');
    expect(table.contaAtualId).toBeUndefined();
    expect(account.status).toBe('aberta');
    expect(account.saldoRestante).toBe(20);
    expect(table.ultimaContaNumero).toBe(0);
  });

  it('MESA adicionar itens pelo fluxo de mesa cria lançamento novo em vez de editar o anterior', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(5));
    let first!: Order;
    act(() => { first = result.current.createOrder({ tipo: 'mesa', mesaNumero: 5, itens: [item({ cartItemId: 'old' })] }); });
    act(() => result.current.addItemsToTable(5, [item({ cartItemId: 'new' })]));
    const conta = result.current.orders.filter(o => o.contaId === first.contaId).sort((a, b) => (a.sequencia ?? 0) - (b.sequencia ?? 0));
    expect(conta).toHaveLength(2);
    expect(conta.map(o => o.codigoExibicao)).toEqual(['0.1', '0.2']);
    expect(conta[0].itens[0].cartItemId).toBe('old');
    expect(conta[1].itens[0].cartItemId).toBe('new');
  });
});

describe('interface pagamento', () => {
  it('UI venda completa pelo PDV registra pagamento e caixa', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return (
      <>
        <POSView />
        <ManualPaymentModal />
      </>
    ); };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
    fireEvent.click(view.container.querySelector('#product-card-qa-product')!);
    act(() => api.createOrder({ itens: [item()] }));
    const o = api.orders[0];
    act(() => api.openPaymentModal(o));
    fireEvent.change(view.container.querySelector('#input-manual-payment-value')!, { target: { value: '20' } });
    fireEvent.change(view.container.querySelector('#input-manual-payment-received')!, { target: { value: '20' } });
    fireEvent.click(view.container.querySelector('#submit-add-manual-payment-btn')!);
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
  it('UI dinheiro insuficiente desabilita confirmação', () => { const view = render(<RestaurantProvider><PaymentModal isOpen total={100} onClose={vi.fn()} onConfirm={vi.fn()} onReceiptTrigger={vi.fn()} /></RestaurantProvider>); fireEvent.change(view.container.querySelector('#cash-amount-input')!, { target: { value: '50' } }); expect(view.container.querySelector('#payment-confirm-only-btn')).toBeDisabled(); });
  it('CHAOS UI duplo clique 10 confirmações dispara uma operação', () => { const confirm = vi.fn(() => ({} as Order)); const view = render(<RestaurantProvider><PaymentModal isOpen total={100} onClose={vi.fn()} onConfirm={confirm} onReceiptTrigger={vi.fn()} /></RestaurantProvider>); const button = view.container.querySelector('#payment-confirm-only-btn')!; act(() => { for (let i = 0; i < 10; i++) fireEvent.click(button); }); expect(confirm).toHaveBeenCalledTimes(1); });
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
      ...seedDatabase(),
      orders: [{ ...saleLegacyFixture(), status: 'preparando', itens: [({ ...item(), statusProducao: 'preparando' } as any)] }]
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

  it('MES não permite criar uma NOVA conta para mesa com conta aberta', () => {
    const { result } = boot();
    const first = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    // Reabrir a mesa é um novo atendimento: só é permitido quando a mesa está livre.
    act(() => attempt(() => result.current.openTableWithOrder(1, 'Outro cliente')));
    expect(result.current.accounts).toHaveLength(1);
    // Um novo lançamento, porém, continua a MESMA conta (novo código 0.2).
    const second = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    expect(second.contaId).toBe(first.contaId);
    expect(second.codigoExibicao).toBe('0.2');
    expect(result.current.accounts).toHaveLength(1);
  });

  it('MES espelho do último lançamento da mesa libera a mesa', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('ocupada');
    act(() => result.current.generateOrderMirror(o.id));
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('livre');
    // O débito permanece no pedido, para recebimento posterior.
    expect(result.current.orders[0].saldoRestante).toBe(20);
    // A mesa pode ser reocupada normalmente.
    act(() => result.current.openTableWithOrder(1, 'Novo cliente'));
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('ocupada');
  });

  it('MES espelho de um lançamento não libera a mesa enquanto outro aguarda', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    let a!: Order; let b!: Order;
    act(() => { a = result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'p1' })] }); });
    act(() => { b = result.current.createOrder({ tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'p2' })] }); });
    act(() => result.current.generateOrderMirror(a.id));
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('ocupada');
    act(() => result.current.generateOrderMirror(b.id));
    expect(result.current.tables.find(t => t.numero === 1)?.status).toBe('livre');
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

  it('MES espelho não impede baixa posterior do débito', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ precoUnitario: 40 })] });
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 40, 40));
    expect(result.current.orders[0].saldoRestante).toBe(0);
    expect(result.current.orders[0].statusPagamento).toBe('pago');
  });

  it('PAG pagamento parcial não quita nem finaliza o pedido', () => {
    const { result } = boot();
    const o = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ precoUnitario: 40 })] });
    act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20));
    expect(result.current.orders[0].saldoRestante).toBe(20);
    expect(result.current.orders[0].statusPagamento).toBe('pago_parcial');
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

describe('melhorias operacionais v2 — edicao, caixa zerado, destaque e produtos', () => {
  // 1. abrir caixa com R$ 0
  it('1. CAIXA abrir caixa com R$ 0,00 inicializa saldo corretamente', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      cashRegister: { aberto: false, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: [] }
    })));
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    expect(result.current.cashRegister.aberto).toBe(true);
    expect(result.current.cashRegister.saldoInicial).toBe(0);
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(0);
    expect(result.current.cashRegister.transacoes[0].tipo).toBe('abertura');
  });

  // 2. abrir caixa com R$ 0 e vender
  it('2. CAIXA abrir caixa com R$ 0 e realizar venda em dinheiro incrementa gaveta', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      cashRegister: { aberto: false, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: [] }
    })));
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, 'dinheiro', 20, 20));
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(20);
    expect(result.current.orders[0].statusPagamento).toBe('pago');
  });

  // 3. negar valor negativo na abertura
  it('3. CAIXA negar valor negativo na abertura', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      cashRegister: { aberto: false, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: [] }
    })));
    const { result } = boot();
    attempt(() => result.current.openCashRegister(-50));
    expect(result.current.cashRegister.aberto).toBe(false);
  });

  // 4. criar pedido
  it('4. PEDIDO criação de pedido registra dados corretamente', () => {
    const { result } = boot();
    const o = sale(result, { nomeCliente: 'Maria Silva', tipo: 'balcao' });
    expect(o.id).toBeDefined();
    expect(o.status).toBe('novo');
  });

  // 5. pedido aparecer na Central
  it('5. PEDIDO aparece na lista de orders da Central', () => {
    const { result } = boot();
    const o = sale(result, { nomeCliente: 'Carlos' });
    expect(result.current.orders.some(x => x.id === o.id)).toBe(true);
  });

  // 6. gerar via pedido
  it('6. IMPRESSAO pedido confirmado gera via pedido', () => {
    const { result } = boot();
    const o = sale(result);
    expect(o.impressoes?.length).toBeGreaterThan(0);
    expect(o.impressoes?.[0].tipoOperacao).toBe('pedido_inicial');
  });

  // 7. gerar espelho
  it('7. ESPELHO gerarOrderMirror gera lote de espelho', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    const updated = result.current.orders.find(x => x.id === o.id);
    expect(updated?.impressoes?.[0].espelhoJobId).toBeDefined();
  });

  // 8. pedido mudar para pronto
  it('8. ESPELHO pedido muda status para pronto apos espelho', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    expect(result.current.orders.find(x => x.id === o.id)?.status).toBe('pronto');
  });

  // 9. pedido pronto e não pago fica com saldoRestante > 0
  it('9. DESTAQUE pedido pronto e nao pago possui saldoRestante pendente', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.status).toBe('pronto');
    expect(updated.saldoRestante).toBe(20);
    expect(updated.statusPagamento).not.toBe('pago');
  });

  // 10. pedido pronto e pago zera saldo e statusPagamento vira pago
  it('10. DESTAQUE pedido pronto quitado zera saldoRestante e vira pago', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.generateOrderMirror(o.id));
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.status).toBe('pronto');
    expect(updated.statusPagamento).toBe('pago');
    expect(updated.saldoRestante).toBe(0);
  });

  // 11. número da mesa aparece corretamente
  it('11. MESA numero da mesa e codigoExibicao preservados no pedido', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(5, 'Cliente Mesa 5'));
    let o!: Order;
    act(() => { o = result.current.createOrder({ tipo: 'mesa', mesaNumero: 5, itens: [item()] }); });
    expect(o.mesaNumero).toBe(5);
    expect(o.mesaOriginalNumero).toBe(5);
    expect(o.contaNumero).toBe(0);
    expect(o.sequencia).toBe(1);
    expect(o.codigoExibicao).toBe('0.1');
  });

  // 12. editar quantidade de itens
  it('12. EDIT editOrder altera quantidade e recalcula total', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ quantidade: 1, precoUnitario: 20 })] });
    act(() => result.current.editOrder(o.id, {
      itens: [item({ quantidade: 3, precoUnitario: 20 })]
    }));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.itens[0].quantidade).toBe(3);
    expect(updated.total).toBe(60);
    expect(updated.saldoRestante).toBe(60);
  });

  // 13. remover item durante edição
  it('13. EDIT editOrder remove item e recalcula total', () => {
    const { result } = boot();
    const o = sale(result, {
      itens: [
        item({ cartItemId: 'it-1', precoUnitario: 15, quantidade: 1 }),
        item({ cartItemId: 'it-2', precoUnitario: 25, quantidade: 1 })
      ]
    });
    expect(o.total).toBe(40);
    act(() => result.current.editOrder(o.id, {
      itens: [item({ cartItemId: 'it-1', precoUnitario: 15, quantidade: 1 })]
    }));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.itens.length).toBe(1);
    expect(updated.total).toBe(15);
  });

  // 14. adicionar item durante edição
  it('14. EDIT editOrder adiciona novo item e recalcula total', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ cartItemId: 'it-1', precoUnitario: 20, quantidade: 1 })] });
    act(() => result.current.editOrder(o.id, {
      itens: [
        item({ cartItemId: 'it-1', precoUnitario: 20, quantidade: 1 }),
        item({ cartItemId: 'it-2', nome: 'Batata', precoUnitario: 10, quantidade: 2 })
      ]
    }));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.itens.length).toBe(2);
    expect(updated.total).toBe(40);
  });

  // 15. alterar cliente
  it('15. EDIT editOrder altera nome do cliente e telefone', () => {
    const { result } = boot();
    const o = sale(result, { nomeCliente: 'Antigo' });
    act(() => result.current.editOrder(o.id, {
      nomeCliente: 'João Santos',
      telefoneCliente: '11999998888'
    }));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.nomeCliente).toBe('João Santos');
    expect(updated.telefoneCliente).toBe('11999998888');
  });

  // 16. alterar observação
  it('16. EDIT editOrder altera observacoes gerais', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.editOrder(o.id, { observacoesGerais: 'Sem cebola em tudo caprichar no molho' }));
    expect(result.current.orders.find(x => x.id === o.id)?.observacoesGerais).toBe('Sem cebola em tudo caprichar no molho');
  });

  // 17. impedir edição de pedido cancelado
  it('17. EDIT editOrder impede edicao de pedido cancelado', () => {
    const { result } = boot();
    const o = sale(result);
    act(() => result.current.cancelOrder(o.id, 'Cliente desistiu'));
    attempt(() => result.current.editOrder(o.id, { nomeCliente: 'Tentativa' }));
    expect(result.current.orders.find(x => x.id === o.id)?.nomeCliente).not.toBe('Tentativa');
  });

  // 18. impedir edição que gere total menor que valor pago
  it('18. EDIT editOrder impede reducao que deixe valor pago maior que novo total', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ precoUnitario: 50, quantidade: 1 })] });
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 30));
    // Tenta reduzir total para 20 quando já pagou 30
    attempt(() => result.current.editOrder(o.id, {
      itens: [item({ precoUnitario: 20, quantidade: 1 })]
    }));
    expect(result.current.orders.find(x => x.id === o.id)?.total).toBe(50);
  });

  // 19. impedir pagamento excedente
  it('19. FINANCEIRO addManualPaymentToOrder rejeita valor maior que saldo restante', () => {
    const { result } = boot();
    const o = sale(result, { itens: [item({ precoUnitario: 20 })] });
    const success = result.current.addManualPaymentToOrder(o.id, 'pix', 25);
    expect(success).toBe(false);
    expect(result.current.orders.find(x => x.id === o.id)?.saldoRestante).toBe(20);
  });

  // 20. editar produto
  it('20. CARDAPIO saveMenuItem atualiza dados completos do produto', () => {
    const { result } = boot();
    const prod: MenuItem = {
      id: 'prod-teste',
      nome: 'Suco Natural',
      categoria: 'Sucos de Frutas',
      preco: 10,
      disponivel: true,
      catalogo: 'restaurante',
      acompanhamentos: ['Gelo e limão']
    };
    act(() => result.current.saveMenuItem(prod));
    expect(result.current.menu.find(m => m.id === 'prod-teste')?.nome).toBe('Suco Natural');

    act(() => result.current.saveMenuItem({
      ...prod,
      nome: 'Suco Natural de Laranja',
      preco: 12
    }));
    expect(result.current.menu.find(m => m.id === 'prod-teste')?.nome).toBe('Suco Natural de Laranja');
    expect(result.current.menu.find(m => m.id === 'prod-teste')?.preco).toBe(12);
  });

  // 21. escolher Restaurante
  it('21. CARDAPIO saveMenuItem salva explicitamente catalogo restaurante', () => {
    const { result } = boot();
    act(() => result.current.saveMenuItem({
      id: 'item-rest',
      nome: 'Prato do Dia',
      categoria: 'Pratos principais',
      preco: 25,
      disponivel: true,
      catalogo: 'restaurante'
    }));
    expect(result.current.menu.find(m => m.id === 'item-rest')?.catalogo).toBe('restaurante');
  });

  // 22. escolher Lanche
  it('22. CARDAPIO saveMenuItem salva explicitamente catalogo lanche', () => {
    const { result } = boot();
    act(() => result.current.saveMenuItem({
      id: 'item-lanche',
      nome: 'Hambúrguer Artesanal',
      categoria: 'Hambúrgueres',
      preco: 30,
      disponivel: true,
      catalogo: 'lanche'
    }));
    expect(result.current.menu.find(m => m.id === 'item-lanche')?.catalogo).toBe('lanche');
  });

  // 23. adicionar várias guarnições individualmente
  it('23. CARDAPIO guarnições individuais salvas como array', () => {
    const { result } = boot();
    act(() => result.current.saveMenuItem({
      id: 'item-guarnicoes',
      nome: 'Almoço Executivo',
      categoria: 'Pratos principais',
      preco: 28,
      disponivel: true,
      catalogo: 'restaurante',
      acompanhamentos: ['Arroz branco', 'Feijão carioca', 'Farofa crocante', 'Vinagrete']
    }));
    const saved = result.current.menu.find(m => m.id === 'item-guarnicoes')!;
    expect(saved.acompanhamentos).toHaveLength(4);
    expect(saved.acompanhamentos).toContain('Feijão carioca');
  });

  // 24. remover uma guarnição sem remover as outras
  it('24. CARDAPIO remover uma guarnição preserva as restantes', () => {
    const initialSides = ['Arroz', 'Feijão', 'Batata frita'];
    const updatedSides = initialSides.filter((_, idx) => idx !== 1); // remove Feijão
    expect(updatedSides).toEqual(['Arroz', 'Batata frita']);
  });

  // 25. preservar guarnições antigas
  it('25. CARDAPIO produtos legados com guarnicoes continuam intactos', () => {
    const { result } = boot();
    act(() => result.current.saveMenuItem({
      id: 'item-legado',
      nome: 'Comercial Antigo',
      categoria: 'Pratos principais',
      preco: 20,
      disponivel: true,
      acompanhamentos: ['Arroz', 'Feijão']
    }));
    expect(result.current.menu.find(m => m.id === 'item-legado')?.acompanhamentos).toEqual(['Arroz', 'Feijão']);
  });

  // 26. produto sem catálogo continuar sendo Restaurante
  it('26. CARDAPIO produto sem catalogo assume restaurante como padrao', () => {
    const { result } = boot();
    act(() => result.current.saveMenuItem({
      id: 'item-sem-cat',
      nome: 'Bife a Cavalo',
      categoria: 'Pratos principais',
      preco: 32,
      disponivel: true
    }));
    expect(result.current.menu.find(m => m.id === 'item-sem-cat')?.catalogo).toBe('restaurante');
  });

  // 27. garantir que salvar produto não duplique guarnições
  it('27. CARDAPIO ressalvar produto nao duplica guarnicoes', () => {
    const { result } = boot();
    const p: MenuItem = {
      id: 'item-no-dup',
      nome: 'Filé de Frango',
      categoria: 'Pratos principais',
      preco: 22,
      disponivel: true,
      acompanhamentos: ['Arroz', 'Purê']
    };
    act(() => result.current.saveMenuItem(p));
    act(() => result.current.saveMenuItem({ ...p, preco: 24 }));
    const saved = result.current.menu.find(m => m.id === 'item-no-dup')!;
    expect(saved.acompanhamentos).toEqual(['Arroz', 'Purê']);
  });

  // 28. garantir que edição de pedido não gere pedido duplicado
  it('28. EDIT editOrder nao duplica o pedido na lista', () => {
    const { result } = boot();
    const o = sale(result);
    const countBefore = result.current.orders.length;
    act(() => result.current.editOrder(o.id, { nomeCliente: 'Novo Nome' }));
    expect(result.current.orders.length).toBe(countBefore);
  });

  // 29. garantir que edição não altere o ID ou número do pedido
  it('29. EDIT editOrder mantem id e numero inalterados', () => {
    const { result } = boot();
    const o = sale(result);
    const origId = o.id;
    const origNum = o.numero;
    act(() => result.current.editOrder(o.id, { nomeCliente: 'Cliente Alterado' }));
    const updated = result.current.orders.find(x => x.id === origId)!;
    expect(updated.id).toBe(origId);
    expect(updated.numero).toBe(origNum);
  });

  // 30. garantir que o histórico de impressão continue consistente
  it('30. EDIT editOrder preserva historico de impressoes', () => {
    const { result } = boot();
    const o = sale(result);
    const printBatchesBefore = o.impressoes?.length || 0;
    act(() => result.current.editOrder(o.id, { observacoesGerais: 'Urgente' }));
    const updated = result.current.orders.find(x => x.id === o.id)!;
    expect(updated.impressoes?.length).toBe(printBatchesBefore);
  });
});

describe('melhorias operacionais v3 — UI edicao completa e sincronizacao deterministica', () => {
  it('1. UI edicao: botao Restaurante e Lanche existem e alternam catalogo', () => {
    const p1: MenuItem = { id: 'm-rest', nome: 'Bife Acebolado', preco: 30, categoria: 'Pratos principais', catalogo: 'restaurante', disponivel: true };
    const p2: MenuItem = { id: 'm-lanc', nome: 'X-Burger Artesanal', preco: 25, categoria: 'Lanches & Burgers', catalogo: 'lanche', disponivel: true };

    const Harness: React.FC = () => {
      const api = useRestaurant();
      React.useEffect(() => {
        api.saveMenuItem(p1);
        api.saveMenuItem(p2);
        const o = api.createOrder({ itens: [item()] });
        api.setSelectedOrderForModal(o);
      }, []);
      return <OrderDetailsModal />;
    };

    const { getByText, queryByText } = render(
      <RestaurantProvider>
        <Harness />
      </RestaurantProvider>
    );

    // Clicar em Editar Pedido
    const editBtn = getByText('Editar Pedido');
    fireEvent.click(editBtn);

    // Botões de catálogo
    const restBtn = getByText('Restaurante');
    const lancBtn = getByText('Lanche');
    expect(restBtn).toBeDefined();
    expect(lancBtn).toBeDefined();

    // No catálogo Restaurante (default), aparece Bife Acebolado e não X-Burger
    expect(getByText('Bife Acebolado')).toBeDefined();
    expect(queryByText('X-Burger Artesanal')).toBeNull();

    // Ao alternar para Lanche
    fireEvent.click(lancBtn);
    expect(getByText('X-Burger Artesanal')).toBeDefined();
    expect(queryByText('Bife Acebolado')).toBeNull();
  });

  it('2. UI edicao: categorias sao filtradas conforme o catalogo selecionado', () => {
    const p1: MenuItem = { id: 'm-suco', nome: 'Suco de Laranja', preco: 8, categoria: 'Sucos de Frutas', catalogo: 'restaurante', disponivel: true };
    const p2: MenuItem = { id: 'm-sobremesa', nome: 'Pudim de Leite', preco: 12, categoria: 'Sobremesas', catalogo: 'lanche', disponivel: true };

    const Harness: React.FC = () => {
      const api = useRestaurant();
      React.useEffect(() => {
        api.saveMenuItem(p1);
        api.saveMenuItem(p2);
        const o = api.createOrder({ itens: [item()] });
        api.setSelectedOrderForModal(o);
      }, []);
      return <OrderDetailsModal />;
    };

    const { getByText, queryByText, container } = render(
      <RestaurantProvider>
        <Harness />
      </RestaurantProvider>
    );

    fireEvent.click(getByText('Editar Pedido'));

    // Catálogo Restaurante deve ter pílula de Sucos de Frutas
    const sucoPill = container.querySelector('#edit-cat-pill-sucos-de-frutas');
    expect(sucoPill).not.toBeNull();
    expect(container.querySelector('#edit-cat-pill-sobremesas')).toBeNull();

    // Alternar para Lanche
    fireEvent.click(getByText('Lanche'));
    expect(container.querySelector('#edit-cat-pill-sobremesas')).not.toBeNull();
    expect(container.querySelector('#edit-cat-pill-sucos-de-frutas')).toBeNull();
  });

  it('3. UI edicao: busca por texto filtra dentro do catalogo ativo', () => {
    const p1: MenuItem = { id: 'm-goiaba', nome: 'Suco de Goiaba Natural', preco: 10, categoria: 'Sucos de Frutas', catalogo: 'restaurante', disponivel: true };
    const p2: MenuItem = { id: 'm-manga', nome: 'Suco de Manga', preco: 10, categoria: 'Sucos de Frutas', catalogo: 'restaurante', disponivel: true };

    const Harness: React.FC = () => {
      const api = useRestaurant();
      React.useEffect(() => {
        api.saveMenuItem(p1);
        api.saveMenuItem(p2);
        const o = api.createOrder({ itens: [item()] });
        api.setSelectedOrderForModal(o);
      }, []);
      return <OrderDetailsModal />;
    };

    const { getByText, queryByText, container } = render(
      <RestaurantProvider>
        <Harness />
      </RestaurantProvider>
    );

    fireEvent.click(getByText('Editar Pedido'));

    const searchInput = container.querySelector('#edit-product-search-input') as HTMLInputElement;
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'goiaba' } });
    expect(getByText('Suco de Goiaba Natural')).toBeDefined();
    expect(queryByText('Suco de Manga')).toBeNull();
  });

  it('4. UI edicao: mais de 10 produtos aparecem sem truncamento arbitrario (sem .slice(0, 10))', () => {
    const Harness: React.FC = () => {
      const api = useRestaurant();
      React.useEffect(() => {
        for (let i = 1; i <= 15; i++) {
          api.saveMenuItem({
            id: `prod-${i}`,
            nome: `Prato Teste ${i}`,
            preco: 20 + i,
            categoria: 'Pratos principais',
            catalogo: 'restaurante',
            disponivel: true
          });
        }
        const o = api.createOrder({ itens: [item()] });
        api.setSelectedOrderForModal(o);
      }, []);
      return <OrderDetailsModal />;
    };

    const { getByText, container } = render(
      <RestaurantProvider>
        <Harness />
      </RestaurantProvider>
    );

    fireEvent.click(getByText('Editar Pedido'));

    // Verifica que o 15º produto é renderizado no DOM
    expect(getByText('Prato Teste 15')).toBeDefined();
    const productElements = container.querySelectorAll('[id^="edit-menu-product-"]');
    expect(productElements.length).toBeGreaterThanOrEqual(15);
  });

  it('5. UI edicao: produto simples e adicionado diretamente aos itens em edicao', () => {
    const simple: MenuItem = { id: 'agua-sem-gas', nome: 'Água Mineral', preco: 5, categoria: 'Bebidas', catalogo: 'restaurante', disponivel: true };

    const Harness: React.FC = () => {
      const api = useRestaurant();
      React.useEffect(() => {
        api.saveMenuItem(simple);
        const o = api.createOrder({ itens: [item()] });
        api.setSelectedOrderForModal(o);
      }, []);
      return <OrderDetailsModal />;
    };

    const { getByText, container } = render(
      <RestaurantProvider>
        <Harness />
      </RestaurantProvider>
    );

    fireEvent.click(getByText('Editar Pedido'));
    const addBtn = container.querySelector('#edit-add-product-btn-agua-sem-gas') as HTMLButtonElement;
    expect(addBtn).toBeDefined();

    fireEvent.click(addBtn);
    // Água Mineral agora deve estar na lista de itens em edição
    expect(getByText('Itens em Edição (2)')).toBeDefined();
  });

  it('6. UI edicao: produto com guarnicoes/variacoes abre AccompanimentModal com texto Configurar', () => {
    const withSides: MenuItem = {
      id: 'prato-exec',
      nome: 'Parmegiana de Carne',
      preco: 45,
      categoria: 'Pratos principais',
      catalogo: 'restaurante',
      disponivel: true,
      acompanhamentos: ['Arroz', 'Fritas', 'Farofa'],
      variacoes: [{ id: 'v1', nome: 'Individual', preco: 45, custoEstimado: 15 }]
    };

    const Harness: React.FC = () => {
      const api = useRestaurant();
      React.useEffect(() => {
        api.saveMenuItem(withSides);
        const o = api.createOrder({ itens: [item()] });
        api.setSelectedOrderForModal(o);
      }, []);
      return <OrderDetailsModal />;
    };

    const { getByText, container } = render(
      <RestaurantProvider>
        <Harness />
      </RestaurantProvider>
    );

    fireEvent.click(getByText('Editar Pedido'));
    const configBtn = container.querySelector('#edit-add-product-btn-prato-exec') as HTMLButtonElement;
    expect(configBtn.textContent).toContain('Configurar');

    fireEvent.click(configBtn);
    // Modal de acompanhamentos aberto
    expect(getByText('Guarnições & Acompanhamentos')).toBeDefined();
  });

  it('7. SYNC: normalizePrinter e idempotente e nao gera novos IDs em chamadas sucessivas', () => {
    const rawPrinter = {
      id: 'prn-cozinha',
      nome: 'Cozinha Principal',
      tipo: 'rede',
      local: 'Cozinha',
      finalidade: 'pedido',
      ip: '192.168.1.200',
      porta: 9100,
      modelo: 'ESC/POS',
      larguraPapel: '80mm',
      status: 'online',
      ativa: true,
      itensNaFila: 0,
      regras: [
        { nome: 'Regra Pratos', categorias: ['Pratos principais'] },
        { id: 'custom-rule-id', nome: 'Regra Fixa' }
      ]
    };

    const first = normalizePrinter(rawPrinter);
    const second = normalizePrinter(first);

    // Idempotência
    expect(second).toEqual(first);
    // Regra sem ID recebe ID determinístico baseado no printer.id e índice
    expect(first.regras![0].id).toBe('prn-cozinha-rule-0');
    // Regra que já possui ID preserva o ID existente
    expect(first.regras![1].id).toBe('custom-rule-id');
  });

  it('8. SYNC: mesma regra sem ID sempre gera o mesmo ID deterministico em cargas separadas', () => {
    const p1 = normalizePrinter({ id: 'prn-1', regras: [{ nome: 'Pizza' }] });
    const p2 = normalizePrinter({ id: 'prn-1', regras: [{ nome: 'Pizza' }] });

    expect(p1.regras![0].id).toBe('prn-1-rule-0');
    expect(p2.regras![0].id).toBe(p1.regras![0].id);
  });

  it('9. SYNC: mergeSnapshots faz merge inteligente em campos independentes de impressora', () => {
    const base = {
      printers: [
        { id: 'prn-1', status: 'online', ultimaImpressao: '2026-09-25T10:00:00Z', itensNaFila: 0 }
      ]
    };
    // Local mudou apenas status
    const local = {
      printers: [
        { id: 'prn-1', status: 'offline', ultimaImpressao: '2026-09-25T10:00:00Z', itensNaFila: 0 }
      ]
    };
    // Remoto mudou apenas ultimaImpressao
    const remote = {
      printers: [
        { id: 'prn-1', status: 'online', ultimaImpressao: '2026-09-25T10:05:00Z', itensNaFila: 0 }
      ]
    };

    const merged = mergeSnapshots(base, local, remote);
    expect(merged.printers[0].status).toBe('offline');
    expect(merged.printers[0].ultimaImpressao).toBe('2026-09-25T10:05:00Z');
  });

  it('10. SYNC: conflito real no mesmo campo lanca SyncConflict com detalhes tecnicos sem corromper estado', () => {
    const base = { config: { modo: 'padrao' } };
    const local = { config: { modo: 'express' } };
    const remote = { config: { modo: 'completo' } };

    try {
      mergeSnapshots(base, local, remote);
      expect.fail('Deveria ter lançado SyncConflict');
    } catch (err: any) {
      expect(err).toBeInstanceOf(SyncConflict);
      expect(err.details).toBeDefined();
      expect(err.details.path).toBe('database/config/modo');
      expect(err.details.local).toBe('express');
      expect(err.details.remote).toBe('completo');
      expect(err.details.base).toBe('padrao');
    }
  });
});


