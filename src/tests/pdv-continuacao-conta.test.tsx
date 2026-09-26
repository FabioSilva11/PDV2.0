import React from 'react';
import { act, render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { POSView } from '../components/pdv/POSView';
import { INITIAL_TABLES } from '../data/seedData';
import { DEFAULT_RESTAURANT_SETTINGS } from '../config/defaultSettings';
import { hashPassword } from '../lib/auth';
import type { MenuItem, UserAccount } from '../types';

const key = 'pdv_database_v2';
const product: MenuItem = { id: 'qa-product', nome: 'Prato QA', preco: 20, categoria: 'Pratos principais', disponivel: true };

let passwordHashPromise: Promise<string> | null = null;
const QA_ADMIN: UserAccount = {
  id: 'usr-qa-admin', nome: 'Operador QA', usuario: 'qa', cargo: 'Administrador',
  perfil: 'administrador', ativo: true, isPrimaryAdmin: true,
  permissoes: ['pdv', 'pedidos', 'contas', 'mesas', 'caixa', 'cardapio', 'clientes', 'reservas', 'desconto', 'cancelamento', 'reabertura', 'auditoria', 'usuarios', 'impressoras', 'configuracoes'],
  senhaHash: 'pendente' as any,
};
passwordHashPromise = hashPassword('1234');

const seedDatabase = () => ({
  operationalDemoResetApplied: true,
  settings: { ...DEFAULT_RESTAURANT_SETTINGS, setupComplete: true },
  users: [QA_ADMIN],
  menu: [product],
  orders: [], accounts: [], alerts: [], printQueue: [],
  tables: INITIAL_TABLES.map(t => ({ ...t, status: 'livre', valorAtual: 0, pedidoAtivoId: undefined })),
  cashRegister: { aberto: true, saldoInicial: 200, saldoAtualGaveta: 200, transacoes: [] }
});

beforeEach(async () => {
  localStorage.clear();
  QA_ADMIN.senhaHash = await passwordHashPromise!;
  localStorage.setItem(key, JSON.stringify(seedDatabase()));
  localStorage.setItem('pdv_session_v1', JSON.stringify({ userId: QA_ADMIN.id, token: 'qa-token-test', startedAt: new Date().toISOString() }));
});

/**
 * Reprodução MANUAL do bug relatado, dirigindo a TELA do PDV (não a API):
 *   Mesa 6 -> Conta -> 0.1 -> espelho -> mesa LIVRE -> volta à Mesa 6
 *   -> deve continuar a conta (0.2) e NUNCA criar Conta 1 / 1.1.
 */
describe('REPRODUÇÃO DO BUG: PDV voltando à mesa liberada pelo espelho', () => {
  const selectTable = (view: HTMLElement, numero: number) =>
    fireEvent.change(view.querySelector('#pos-select-table')!, { target: { value: String(numero) } });
  const addItem = (view: HTMLElement) => fireEvent.click(view.querySelector('#product-card-qa-product')!);
  const confirm = (view: HTMLElement) => fireEvent.click(view.querySelector('#pos-confirm-order-btn')!);

  it('2.1 -> espelho -> mesa livre -> volta à mesa -> 0.2 na MESMA conta', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>).container;

    // 1) primeira venda na Mesa 6
    fireEvent.click(view.querySelector('#order-type-mesa')!);
    selectTable(view, 6);
    addItem(view);
    confirm(view);
    expect(api.orders).toHaveLength(1);
    const primeiro = api.orders[0];
    expect(primeiro.codigoExibicao).toBe('0.1');
    expect(primeiro.contaNumero).toBe(0);
    expect(api.accounts).toHaveLength(1);
    expect(api.tables.find(t => t.numero === 6)!.status).toBe('ocupada');

    // 2) espelho: mesa volta a ficar LIVRE, conta continua ABERTA
    act(() => api.generateOrderMirror(primeiro.id));
    expect(api.orders.find(o => o.id === primeiro.id)!.status).toBe('pronto');
    expect(api.tables.find(t => t.numero === 6)!.status).toBe('livre');
    expect(api.accounts[0].status).toBe('aberta');
    expect(api.accounts[0].saldoRestante).toBe(20);

    // 3) volta ao PDV e seleciona a Mesa 6 de novo
    fireEvent.click(view.querySelector('#order-type-mesa')!);
    selectTable(view, 6);
    const seletor = view.querySelector('#pos-select-account') as HTMLSelectElement;
    const aviso = view.querySelector('#pos-account-hint')!.textContent || '';
    // A conta aberta é a selecionada por padrão e o preview é 0.2
    expect(seletor.value).toBe(api.accounts[0].id);
    expect(aviso).toContain('Continuar Conta 0');
    expect(aviso).toContain('0.2');
    expect(Array.from(seletor.options).map(o => o.textContent || '').join(' | ')).toContain('Continuar Conta 0 • saldo R$ 20.00');

    // 4) confirma: continua a mesma conta
    addItem(view);
    confirm(view);
    expect(api.orders).toHaveLength(2);
    const segundo = api.orders[0];
    expect(segundo.codigoExibicao).toBe('0.2');
    expect(segundo.contaId).toBe(primeiro.contaId);
    expect(segundo.contaNumero).toBe(0);
    // >>> NENHUMA Conta 1 / 1.1 foi criada
    expect(api.accounts).toHaveLength(1);
    expect(api.accounts[0].total).toBe(40);
    expect(api.accounts[0].saldoRestante).toBe(40);
    // A mesa foi REABERTA fisicamente pela mesma conta
    const mesa = api.tables.find(t => t.numero === 6)!;
    expect(mesa.status).toBe('ocupada');
    expect(mesa.contaAtualId).toBe(primeiro.contaId);
    expect(mesa.contaAtualNumero).toBe(0);
  });

  it('NOVO ATENDIMENTO explícito cria a Conta 1 com o lançamento 1.1', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>).container;

    fireEvent.click(view.querySelector('#order-type-mesa')!);
    selectTable(view, 6);
    addItem(view);
    confirm(view);
    act(() => api.generateOrderMirror(api.orders[0].id));

    // Volta à Mesa 6 e ESCOLHE explicitamente criar novo atendimento
    selectTable(view, 6);
    const seletor = view.querySelector('#pos-select-account') as HTMLSelectElement;
    expect(seletor.value).toBe(api.accounts[0].id);
    fireEvent.change(seletor, { target: { value: 'nova' } });
    // O preview mostra o número REAL da conta que será criada: 1.1
    expect(view.querySelector('#pos-account-hint')!.textContent).toContain('lançamento 1.1 da nova Conta 1');
    addItem(view);
    confirm(view);

    expect(api.accounts).toHaveLength(2);
    expect(api.accounts[1].numero).toBe(1);
    // A nova conta é criada pelo CONTEXTO (nunca pela tela do PDV), que
    // respeita a escolha explícita e não reaproveita a conta liberada.
    const novo = api.orders[0];
    expect(novo.codigoExibicao).toBe('1.1');
    expect(novo.contaNumero).toBe(1);
    expect(api.accounts[0].saldoRestante).toBe(20);
  });

  it('trocar de mesa zera a escolha: Mesa 6 (Conta 0) -> Mesa 8 não usa a Conta 0', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>).container;

    fireEvent.click(view.querySelector('#order-type-mesa')!);
    selectTable(view, 6);
    addItem(view);
    confirm(view);
    const conta0 = api.accounts[0].id;

    // Continua na Mesa 6 (escolha fica na conta 0), depois troca para a 8
    selectTable(view, 6);
    fireEvent.change(view.querySelector('#pos-select-account')!, { target: { value: conta0 } });
    expect((view.querySelector('#pos-select-account') as HTMLSelectElement).value).toBe(conta0);

    selectTable(view, 8);
    const seletor8 = view.querySelector('#pos-select-account') as HTMLSelectElement;
    expect(Array.from(seletor8.options).map(o => o.value)).toEqual(['nova']);
    expect(view.querySelector('#pos-account-hint')!.textContent).toContain('Nenhuma conta aberta');

    addItem(view);
    confirm(view);
    const na8 = api.orders.find(o => o.mesaNumero === 8)!;
    expect(na8.contaId).not.toBe(conta0);
    expect(na8.contaNumero).toBe(1);
    expect(na8.codigoExibicao).toBe('1.1');
  });

  it('AMBIGUIDADE no seletor: 2 contas abertas na mesa, PDV não adivinha', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>).container;

    fireEvent.click(view.querySelector('#order-type-mesa')!);
    selectTable(view, 6);
    addItem(view);
    confirm(view);
    act(() => api.generateOrderMirror(api.orders[0].id));
    act(() => api.freeTableManually(6));
    // Novo atendimento explícito na mesma mesa: 2 contas abertas.
    act(() => api.createAccount({ tipo: 'mesa', mesaNumero: 6, nomeCliente: 'B' }));
    act(() => api.createOrder({ tipo: 'mesa', mesaNumero: 6, contaId: api.accounts[1].id, itens: [{ ...api.orders[0].itens[0], cartItemId: 'b' }] }));

    selectTable(view, 6);
    const seletor = view.querySelector('#pos-select-account') as HTMLSelectElement;
    const opcoes = Array.from(seletor.options).map(o => ({ valor: o.value, texto: o.textContent || '' }));
    // Ambas as contas abertas são oferecidas, mais "Criar novo atendimento".
    expect(opcoes.filter(o => o.valor !== 'nova')).toHaveLength(2);
    expect(opcoes.some(o => o.texto.includes('Continuar Conta 1'))).toBe(true);
    expect(opcoes.some(o => o.texto.includes('Continuar Conta 0'))).toBe(true);
    // O aviso manda o operador escolher.
    const aviso = view.querySelector('#pos-account-hint')!.textContent || '';
    expect(aviso).toMatch(/Conta 0 e Conta 1|Conta 1 e Conta 0/);

    // Escolhendo a conta liberada (0), o lançamento continua nela e a mesa
    // volta a ser ocupada pela conta escolhida.
    fireEvent.change(seletor, { target: { value: api.accounts.find(a => a.numero === 0)!.id } });
    addItem(view);
    confirm(view);
    const ultimo = api.orders[0];
    expect(ultimo.contaNumero).toBe(0);
    expect(ultimo.codigoExibicao).toBe('0.2');
    expect(api.tables.find(t => t.numero === 6)!.contaAtualNumero).toBe(0);
    // A conta 1 continua ABERTA, só perdeu a ocupação física.
    expect(api.accounts.find(a => a.numero === 1)!.status).toBe('aberta');
  });

  it('conta paga não é oferecida para continuar; PDV propõe novo atendimento', () => {
    let api!: ReturnType<typeof useRestaurant>;
    const Screen = () => { api = useRestaurant(); return <POSView />; };
    const view = render(<RestaurantProvider><Screen /></RestaurantProvider>).container;

    fireEvent.click(view.querySelector('#order-type-mesa')!);
    selectTable(view, 6);
    addItem(view);
    confirm(view);
    act(() => api.generateOrderMirror(api.orders[0].id));
    act(() => api.payAccount(api.accounts[0].id, 'pix', 20));
    expect(api.accounts[0].status).toBe('paga');

    selectTable(view, 6);
    const seletor = view.querySelector('#pos-select-account') as HTMLSelectElement;
    expect(Array.from(seletor.options).map(o => o.value)).toEqual(['nova']);
    addItem(view);
    confirm(view);
    expect(api.orders[0].codigoExibicao).toBe('1.1');
  });
});
