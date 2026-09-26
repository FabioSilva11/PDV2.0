import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { INITIAL_TABLES } from '../data/seedData';
import { DEFAULT_RESTAURANT_SETTINGS } from '../config/defaultSettings';
import { hashPassword } from '../lib/auth';
import type { CartItem, MenuItem, Order, UserAccount } from '../types';

const key = 'pdv_database_v2';
const product: MenuItem = { id: 'acc-product', nome: 'Prato QA', preco: 20, categoria: 'Pratos principais', disponivel: true };
const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  cartItemId: 'acc-line', menuItemId: product.id, nome: product.nome, precoUnitario: 20,
  quantidade: 1, observacao: '', estacaoProducao: 'cozinha', ...overrides
});

let passwordHashPromise: Promise<string> | null = null;
const QA_ADMIN: UserAccount = {
  id: 'usr-acc-admin', nome: 'Operador QA', usuario: 'qa', cargo: 'Administrador',
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
  cashRegister: { aberto: true, saldoInicial: 200, saldoAtualGaveta: 200, transacoes: [] },
  ...extra,
});

const wrapper = ({ children }: { children: React.ReactNode }) => <RestaurantProvider>{children}</RestaurantProvider>;
const boot = () => renderHook(() => useRestaurant(), { wrapper });
type API = ReturnType<typeof boot>['result'];

function attempt(fn: () => unknown) { try { fn(); } catch { /* rejeição é permitida; verificar o estado em seguida */ } }
function sale(api: API, overrides: Partial<Order> = {}) {
  let order!: Order;
  act(() => { order = api.current.createOrder({ itens: [item()], ...overrides }); });
  return order;
}
const tableOf = (api: API, numero: number) => api.current.tables.find(t => t.numero === numero)!;
const accountOf = (api: API, id: string) => api.current.accounts.find(a => a.id === id)!;

beforeEach(async () => {
  localStorage.clear();
  QA_ADMIN.senhaHash = await passwordHashPromise!;
  localStorage.setItem(key, JSON.stringify(seedDatabase()));
  localStorage.setItem('pdv_session_v1', JSON.stringify({ userId: QA_ADMIN.id, token: 'qa-token-test', startedAt: new Date().toISOString() }));
});

describe('conta: numeração comercial independente da mesa', () => {
  it('CONTA primeira conta do PDV é a número 0', () => {
    const { result } = boot();
    const a = sale(result, { tipo: 'balcao' });
    expect(a.contaNumero).toBe(0);
    expect(a.sequencia).toBe(1);
    expect(a.codigoExibicao).toBe('0.1');
  });

  it('CONTA cada novo atendimento recebe o próximo número de conta', () => {
    const { result } = boot();
    const first = sale(result, { tipo: 'balcao' });
    const second = sale(result, { tipo: 'balcao' });
    const third = sale(result, { tipo: 'balcao' });
    expect([first.contaNumero, second.contaNumero, third.contaNumero]).toEqual([0, 1, 2]);
  });

  it('CONTA número da mesa nunca vira número da conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(7, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 7 });
    expect(a.contaNumero).toBe(0);
    expect(a.mesaNumero).toBe(7);
    expect(a.codigoExibicao).toBe('0.1');
  });

  it('CONTA sequência nunca reinicia dentro da mesma conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(3));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.generateOrderMirror(a.id));
    const b = sale(result, { tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'b' })] });
    const c = sale(result, { tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'c' })] });
    expect([a.sequencia, b.sequencia, c.sequencia]).toEqual([1, 2, 3]);
  });

  it('CONTA total e saldo da conta são a soma dos lançamentos válidos', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(2));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'a' })] });
    const b = sale(result, { tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'b', quantidade: 2 })] });
    const account = accountOf(result, a.contaId!);
    expect(account.total).toBe(60);
    expect(account.saldoRestante).toBe(60);
    act(() => result.current.cancelOrder(a.id, 'QA'));
    expect(accountOf(result, a.contaId!).total).toBe(40);
    expect(result.current.orders.find(o => o.id === b.id)!.contaId).toBe(a.contaId);
  });
});

describe('conta: espelho libera a mesa sem pagar nem encerrar', () => {
  it('ESPELHO libera a mesa e mantém conta aberta com saldo', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.generateOrderMirror(a.id));
    const table = tableOf(result, 1);
    const account = accountOf(result, a.contaId!);
    expect(table.status).toBe('livre');
    expect(table.contaAtualId).toBeUndefined();
    expect(account.status).toBe('aberta');
    expect(account.saldoRestante).toBe(20);
    expect(account.encerradaEm).toBeUndefined();
  });

  it('ESPELHO registra a conta anterior no histórico da mesa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.generateOrderMirror(a.id));
    const table = tableOf(result, 1);
    expect(table.ultimaContaId).toBe(a.contaId);
    expect(table.ultimaContaNumero).toBe(0);
  });

  it('ESPELHO de lançamento intermediário NÃO libera a mesa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'a' })] });
    const b = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.generateOrderMirror(a.id));
    expect(tableOf(result, 1).status).toBe('ocupada');
    act(() => result.current.generateOrderMirror(b.id));
    expect(tableOf(result, 1).status).toBe('livre');
  });

  it('ESPELHO não gera pagamento nem movimenta o caixa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.generateOrderMirror(a.id));
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(200);
    expect(result.current.orders.find(o => o.id === a.id)!.pagamentos).toHaveLength(0);
    expect(result.current.orders.find(o => o.id === a.id)!.statusPagamento).toBe('pendente');
  });
});

describe('conta: pagamento isolado por conta', () => {
  it('PAG baixa a conta e quita os lançamentos na ordem da sequência', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(4));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 4, itens: [item({ cartItemId: 'a' })] });
    const b = sale(result, { tipo: 'mesa', mesaNumero: 4, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 40, 50));
    const account = accountOf(result, a.contaId!);
    expect(account.valorPago).toBe(40);
    expect(account.saldoRestante).toBe(0);
    expect(account.status).toBe('paga');
    expect(result.current.orders.find(o => o.id === a.id)!.statusPagamento).toBe('pago');
    expect(result.current.orders.find(o => o.id === b.id)!.statusPagamento).toBe('pago');
    expect(result.current.cashRegister.saldoAtualGaveta).toBe(240);
  });

  it('PAG de conta antiga NÃO altera a mesa da conta que está lá', () => {
    const { result } = boot();
    // Conta 0 na Mesa 1: espelhada, mesa liberada, saldo em aberto.
    act(() => result.current.openTableWithOrder(1, 'Antigo'));
    const antigo = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'a1' })] });
    act(() => result.current.generateOrderMirror(antigo.id));
    // Conta 1 ocupa a Mesa 1 agora. Há 2 contas abertas na Mesa 1, então o
    // lançamento informa a conta explicitamente (o PDV mostra o seletor).
    act(() => result.current.openTableWithOrder(1, 'Atual'));
    const contaAtual = result.current.accounts.find(a => a.numero === 1)!;
    const atual = sale(result, { tipo: 'mesa', mesaNumero: 1, contaId: contaAtual.id, itens: [item({ cartItemId: 'b1' })] });
    const table = tableOf(result, 1);
    expect(table.contaAtualId).toBe(atual.contaId);
    expect(table.contaAtualNumero).toBe(1);

    // Quitar a conta antiga não podevasive a mesa da conta atual.
    act(() => result.current.payAccount(antigo.contaId!, 'pix', 20));
    const after = tableOf(result, 1);
    expect(after.contaAtualId).toBe(atual.contaId);
    expect(after.contaAtualNumero).toBe(1);
    expect(after.status).toBe('ocupada');
    expect(after.valorAtual).toBe(20);
    expect(accountOf(result, atual.contaId!).status).toBe('aberta');
  });

  it('PAG parcial mantém a conta aberta e a mesa ocupada', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(5));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 5, itens: [item({ cartItemId: 'a', quantidade: 3 })] });
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 20, 20));
    const account = accountOf(result, a.contaId!);
    expect(account.saldoRestante).toBe(40);
    expect(account.status).toBe('aberta');
    expect(tableOf(result, 5).status).toBe('ocupada');
  });

  it('PAG de conta encerrada é rejeitado', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 20, 20));
    act(() => result.current.closeAccount(a.contaId!));
    act(() => attempt(() => result.current.payAccount(a.contaId!, 'pix', 20)));
    expect(accountOf(result, a.contaId!).status).toBe('encerrada');
  });

  it('PAG distribui nos lançamentos mais antigos primeiro', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(8));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 8, itens: [item({ cartItemId: 'a', quantidade: 2 })] });
    const b = sale(result, { tipo: 'mesa', mesaNumero: 8, itens: [item({ cartItemId: 'b', quantidade: 2 })] });
    act(() => result.current.payAccount(a.contaId!, 'pix', 20));
    // Os 20 reais baixam apenas o lançamento 0.1; o 0.2 continua em aberto.
    expect(result.current.orders.find(o => o.id === a.id)!.saldoRestante).toBe(20);
    expect(result.current.orders.find(o => o.id === b.id)!.saldoRestante).toBe(40);
    expect(accountOf(result, a.contaId!).saldoRestante).toBe(60);
  });
});

describe('conta: encerramento é etapa separada do pagamento', () => {
  it('ENC conta quitada encerra, libera a mesa e registra autor', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 20, 20));
    act(() => result.current.closeAccount(a.contaId!, 'Atendimento concluído'));
    const account = accountOf(result, a.contaId!);
    expect(account.status).toBe('encerrada');
    expect(account.encerradaEm).toBeTruthy();
    expect(account.encerramento?.usuario).toBe('Operador QA');
    expect(account.encerramento?.motivo).toBe('Atendimento concluído');
    expect(tableOf(result, 1).status).toBe('livre');
  });

  it('ENC conta com saldo em aberto não pode encerrar', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => attempt(() => result.current.closeAccount(a.contaId!)));
    expect(accountOf(result, a.contaId!).status).toBe('aberta');
  });

  it('ENC conta encerrada não aceita novos lançamentos', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 20, 20));
    act(() => result.current.closeAccount(a.contaId!));
    act(() => attempt(() => result.current.addOrderToAccount(a.contaId!, { itens: [item()] })));
    expect(result.current.orders.filter(o => o.contaId === a.contaId)).toHaveLength(1);
  });

  it('ENC liberar mesa manualmente não paga nem encerra a conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.freeTableManually(1));
    const account = accountOf(result, a.contaId!);
    const table = tableOf(result, 1);
    expect(table.status).toBe('livre');
    expect(table.contaAtualId).toBeUndefined();
    expect(account.status).toBe('aberta');
    expect(account.saldoRestante).toBe(20);
    expect(result.current.orders).toHaveLength(1);
  });
});

describe('conta: liberação de mesa nunca consulta outra conta pelo número', () => {
  it('OCUP duas contas antigas na mesma mesa não se misturam na liberação', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(2, 'Primeiro'));
    const first = sale(result, { tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.payAccount(first.contaId!, 'dinheiro', 20, 20));
    act(() => result.current.closeAccount(first.contaId!));
    act(() => result.current.openTableWithOrder(2, 'Segundo'));
    const second = sale(result, { tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.settleTableAccount(2, 'pix', 20));
    const table = tableOf(result, 2);
    expect(table.status).toBe('livre');
    expect(accountOf(result, first.contaId!).status).toBe('encerrada');
    expect(accountOf(result, second.contaId!).status).toBe('paga');
    expect(result.current.orders).toHaveLength(2);
  });

  it('OCUP espelho de conta antiga não ocupa mesa de outra conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(3, 'Antigo'));
    const antigo = sale(result, { tipo: 'mesa', mesaNumero: 3, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.freeTableManually(3));
    act(() => result.current.openTableWithOrder(3, 'Atual'));
    const contaAtual = result.current.accounts.find(a => a.numero === 1)!;
    const atual = sale(result, { tipo: 'mesa', mesaNumero: 3, contaId: contaAtual.id, itens: [item({ cartItemId: 'b' })] });
    // Reabrir/cancelar o lançamento antigo não pode roubar a mesa.
    act(() => result.current.reopenOrder(antigo.id, 'QA'));
    expect(tableOf(result, 3).contaAtualId).toBe(atual.contaId);
  });
});

describe('conta: transferência, divisão e unificação', () => {
  it('TRANS move a conta e os lançamentos, preservando número e sequência', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.transferAccount(a.contaId!, 2));
    const account = accountOf(result, a.contaId!);
    expect(account.mesaAtualNumero).toBe(2);
    expect(account.mesaOriginalNumero).toBe(1);
    expect(tableOf(result, 2).contaAtualId).toBe(a.contaId);
    expect(tableOf(result, 1).status).toBe('livre');
    expect(result.current.orders.find(o => o.id === a.id)!.contaId).toBe(a.contaId);
    expect(result.current.orders.find(o => o.id === a.id)!.codigoExibicao).toBe('0.1');
  });

  it('TRANS para mesa ocupada por outra conta é rejeitado', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'A'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.openTableWithOrder(2, 'B'));
    const b = sale(result, { tipo: 'mesa', mesaNumero: 2 });
    act(() => attempt(() => result.current.transferAccount(a.contaId!, 2)));
    expect(accountOf(result, a.contaId!).mesaAtualNumero).toBe(1);
    expect(tableOf(result, 2).contaAtualId).toBe(b.contaId);
  });

  it('DIVIDE move os itens escolhidos para uma nova conta filha sem apagar origem', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Família'));
    const a = sale(result, {
      tipo: 'mesa', mesaNumero: 1,
      itens: [item({ cartItemId: 'i1' }), item({ cartItemId: 'i2' }), item({ cartItemId: 'i3' })]
    });
    let split!: { contaNovaId: string; contaNovaNumero: number; lancamentosNovos: string[] };
    act(() => { split = result.current.splitAccount({ contaId: a.contaId!, itemIds: ['i3'] }); });
    expect(split.contaNovaNumero).toBe(1);
    expect(result.current.accounts).toHaveLength(2);
    // Nada é apagado: a origem continua com 2 itens e existe um novo lançamento.
    expect(result.current.orders.find(o => o.id === a.id)!.itens).toHaveLength(2);
    expect(result.current.orders.filter(o => o.contaId === split.contaNovaId)).toHaveLength(1);
    const child = accountOf(result, split.contaNovaId);
    expect(child.contaPaiId).toBe(a.contaId);
    expect(child.origem).toBe('split');
    expect(result.current.orders.find(o => o.contaId === split.contaNovaId)!.sequencia).toBe(1);
  });

  it('DIVIDE todos os itens é rejeitado para não apagar a conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'i1' })] });
    act(() => attempt(() => result.current.splitAccount({ contaId: a.contaId!, itemIds: ['i1'] })));
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.orders).toHaveLength(1);
  });

  it('DIVIDE mantém a mesa ocupada pela conta original, não pela filha', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Família'));
    const a = sale(result, {
      tipo: 'mesa', mesaNumero: 1,
      itens: [item({ cartItemId: 'i1' }), item({ cartItemId: 'i2' })]
    });
    let split!: { contaNovaId: string };
    act(() => { split = result.current.splitAccount({ contaId: a.contaId!, itemIds: ['i2'] }); });
    expect(tableOf(result, 1).contaAtualId).toBe(a.contaId);
    expect(accountOf(result, split.contaNovaId).mesaAtualNumero).toBeUndefined();
  });

  it('UNIFICA une lançamentos e encerra a conta de origem com registro', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'A'));
    const first = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.openTableWithOrder(2, 'B'));
    const second = sale(result, { tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.mergeAccounts(second.contaId!, first.contaId!));
    // Nenhum pedido é apagado; os dois lançamentos passaram para a conta 0.
    expect(result.current.orders).toHaveLength(2);
    expect(result.current.orders.every(o => o.contaId === first.contaId)).toBe(true);
    expect(accountOf(result, second.contaId!).status).toBe('encerrada');
    expect(accountOf(result, second.contaId!).encerramento?.motivo).toContain('Unificada');
    expect(accountOf(result, first.contaId!).total).toBe(40);
    // A mesa de origem é liberada; o destino continua na sua mesa.
    expect(tableOf(result, 2).status).toBe('livre');
    expect(tableOf(result, 1).contaAtualId).toBe(first.contaId);
  });

  it('UNIFICA continua a sequência da conta de destino sem colidir', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'A'));
    const first = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.openTableWithOrder(2, 'B'));
    const second = sale(result, { tipo: 'mesa', mesaNumero: 2, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.mergeAccounts(second.contaId!, first.contaId!));
    const codes = result.current.orders.map(o => o.codigoExibicao).sort();
    expect(codes).toEqual(['0.1', '0.2']);
  });
});

describe('conta: busca de checks', () => {
  it('BUSCA filtra por número da conta, mesa, cliente e saldo', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Ana'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 20, 20));
    const b = sale(result, { tipo: 'balcao', nomeCliente: 'Bruno' });
    expect(result.current.searchAccounts({ contaNumero: 0 }).map(x => x.id)).toEqual([a.contaId]);
    expect(result.current.searchAccounts({ contaNumero: 1 }).map(x => x.id)).toEqual([b.contaId]);
    expect(result.current.searchAccounts({ texto: 'Bruno' }).map(x => x.id)).toEqual([b.contaId]);
    expect(result.current.searchAccounts({ mesaNumero: 1 }).map(x => x.id)).toEqual([a.contaId]);
    expect(result.current.searchAccounts({ somenteComSaldo: true }).map(x => x.id)).toEqual([b.contaId]);
    expect(result.current.searchAccounts({ status: 'paga' }).map(x => x.id)).toEqual([a.contaId]);
    expect(result.current.searchAccounts({ sequencia: 1 }).length).toBe(2);
  });
});

describe('migração de dados legados', () => {
  const legacyOrder = (over: Record<string, unknown>) => ({
    id: 'legacy-a', operacaoId: 'op-a', numero: 900, tipo: 'mesa', status: 'pronto',
    statusPagamento: 'pendente', criadoEm: new Date().toISOString(), mesaNumero: 1,
    mesaSessaoId: 'sessao-antiga', mesaSessaoNumero: 3, mesaPedidoSequencia: 0,
    codigoMesa: '3.0', clienteNome: 'Cliente Antigo', itens: [item()],
    subtotal: 20, desconto: 0, taxaServico: 0, taxaEntrega: 0, total: 20,
    valorTotalPago: 0, saldoRestante: 20, pagamentos: [], impressoes: [], ...over
  });

  it('MIGRA pedidos de mesa legados viram contas preservando número e sequência', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      orders: [legacyOrder({}), legacyOrder({ id: 'legacy-b', mesaPedidoSequencia: 1, codigoMesa: '3.1', status: 'novo' })]
    })));
    const { result } = boot();
    expect(result.current.accounts).toHaveLength(1);
    const account = result.current.accounts[0];
    expect(account.mesaOriginalNumero).toBe(1);
    expect(account.status).toBe('aberta');
    expect(account.total).toBe(40);
    const codes = result.current.orders.map(o => o.codigoExibicao).sort();
    expect(codes).toEqual(['3.0', '3.1']);
    expect(result.current.orders.every(o => o.contaId === account.id)).toBe(true);
  });

  it('MIGRA mantém os campos legados preenchidos como alias', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ orders: [legacyOrder({})] })));
    const { result } = boot();
    const order = result.current.orders[0];
    expect(order.mesaSessaoId).toBe('sessao-antiga');
    expect(order.mesaSessaoNumero).toBe(3);
    expect(order.codigoMesa).toBe('3.0');
    expect(order.contaId).toBeTruthy();
  });

  it('MIGRA é idempotente: recarregar não cria contas duplicadas', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ orders: [legacyOrder({})] })));
    const first = boot();
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const again = renderHook(() => useRestaurant(), { wrapper });
    expect(again.result.current.accounts).toHaveLength(first.result.current.accounts.length);
    expect(again.result.current.orders[0].contaId).toBe(first.result.current.orders[0].contaId);
    expect(snapshot.orders).toBeDefined();
  });

  it('MIGRA pedidos de balcão viram contas independentes', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      orders: [
        legacyOrder({ id: 'bal-1', tipo: 'balcao', mesaNumero: undefined, mesaSessaoId: undefined, mesaSessaoNumero: undefined, mesaPedidoSequencia: undefined, codigoMesa: undefined }),
        legacyOrder({ id: 'bal-2', tipo: 'balcao', mesaNumero: undefined, mesaSessaoId: undefined, mesaSessaoNumero: undefined, mesaPedidoSequencia: undefined, codigoMesa: undefined })
      ]
    })));
    const { result } = boot();
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts.every(a => a.mesaAtualNumero === undefined)).toBe(true);
  });

  it('MIGRA liga a mesa pela sessão legada quando a mesa aponta para a conta', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      orders: [legacyOrder({})],
      tables: INITIAL_TABLES.map(t => t.numero === 1
        ? { ...t, status: 'ocupada', sessaoAtivaId: 'sessao-antiga', sessaoNumero: 3, clienteNome: 'Cliente Antigo' }
        : { ...t, status: 'livre', valorAtual: 0, pedidoAtivoId: undefined })
    })));
    const { result } = boot();
    const account = result.current.accounts[0];
    const table = tableOf(result, 1);
    expect(table.contaAtualId).toBe(account.id);
    expect(table.contaAtualNumero).toBe(3);
    expect(table.status).toBe('ocupada');
    expect(table.valorAtual).toBe(20);
    expect(table.ultimaContaNumero).toBe(3);
  });

  it('MIGRA sem vínculo de sessão deixa a mesa livre mas a conta continua em aberto', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ orders: [legacyOrder({})] })));
    const { result } = boot();
    const account = result.current.accounts[0];
    const table = tableOf(result, 1);
    expect(table.status).toBe('livre');
    expect(table.contaAtualId).toBeUndefined();
    // A conta NÃO é perdida: segue aberta, com saldo e linked à mesa original.
    expect(account.status).toBe('aberta');
    expect(account.saldoRestante).toBe(20);
    expect(account.mesaOriginalNumero).toBe(1);
    expect(table.ultimaContaId).toBe(account.id);
    expect(result.current.searchAccounts({ mesaNumero: 1 })).toHaveLength(1);
  });

  it('MIGRA não reocupa a mesa liberada pelo espelho ao recarregar', () => {
    const first = boot();
    act(() => first.result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(first.result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => first.result.current.generateOrderMirror(a.id));
    const stored = JSON.parse(localStorage.getItem(key)!);
    stored.accounts = first.result.current.accounts;
    stored.tables = first.result.current.tables;
    localStorage.setItem(key, JSON.stringify(stored));
    const { result } = boot();
    expect(tableOf(result, 1).status).toBe('livre');
    expect(tableOf(result, 1).contaAtualId).toBeUndefined();
    expect(accountOf(result, a.contaId!).status).toBe('aberta');
    expect(accountOf(result, a.contaId!).saldoRestante).toBe(20);
  });
});

describe('auditoria das operações de conta', () => {
  it('AUDIT abre conta, espelha, libera, paga e encerra', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(1, 'Cliente'));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 1 });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => result.current.payAccount(a.contaId!, 'dinheiro', 20, 20));
    act(() => result.current.closeAccount(a.contaId!));
    const acoes = result.current.auditLogs.map(l => l.acao);
    expect(acoes).toContain('abriu conta');
    expect(acoes).toContain('pagou conta');
    expect(acoes).toContain('encerrou conta');
    expect(acoes.some(x => x.includes('liberou'))).toBe(true);
  });
});

/**
 * REGRESSÃO DO BUG REAL DO PDV (Conta 2/2.1 -> espelho -> mesa livre ->
 * voltar à mesa produzia Conta 3/3.1 em vez de 2.2).
 */
describe('POS: continuar a conta liberada pelo espelho', () => {
  it('BUG volta à mesa liberada e continua a conta: 2.1 -> 2.2, nunca 3.1', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6, 'Cliente'));
    const conta2 = result.current.accounts[0];
    expect(conta2.numero).toBe(0); // banco começa na conta 0
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    expect(tableOf(result, 6).status).toBe('livre');
    expect(accountOf(result, conta2.id).status).toBe('aberta');
    expect(accountOf(result, conta2.id).saldoRestante).toBe(20);

    // O PDV seleciona a Mesa 6: a conta é localizada e oferecida como padrão.
    const open = result.current.getOpenTableAccounts(6);
    expect(open.map(a2 => a2.id)).toEqual([conta2.id]);
    const preferred = result.current.getPreferredAccountForTable(6);
    expect(preferred.kind).toBe('conta');
    expect(result.current.getNextSequence(conta2.id)).toBe(2);

    // Confirmar sem informar contaId = o próprio createOrder continua a conta.
    const b = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'b' })] });
    expect(b.contaId).toBe(conta2.id);
    expect(b.contaNumero).toBe(0);
    expect(b.sequencia).toBe(2);
    expect(b.codigoExibicao).toBe('0.2');
    expect(result.current.accounts).toHaveLength(1);
  });

  it('BUG mesa 6 liberada: lançamento 2.2 reocupa a mesa com a MESMA conta', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    expect(tableOf(result, 6).status).toBe('livre');

    const b = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'b' })] });
    const table = tableOf(result, 6);
    expect(table.status).toBe('ocupada');
    expect(table.contaAtualId).toBe(conta.id);
    expect(accountOf(result, conta.id).mesaAtualNumero).toBe(6);
    expect(b.codigoExibicao).toBe('0.2');

    // Novo espelho volta a liberar fisicamente, sem apagar nada.
    act(() => result.current.generateOrderMirror(b.id));
    expect(tableOf(result, 6).status).toBe('livre');
    expect(accountOf(result, conta.id).status).toBe('aberta');
    expect(accountOf(result, conta.id).saldoRestante).toBe(40);
    expect(accountOf(result, conta.id).mesaOriginalNumero).toBe(6);
    expect(accountOf(result, conta.id).mesaAtualNumero).toBeUndefined();
  });

  it('BUG três lançamentos seguidos: 0.1, 0.2 e 0.3 sem contas extras', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    const codigos: string[] = [];
    for (const linha of ['a', 'b', 'c']) {
      const o = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: linha })] });
      codigos.push(o.codigoExibicao!);
      act(() => result.current.generateOrderMirror(o.id));
    }
    expect(codigos).toEqual(['0.1', '0.2', '0.3']);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe(conta.id);
  });

  it('NOVO ATENDIMENTO só quando o operador escolhe: 0.1 na conta 0 e 1.1 na conta 1', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta0 = result.current.accounts[0];
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    // Escolha EXPLÍCITA: contaId de conta inexistente não; o PDV envia
    // `undefined` e o createOrder resolve. Para abrir outra conta o operador
    // usa o fluxo de novo atendimento (createAccount + contaId da nova conta).
    const nova = result.current.createAccount({ tipo: 'mesa', mesaNumero: 6, nomeCliente: 'Outro cliente' });
    expect(nova.numero).toBe(1);
    const b = sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: nova.id, itens: [item({ cartItemId: 'b' })] });
    expect(b.contaNumero).toBe(1);
    expect(b.sequencia).toBe(1);
    expect(b.codigoExibicao).toBe('1.1');
    expect(accountOf(result, conta0.id).saldoRestante).toBe(20);
    expect(tableOf(result, 6).contaAtualId).toBe(nova.id);
  });

  it('ESCOLHER nova conta sem contaId explícito não reabre a conta antiga', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    //Simula o PDV: a conta nova ainda não existe, então createOrder continua
    //a conta aberta (a criação da nova é o próximo passo explícito).
    const b = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'b' })] });
    expect(b.contaId).toBe(a.contaId);
    expect(result.current.accounts).toHaveLength(1);
  });

  it('POS localiza a conta pelo mesaOriginalNumero mesmo sem conta atual', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    // Invariante: mesa livre, conta com histórico e sem mesa atual.
    expect(tableOf(result, 6).contaAtualId).toBeUndefined();
    expect(accountOf(result, conta.id).mesaAtualNumero).toBeUndefined();
    expect(accountOf(result, conta.id).mesaOriginalNumero).toBe(6);
    const resolution = result.current.getPreferredAccountForTable(6);
    expect(resolution.kind).toBe('conta');
    if (resolution.kind === 'conta') expect(resolution.account.id).toBe(conta.id);
  });

  it('PROTEÇÃO mesa ocupada por outra conta não aceita nova conta silenciosa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    sale(result, { tipo: 'mesa', mesaNumero: 6 });
    expect(() => result.current.createAccount({ tipo: 'mesa', mesaNumero: 6 })).toThrow(/já está ocupada pela Conta 0/);
    expect(result.current.accounts).toHaveLength(1);
    expect(tableOf(result, 6).contaAtualId).toBe(conta.id);
  });

  it('RESET trocar de mesa zera a escolha: Mesa 6 (Conta 0) -> Mesa 8 não usa a Conta 0', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta6 = result.current.accounts[0];
    sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'a' })] });
    // A escolha fica presa à conta da Mesa 6; ao trocar de mesa ela é inválida.
    expect(result.current.getOpenTableAccounts(8)).toEqual([]);
    expect(result.current.getPreferredAccountForTable(8).kind).toBe('nova');
    const b = sale(result, { tipo: 'mesa', mesaNumero: 8, itens: [item({ cartItemId: 'b' })] });
    expect(b.contaId).not.toBe(conta6.id);
    expect(b.contaNumero).toBe(1);
    expect(b.codigoExibicao).toBe('1.1');
  });

  it('PAGAR a conta antiga depois que a mesa foi ocupada pela nova não mexe na nova', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const antiga = result.current.accounts[0];
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    const nova = result.current.createAccount({ tipo: 'mesa', mesaNumero: 6, nomeCliente: 'Novo' });
    const b = sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: nova.id, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.payAccount(antiga.id, 'pix', 20));
    expect(accountOf(result, antiga.id).status).toBe('paga');
    const table = tableOf(result, 6);
    expect(table.contaAtualId).toBe(nova.id);
    expect(table.status).toBe('ocupada');
    expect(table.valorAtual).toBe(20);
    expect(accountOf(result, nova.id).status).toBe('aberta');
    expect(accountOf(result, nova.id).saldoRestante).toBe(20);
    expect(b.contaId).toBe(nova.id);
  });

  it('CONTAS & CHECKS conta quitada não aparece para continuar a mesa', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    expect(result.current.getOpenTableAccounts(6).map(x => x.id)).toEqual([conta.id]);
    act(() => result.current.payAccount(conta.id, 'pix', 20));
    expect(result.current.getOpenTableAccounts(6)).toEqual([]);
    expect(result.current.getPreferredAccountForTable(6).kind).toBe('nova');
  });

  it('CONTAS & CHECKS conta encerrada não aceita novo lançamento', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.payAccount(conta.id, 'pix', 20));
    act(() => result.current.closeAccount(conta.id));
    expect(result.current.getOpenTableAccounts(6)).toEqual([]);
    attempt(() => sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id }));
    expect(() => sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id })).toThrow(/encerrada/);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].status).toBe('encerrada');
    expect(a.contaId).toBe(conta.id);
  });

  it('CONTAS & CHECKS dois lançamentos na mesma conta: 2 lançamentos, total e saldo somados', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'a' })] });
    act(() => result.current.generateOrderMirror(result.current.orders[0].id));
    sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'b' })] });
    const acc = accountOf(result, conta.id);
    expect(result.current.getAccountOrders(conta.id).filter(o => o.status !== 'cancelado')).toHaveLength(2);
    expect(acc.total).toBe(40);
    expect(acc.saldoRestante).toBe(40);
    expect(result.current.accounts).toHaveLength(1);
  });

  it('AMBIGUIDADE mais de uma conta aberta na mesa exige escolha do operador', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => result.current.freeTableManually(6));
    // Novo atendimento explícito na mesma mesa: agora há 2 contas abertas.
    act(() => result.current.createAccount({ tipo: 'mesa', mesaNumero: 6, nomeCliente: 'B' }));
    sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: result.current.accounts[1].id, itens: [item({ cartItemId: 'b' })] });
    act(() => result.current.freeTableManually(6));
    const resolution = result.current.getPreferredAccountForTable(6);
    expect(resolution.kind).toBe('ambigua');
    if (resolution.kind === 'ambigua') {
      // Exibição por ordem de relevância: a mais recente vem primeiro.
      expect(resolution.accounts.map(x => x.numero)).toEqual([1, 0]);
    }
    // Sem escolha explícita, o createOrder NÃO adivinha: exige o operador.
    expect(() => sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'c' })] })).toThrow(/mais de uma conta aberta/);
    // Escolhendo explicitamente, funciona.
    const escolhida = result.current.accounts[0].id;
    const c = sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: escolhida, itens: [item({ cartItemId: 'c' })] });
    expect(c.contaId).toBe(escolhida);
    expect(c.contaId).toBe(a.contaId);
    expect(c.sequencia).toBe(2);
  });

  it('AMBIGUIDADE conta atual da mesa não vence outra conta aberta do mesmo histórico', () => {
    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const a = sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(a.id));
    act(() => result.current.freeTableManually(6));
    // A conta 0 fica ABERTA e liberada; a conta 1 ocupa a mesa agora.
    act(() => result.current.createAccount({ tipo: 'mesa', mesaNumero: 6, nomeCliente: 'B' }));
    const conta1 = result.current.accounts.find(a => a.numero === 1)!;
    sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: conta1.id, itens: [item({ cartItemId: 'b' })] });
    const mesa = tableOf(result, 6);
    expect(mesa.status).toBe('ocupada');
    expect(mesa.contaAtualNumero).toBe(1);
    // Mesmo com a mesa OCUPADA pela conta 1, existe outra conta aberta (0)
    // ligada ao mesmo histórico: a escolha continua sendo do operador.
    const resolution = result.current.getPreferredAccountForTable(6);
    expect(resolution.kind).toBe('ambigua');
    if (resolution.kind === 'ambigua') {
      // Exibição por relevância: quem ocupa a mesa vem primeiro.
      expect(resolution.accounts.map(x => x.numero)).toEqual([1, 0]);
    }
    expect(() => sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'c' })] })).toThrow(/mais de uma conta aberta/);
    // Escolha explícita da conta liberada (0) segue funcionando e reabre a mesa.
    const conta0 = result.current.accounts.find(a => a.numero === 0)!;
    const c = sale(result, { tipo: 'mesa', mesaNumero: 6, contaId: conta0.id, itens: [item({ cartItemId: 'c' })] });
    expect(c.contaNumero).toBe(0);
    expect(c.sequencia).toBe(2);
    expect(c.codigoExibicao).toBe('0.2');
    expect(tableOf(result, 6).contaAtualNumero).toBe(0);
  });

  it('IDEMPOTÊNCIA a mesma operação não cria 0.2 e 0.3 duplicados', () => {    const { result } = boot();
    act(() => result.current.openTableWithOrder(6));
    const conta = result.current.accounts[0];
    sale(result, { tipo: 'mesa', mesaNumero: 6 });
    act(() => result.current.generateOrderMirror(result.current.orders[0].id));
    const op = 'op-idempotente-1';
    const first = sale(result, { tipo: 'mesa', mesaNumero: 6, operacaoId: op, itens: [item({ cartItemId: 'x' })] });
    const repeat = sale(result, { tipo: 'mesa', mesaNumero: 6, operacaoId: op, itens: [item({ cartItemId: 'x' })] });
    expect(repeat.id).toBe(first.id);
    expect(result.current.getAccountOrders(conta.id)).toHaveLength(2);
    expect(result.current.orders.filter(o => o.operacaoId === op)).toHaveLength(1);
  });

  it('ROLLBACK conta não sobra quando o lançamento falha', () => {
    const { result } = boot();
    // Nada é criado antes: a própria venda tentatively cria a conta.
    // O pagamento com forma inválida estoura DEPOIS da criação do pedido.
    expect(() => sale(result, {
      tipo: 'mesa', mesaNumero: 6,
      itens: [item({ cartItemId: 'z' })],
      pagamentos: [{ formaId: 'inexistente' as any, valor: 20 } as any]
    })).toThrow();
    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.orders).toHaveLength(0);
    expect(tableOf(result, 6).status).toBe('livre');
    expect(tableOf(result, 6).contaAtualId).toBeUndefined();
    // A mesa segue disponível: o próximo lançamento abre o atendimento.
    const ok = sale(result, { tipo: 'mesa', mesaNumero: 6, itens: [item({ cartItemId: 'w' })] });
    expect(ok.codigoExibicao).toBe('0.1');
    expect(result.current.accounts).toHaveLength(1);
  });
});
