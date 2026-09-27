import React from 'react';
import { act, renderHook, render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { CashierView } from '../components/cashier/CashierView';
import { OrdersView } from '../components/orders/OrdersView';
import { TablesView } from '../components/tables/TablesView';
import { INITIAL_TABLES } from '../data/seedData';
import { DEFAULT_RESTAURANT_SETTINGS } from '../config/defaultSettings';
import { hashPassword } from '../lib/auth';
import { validarPendenciasFechamento, getPendingFinancialOrders, getPendingFinancialAccounts, nextTurnoId, liberarOcupacaoOperacional } from '../lib/turno';
import type { CartItem, MenuItem, Order, UserAccount } from '../types';

const key = 'pdv_database_v2';
const product: MenuItem = { id: 'qa-turno-product', nome: 'Prato Turno QA', preco: 20, categoria: 'Pratos principais', disponivel: true };

let passwordHashPromise: Promise<string> | null = null;
const QA_ADMIN: UserAccount = {
  id: 'usr-turno-admin', nome: 'Operador Turno QA', usuario: 'qa-turno', cargo: 'Administrador',
  perfil: 'administrador', ativo: true, isPrimaryAdmin: true,
  permissoes: ['pdv', 'pedidos', 'contas', 'mesas', 'caixa', 'cardapio', 'clientes', 'reservas', 'desconto', 'cancelamento', 'reabertura', 'auditoria', 'usuarios', 'impressoras', 'configuracoes'],
  senhaHash: 'pendente' as any,
};
passwordHashPromise = hashPassword('1234');

const seedDatabase = (extra: Record<string, unknown> = {}) => ({
  operationalDemoResetApplied: true,
  settings: { ...DEFAULT_RESTAURANT_SETTINGS, setupComplete: true },
  users: [QA_ADMIN],
  menu: [product],
  orders: [], accounts: [], alerts: [], printQueue: [],
  tables: INITIAL_TABLES.map(t => ({ ...t, status: 'livre', valorAtual: 0, pedidoAtivoId: undefined })),
  cashRegister: { aberto: false, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: [], turnosHistorico: [] },
  ...extra,
});

const wrapper = ({ children }: { children: React.ReactNode }) => <RestaurantProvider>{children}</RestaurantProvider>;
const boot = () => renderHook(() => useRestaurant(), { wrapper });
type API = ReturnType<typeof boot>['result'];

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  cartItemId: 'turno-line', menuItemId: product.id, nome: product.nome, precoUnitario: 20,
  quantidade: 1, observacao: '', estacaoProducao: 'cozinha', ...overrides
});

function attempt(fn: () => unknown) { try { fn(); } catch { /* rejeição permitida */ } }
function sale(api: API, overrides: Partial<Order> = {}) {
  let order!: Order;
  act(() => { order = api.current.createOrder({ itens: [item()], ...overrides }); });
  return order;
}
/** Cria pedido SEM o caixa (uso direto em seeds de teste, fora do ciclo de turno). */
const rawOrder = (id: string, numero: number, total: number, patch: Partial<Order> = {}): Order => ({
  id, operacaoId: `op-${id}`, numero, tipo: 'balcao', canal: 'Balcão',
  criadoEm: new Date().toISOString(), itens: [], subtotal: total, desconto: 0, taxaServico: 0,
  taxaEntrega: 0, total, status: 'novo', statusPagamento: 'pendente', pagamentos: [],
  valorTotalPago: 0, saldoRestante: total, ...patch
});

beforeEach(async () => {
  localStorage.clear();
  QA_ADMIN.senhaHash = await passwordHashPromise!;
  localStorage.setItem(key, JSON.stringify(seedDatabase()));
  localStorage.setItem('pdv_session_v1', JSON.stringify({ userId: QA_ADMIN.id, token: 'qa-token-turno', startedAt: new Date().toISOString() }));
});

describe('regras puras de turno (lib/turno)', () => {
  it('DOMÍNIO nextTurnoId é sequencial por dia e nunca repete', () => {
    const agora = new Date('2026-09-26T10:00:00');
    expect(nextTurnoId([], agora)).toBe('turno-20260926-001');
    expect(nextTurnoId([{ id: 'turno-20260926-001' } as any], agora)).toBe('turno-20260926-002');
    expect(nextTurnoId([{ id: 'turno-20260925-007' } as any], agora)).toBe('turno-20260926-001');
  });

  it('DOMÍNIO liberarOcupacaoOperacional preserva física/histórico e zera ocupação', () => {
    const tables = liberarOcupacaoOperacional([{
      ...INITIAL_TABLES[0], status: 'ocupada', contaAtualId: 'acc-1', contaAtualNumero: 2,
      sessaoAtivaId: 'acc-1', sessaoNumero: 2, clienteNome: 'Zé', abertaEm: 'x', valorAtual: 40,
      pessoasSentadas: 3, pedidoAtivoId: 'ord-1', ultimaContaId: 'acc-1', ultimaContaNumero: 2
    } as any]);
    const t = tables[0] as any;
    expect(t.status).toBe('livre');
    expect(t.contaAtualId).toBeUndefined();
    expect(t.sessaoAtivaId).toBeUndefined();
    expect(t.clienteNome).toBeUndefined();
    expect(t.valorAtual).toBe(0);
    expect(t.ultimaContaId).toBe('acc-1'); // histórico da mesa permanece
    expect(t.numero).toBe(INITIAL_TABLES[0].numero);
  });

  it('DOMÍNIO pedido pago (saldo 0) não é pendente; cancelado limpo não bloqueia; inconsistência bloqueia', () => {
    const orders = [
      rawOrder('a', 1, 40, { statusPagamento: 'pago', valorTotalPago: 40, saldoRestante: 0 }),
      rawOrder('b', 2, 30, { status: 'cancelado', cancelamento: { motivo: 'QA', usuario: 'x', dataHora: 'x' } }),
      rawOrder('c', 3, 20, { statusPagamento: 'pago', valorTotalPago: 0, saldoRestante: 20 }) // inconsistente
    ];
    const pendentes = getPendingFinancialOrders(orders);
    expect(pendentes.map(o => o.id)).toEqual(['c']);
    const conferencia = validarPendenciasFechamento(orders, [], []);
    expect(conferencia.temInconsistencia).toBe(true);
    expect(conferencia.inconsistencias[0].descricao).toContain('marcado como PAGO');
  });

  it('DOMÍNIO conta aberta com saldo é pendente mesmo com mesa livre (regra 21)', () => {
    const contas = getPendingFinancialAccounts([{ id: 'acc-1', numero: 2, status: 'aberta', total: 30, valorPago: 0, saldoRestante: 30 } as any]);
    expect(contas).toHaveLength(1);
    expect(getPendingFinancialAccounts([{ id: 'acc-2', numero: 3, status: 'paga', total: 30, valorPago: 30, saldoRestante: 0 } as any])).toHaveLength(0);
  });
});

describe('TESTE 1 e 2 — venda com caixa fechado/aberto', () => {
  it('T1 caixa fechado rejeita venda com "Abra o caixa antes de vender."', () => {
    const { result } = boot(); // seed inicia com caixa fechado
    let erro = '';
    act(() => { try { result.current.createOrder({ itens: [item()] }); } catch (e: any) { erro = e.message; } });
    expect(erro).toBe('Abra o caixa antes de vender.');
    expect(result.current.orders).toHaveLength(0);
  });

  it('T2 caixa aberto inicia turno e a venda é criada com turnoId', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(100));
    expect(result.current.cashRegister.aberto).toBe(true);
    expect(result.current.turnoAtualId).toBeDefined();
    const o = sale(result);
    expect(o.turnoId).toBe(result.current.turnoAtualId);
  });
});

describe('TESTE 3 e 4 — pedido pago e parcial na conferência', () => {
  it('T3 pedido quitado sai da fila e não bloqueia fechamento', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    expect(result.current.orders[0].saldoRestante).toBe(0);
    expect(result.current.getPendingFinancialOrders()).toHaveLength(0);
    act(() => result.current.closeCashRegister());
    expect(result.current.cashRegister.aberto).toBe(false);
  });

  it('T4 parcial (R$20 de R$40) bloqueia fechamento e é localizável', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const o = sale(result, { itens: [item({ precoUnitario: 40 })] });
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    expect(result.current.orders[0].saldoRestante).toBe(20);
    act(() => attempt(() => result.current.closeCashRegister()));
    // caixa continua aberto: fechamento bloqueado
    expect(result.current.cashRegister.aberto).toBe(true);
    const itens = result.current.validarPendenciasFechamento();
    expect(itens.some(p => p.tipo === 'pagamento_parcial' && p.descricao.includes(o.codigoExibicao))).toBe(true);
  });
});

describe('TESTE 5 a 8 — contas pendentes e mesas', () => {
  it('T5 conta aberta com saldo bloqueia fechamento', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => result.current.openTableWithOrder(2, 'Cliente'));
    sale(result, { tipo: 'mesa', mesaNumero: 2 });
    act(() => attempt(() => result.current.closeCashRegister()));
    expect(result.current.cashRegister.aberto).toBe(true);
    expect(result.current.getPendingFinancialAccounts().map(a => a.saldoRestante)).toEqual([20]);
  });

  it('T6 mesa livre com conta pendente: conta aparece mesmo com mesa liberada', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => result.current.openTableWithOrder(6, 'Cliente Mesa 6'));
    const o = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ precoUnitario: 30 })] });
    act(() => result.current.generateOrderMirror(o.id)); // espelho libera a MESA
    expect(result.current.tables.find(t => t.numero === 6)?.status).toBe('livre');
    const pendentes = result.current.getPendingFinancialAccounts();
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].saldoRestante).toBe(30);
    act(() => attempt(() => result.current.closeCashRegister()));
    expect(result.current.cashRegister.aberto).toBe(true);
  });

  it('T7 duas contas na mesma mesa em momentos diferentes nunca se misturam', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => result.current.openTableWithOrder(6));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ precoUnitario: 30 })] });
    act(() => result.current.generateOrderMirror(a.id)); // mesa livre, Conta 0 com R$30
    act(() => result.current.openTableWithOrder(6));
    const conta1 = result.current.accounts.find(acc => acc.numero === 1)!;
    const b = sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: conta1.id, itens: [item({ precoUnitario: 20 })] });
    act(() => result.current.generateOrderMirror(b.id)); // mesa livre, Conta 1 com R$20
    const conferencia = result.current.conferenciaFechamento();
    const descricoes = conferencia.itens.map(p => p.descricao).join(' | ');
    expect(descricoes).toContain('Conta 0');
    expect(descricoes).toContain('Conta 1');
    expect(conferencia.totalPendente).toBe(50);
  });

  it('T8 conta paga não é listada; só a pendente aparece', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => result.current.openTableWithOrder(1));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ precoUnitario: 30 })] });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => result.current.openTableWithOrder(2));
    const b = sale(result, { tipo: 'balcao', itens: [item({ precoUnitario: 20 })] });
    act(() => result.current.payAccount(b.contaId!, 'pix'));
    const pendentes = result.current.getPendingFinancialAccounts();
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].id).toBe(a.contaId);
  });
});

describe('TESTE 9 e 10 — cancelamento e inconsistência', () => {
  it('T9 pedido cancelado corretamente não bloqueia o fechamento', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const o = sale(result);
    act(() => result.current.cancelOrder(o.id, 'Cliente desistiu'));
    expect(result.current.getPendingFinancialOrders()).toHaveLength(0);
    // Estado derivado após cancelamento puro (sem pagamento): a conferência
    // deve enxergar o estado real — se a conta mantiver saldo derivado do
    // lançamento cancelado, o teste falha e expõe o problema.
    const conferencia = result.current.conferenciaFechamento();
    // eslint-disable-next-line no-console
    console.log('DBG-T9', JSON.stringify({
      contas: result.current.accounts.map(a => ({ n: a.numero, status: a.status, saldo: a.saldoRestante })),
      pedidos: result.current.orders.map(x => ({ id: x.id, st: x.status, saldo: x.saldoRestante, pg: x.statusPagamento })),
      itens: conferencia.itens.map(p => p.descricao)
    }));
    expect(conferencia.limpo).toBe(true);
    act(() => result.current.closeCashRegister());
    expect(result.current.cashRegister.aberto).toBe(false);
  });

  it('T10 status pago com saldo > 0 é inconsistência e o caixa não fecha', () => {
    // O estado corrompido é criado diretamente no store: o sistema normal não
    // o produz. openCashRegister é impedido pela regra 14; aqui testamos o
    // fechamento e a conferência com o turno já aberto no seed.
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      orders: [rawOrder('corrompido', 1, 40, { statusPagamento: 'pago', saldoRestante: 40 })],
      cashRegister: { aberto: true, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: [], turnoAtual: { id: 'turno-20260926-001', caixaId: 'csh-current', status: 'aberto', operadorAbertura: 'Operador Turno QA', abertoEm: new Date().toISOString(), saldoInicial: 0, transacoesIds: [] } }
    })));
    const { result } = boot();
    expect(result.current.turnoAtualId).toBe('turno-20260926-001');
    const conferencia = result.current.conferenciaFechamento();
    expect(conferencia.temInconsistencia).toBe(true);
    expect(conferencia.inconsistencias[0].severidade).toBe('bloqueio');
    act(() => attempt(() => result.current.closeCashRegister()));
    expect(result.current.cashRegister.aberto).toBe(true);
  });
});

describe('TESTE 11 — suprimento/sangria removidos, legado preservado', () => {
  it('T11a addCashMovement rejeita suprimento/sangria; UI não tem botões', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => attempt(() => result.current.addCashMovement('suprimento' as any, 50, 'QA')));
    act(() => attempt(() => result.current.addCashMovement('sangria' as any, 30, 'QA')));
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(0);
    expect(result.current.cashRegister.transacoes).toHaveLength(1); // só abertura

    const view = render(<RestaurantProvider><CashierView /></RestaurantProvider>);
    expect(view.container.querySelector('#cashier-suprimento-btn')).toBeNull();
    expect(view.container.querySelector('#cashier-sangria-btn')).toBeNull();
  });

  it('T11b registros legados de suprimento/sangria continuam legíveis', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      cashRegister: { aberto: false, saldoInicial: 0, saldoAtualGaveta: 80, turnosHistorico: [], transacoes: [
        { id: 'leg-1', tipo: 'suprimento', valor: 100, motivo: 'antigo', horario: new Date().toISOString(), operador: 'QA' },
        { id: 'leg-2', tipo: 'sangria', valor: 20, motivo: 'antigo', horario: new Date().toISOString(), operador: 'QA' }
      ] }
    })));
    const { result } = boot();
    expect(result.current.cashRegister.transacoes.filter(t => t.tipo === 'suprimento' || t.tipo === 'sangria')).toHaveLength(2);
    const view = render(<RestaurantProvider><CashierView /></RestaurantProvider>);
    expect(view.container.textContent).toContain('legado');
  });
});

describe('TESTE 12 e 13 — isolamento de turnos', () => {
  it('T12 novo turno: Central vazia, numeração global continua (0.4) e histórico intacto', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const turno1 = result.current.turnoAtualId;
    const a = sale(result);
    const b = sale(result);
    const c = sale(result);
    expect([a, b, c].map(o => o.codigoExibicao)).toEqual(['0.1', '0.2', '0.3']);
    // quita tudo
    for (const o of [a, b, c]) act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    act(() => result.current.closeCashRegister());
    expect(result.current.cashRegister.aberto).toBe(false);
    // novo turno
    act(() => result.current.openCashRegister(0));
    const turno2 = result.current.turnoAtualId;
    expect(turno2).toBeDefined();
    expect(turno2).not.toBe(turno1);
    // Central do turno 2: vazia
    expect(result.current.getPendingFinancialOrders().filter(o => o.turnoId === turno2)).toHaveLength(0);
    // histórico preservado
    expect(result.current.orders.map(o => o.codigoExibicao)).toEqual(expect.arrayContaining(['0.1', '0.2', '0.3']));
    // novo pedido continua a numeração global
    const d = sale(result);
    expect(d.codigoExibicao).toBe('0.4');
    expect(d.turnoId).toBe(turno2);
    expect(result.current.orders.find(o => o.id === a.id)!.turnoId).toBe(turno1);
  });

  it('T13 novo turno inicia com todas as mesas livres e sem estado operacional', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => result.current.openTableWithOrder(6, 'Cliente Antigo'));
    sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ precoUnitario: 20 })] });
    act(() => result.current.openTableWithOrder(7, 'Outro'));
    sale(result, { tipo: 'mesa', mesaNumero: 7 });
    // Quita as duas contas pelo fluxo correto (baixa da conta libera a mesa).
    for (const conta of result.current.accounts.filter(a => a.status === 'aberta')) {
      act(() => result.current.payAccount(conta.id, 'pix'));
    }
    expect(result.current.tables.find(t => t.numero === 6)?.status).toBe('livre');
    expect(result.current.tables.find(t => t.numero === 7)?.status).toBe('livre');
    act(() => result.current.closeCashRegister());
    act(() => result.current.openCashRegister(0));
    const mesa6 = result.current.tables.find(t => t.numero === 6)!;
    const mesa7 = result.current.tables.find(t => t.numero === 7)!;
    for (const mesa of [mesa6, mesa7]) {
      expect(mesa.status).toBe('livre');
      expect(mesa.contaAtualId).toBeUndefined();
      expect(mesa.contaAtualNumero).toBeUndefined();
      expect(mesa.pedidoAtivoId).toBeUndefined();
      expect(mesa.sessaoAtivaId).toBeUndefined();
      expect(mesa.clienteNome).toBeUndefined();
      expect(mesa.valorAtual).toBe(0);
      expect(mesa.pessoasSentadas).toBeUndefined();
    }
    expect(result.current.orders).toHaveLength(2); // histórico intacto
  });
});

describe('TESTE 14 e 15 — histórico e fila de impressão', () => {
  it('T14 histórico de pedidos/pagamentos/auditoria/contas preservado após novo turno', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const o = sale(result);
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    const auditoriaAntes = result.current.auditLogs.length;
    act(() => result.current.closeCashRegister());
    act(() => result.current.openCashRegister(0));
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].pagamentos).toHaveLength(1);
    expect(result.current.accounts.length).toBe(1);
    expect(result.current.accounts[0].status).toBe('paga');
    expect(result.current.auditLogs.length).toBeGreaterThanOrEqual(auditoriaAntes);
  });

  it('T15 fila operacional de impressão é limpa; histórico de impressão do pedido permanece', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    const o = sale(result);
    expect(result.current.printQueue.length).toBeGreaterThan(0);
    act(() => result.current.addManualPaymentToOrder(o.id, 'pix', 20));
    act(() => result.current.closeCashRegister());
    act(() => result.current.openCashRegister(0));
    expect(result.current.printQueue).toHaveLength(0);
    expect(result.current.orders.find(x => x.id === o.id)!.impressoes!.length).toBeGreaterThan(0);
  });
});

describe('TESTE 16 e 17 — dupla abertura e duplo fechamento', () => {
  it('T16 caixa aberto não cria segundo turno', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(100));
    const turno1 = result.current.turnoAtualId;
    const gaveta = result.current.cashRegister.saldoAtualGaveta;
    act(() => attempt(() => result.current.openCashRegister(500)));
    expect(result.current.turnoAtualId).toBe(turno1);
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(gaveta);
    expect(result.current.cashRegister.turnosHistorico).toHaveLength(0);
  });

  it('T17 fechamento duplo não executa duas vezes', () => {
    const { result } = boot();
    act(() => result.current.openCashRegister(0));
    act(() => result.current.closeCashRegister());
    const transacoes = result.current.cashRegister.transacoes.length;
    const historico = result.current.cashRegister.turnosHistorico.length;
    act(() => result.current.closeCashRegister());
    expect(result.current.cashRegister.transacoes).toHaveLength(transacoes);
    expect(result.current.cashRegister.turnosHistorico).toHaveLength(historico);
    expect(result.current.cashRegister.aberto).toBe(false);
  });
});

describe('proteção contra pendências herdadas (regra 14) e UI', () => {
  it('não abre novo turno com conta pendente herdada do turno anterior', () => {
    // Simula turno encerrado de forma forçada com conta aberta em aberto.
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      orders: [rawOrder('herdado', 1, 30, { turnoId: 'turno-20260925-001' })],
      accounts: [{ id: 'acc-herdada', numero: 2, tipo: 'balcao', status: 'aberta', abertaEm: new Date().toISOString(), total: 30, valorPago: 0, saldoRestante: 30, origem: 'balcao' }]
    })));
    const { result } = boot();
    let erro = '';
    act(() => { try { result.current.openCashRegister(0); } catch (e: any) { erro = e.message; } });
    expect(erro).toContain('pendências do turno anterior');
    expect(result.current.cashRegister.aberto).toBe(false);
  });

  it('UI do fechamento bloqueia com pendência e libera quando conferido', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <CashierView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
    act(() => api.openCashRegister(0));
    const o = sale({ current: api } as API);
    // Pendência: botão final bloqueado
    fireEvent.click(view.container.querySelector('#cashier-close-shift-btn')!);
    expect(view.container.querySelector('#confirm-close-cashier-final-btn')!.hasAttribute('disabled')).toBe(true);
    expect(view.container.textContent).toContain('FECHAMENTO NÃO CONFERIDO');
    expect(view.container.querySelector('#conferencia-ver-central-btn')).not.toBeNull();
    expect(view.container.querySelector('#conferencia-ver-contas-btn')).not.toBeNull();
    // Fecha o modal, paga e reconferir
    act(() => api.closePaymentModal());
    act(() => api.addManualPaymentToOrder(o.id, 'pix', 20));
    fireEvent.click(view.container.querySelector('#cashier-close-shift-btn')!);
    expect(view.container.textContent).toContain('Conferência concluída. Nenhum pedido ou conta pendente.');
    const btn = view.container.querySelector('#confirm-close-cashier-final-btn') as HTMLButtonElement;
    expect(btn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(btn);
    expect(api.cashRegister.aberto).toBe(false);
  });

  it('Central de Pedidos com caixa fechado mostra aviso e vazio; aberto mostra fila do turno', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <OrdersView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
    expect(view.container.textContent).toContain('Abra o caixa antes de vender.');
    act(() => api.openCashRegister(0));
    const o = sale({ current: api } as API);
    expect(view.container.textContent).toContain(o.codigoExibicao!);
    // Quita o pedido: sai da fila operacional
    act(() => api.addManualPaymentToOrder(o.id, 'pix', 20));
    expect(view.container.textContent).not.toContain(o.codigoExibicao!);
  });

  it('Mapa de Mesas com caixa fechado exibe aviso de operação suspensa', () => {
    const view = render(<RestaurantProvider><TablesView /></RestaurantProvider>);
    expect(view.container.textContent).toContain('Caixa fechado');
    expect(view.container.textContent).toContain('Abra o caixa para operar o salão');
  });
});
