import React from 'react';
import { act, render, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { TablesView } from '../components/tables/TablesView';
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

const item = (overrides: Record<string, unknown> = {}) => ({
  menuItemId: product.id, nome: product.nome, precoUnitario: 20, quantidade: 1,
  observacao: '', estacaoProducao: 'cozinha', ...overrides
});

/** Renderiza o mapa com acesso à API para montar cenários. */
function bootMap() {
  let apiRef: ReturnType<typeof useRestaurant>;
  const Screen = () => { apiRef = useRestaurant(); return <TablesView />; };
  const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
  return { api: () => apiRef!, view };
}

const sale = (api: ReturnType<typeof useRestaurant>, data: Record<string, unknown>) => {
  let order!: ReturnType<typeof useRestaurant>["orders"][number];
  act(() => { order = api().createOrder({ itens: [item()], ...data } as any); });
  return order;
};

/** Atalho: conta "2.x" (índice 1) via novo atendimento explícito. */
const openSecondAccountOn = (api: ReturnType<typeof useRestaurant>, table: number, nome: string) => {
  act(() => api().openTableWithOrder(table, nome));
  const conta = api().accounts.find(a => a.numero === 1)!;
  sale(api, { tipo: 'mesa', mesaNumero: table, contaId: conta.id });
  return conta;
};

describe('MAPA DE MESAS: operacional, sem informação financeira', () => {
  it('MAPA card mostra só dados físicos da mesa (sem R$, saldo, conta ou total)', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6, 'Família'));
    sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: api().accounts[0].id });

    const card = view.container.querySelector('#table-card-6')!;
    const texto = card.textContent || '';
    expect(texto).toContain('Mesa');
    expect(texto).toContain('06');
    expect(texto).toContain('Ocupada');
    expect(texto).toContain('Capacidade');
    // Nenhum dado financeiro no card.
    expect(texto).not.toMatch(/R\$/);
    expect(texto).not.toMatch(/saldo|restante|total/i);
    expect(texto).not.toMatch(/conta\s*\d/i);
    expect(texto).not.toMatch(/\d+\.\d/); // nem código de lançamento
  });

  it('MAPA mesa livre com conta aberta em aberto NÃO vira ocupada nem mostra valor', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const first = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: api().accounts[0].id });
    act(() => api().generateOrderMirror(first.id));

    const card = view.container.querySelector('#table-card-6')!;
    const texto = card.textContent || '';
    expect(texto).toContain('Livre');
    expect(texto).not.toMatch(/R\$|saldo|em aberto|Conta\s*\d/i);
    expect(texto).not.toMatch(/3\.1|1\.1/);
  });

  it('MAPA mantém apenas os estados físicos e os contadores dos filtros', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(9));
    sale(api, { tipo: 'mesa', mesaNumero: 9, contaId: api().accounts[0].id });
    const ocupadas = view.container.textContent || '';
    expect(ocupadas).toContain('Ocupadas (1)');
    expect(view.container.querySelector('#table-card-1')).toBeTruthy();
    expect(view.container.querySelector('#table-card-1')!.textContent).toContain('Livre');
    expect(view.container.querySelector('#table-card-9')!.textContent).toContain('Ocupada');
  });
});

describe('DETALHES DA MESA: contas, lançamentos e ações', () => {
  const abrirDetalhes = (view: HTMLElement, numero: number) =>
    fireEvent.click(view.querySelector(`#table-card-${numero}`)!);

  it('DETALHE Mesa 06 abre a visualização com status e ações', () => {
    const { view } = bootMap();
    abrirDetalhes(view.container, 6);
    expect(view.container.querySelector('#table-details-modal')).toBeTruthy();
    expect(view.container.querySelector('#table-details-title')!.textContent).toBe('MESA 06');
    expect(view.container.querySelector('#table-details-status')!.textContent).toBe('Livre');
    expect(view.container.querySelector('#table-details-new-order-btn')).toBeTruthy();
    expect(view.container.querySelector('#table-details-new-account-btn')).toBeTruthy();
    expect(view.container.querySelector('#table-details-close-btn')).toBeTruthy();
  });

  it('DETALHE sem conta aberta mostra "Nenhuma conta aberta" e não escolhe conta', () => {
    const { view } = bootMap();
    abrirDetalhes(view.container, 6);
    expect(view.container.querySelector('#table-details-no-open-account')!.textContent).toContain('Nenhuma conta aberta');
    // "Novo lançamento" desabilitado: não existe conta para continuar.
    expect(view.container.querySelector('#table-details-new-order-btn')).toBeDisabled();
    // "Novo atendimento" informa o próximo código real.
    expect(view.container.querySelector('#table-details-new-account-btn')!.textContent).toContain('0.1');
  });

  it('DETALHE com MAIS DE UMA conta aberta (liberada + nova) exige seleção', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: api().accounts[0].id });
    act(() => api().generateOrderMirror(a.id));
    act(() => api().createOrder({ tipo: 'mesa', mesaNumero: 6, novaConta: true, itens: [item({ cartItemId: 'x' })] } as any));

    abrirDetalhes(view.container, 6);
    const contasAbertas = api().accounts.filter(x => x.status === 'aberta');
    expect(contasAbertas).toHaveLength(2);
    expect(contasAbertas.map(x => x.numero)).toEqual([0, 1]);
    // Ambas listadas, NENHUMA selecionada automaticamente.
    expect(view.container.querySelector('#table-details-account-0')).toBeTruthy();
    expect(view.container.querySelector('#table-details-account-1')).toBeTruthy();
    expect(view.container.querySelector('#table-details-account-hint')!.textContent).toContain('Escolha qual conta continua');
    expect(view.container.querySelector('#table-details-new-order-btn')).toBeDisabled();
  });

  it('DETALHE lista os lançamentos com código e situação operacional', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const conta = api().accounts[0];
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id });
    act(() => api().generateOrderMirror(a.id));
    const b = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id });

    abrirDetalhes(view.container, 6);
    const lista = view.container.querySelector('#table-details-orders')!;
    expect(lista.textContent).toContain('0.1');
    expect(lista.textContent).toContain('Pronto');
    expect(lista.textContent).toContain('0.2');
    expect(lista.textContent).toContain('Aguardando espelho');
    // Área financeira aparece NOS DETALHES, não no mapa.
    expect(view.container.querySelector('#table-details-modal')!.textContent).toContain('Saldo');
  });

  it('DETALHE com MAIS DE UMA conta aberta não escolhe nenhuma e exige seleção', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6, 'A'));
    const conta0 = api().accounts[0];
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta0.id });
    act(() => api().generateOrderMirror(a.id));
    act(() => api().freeTableManually(6));
    openSecondAccountOn(api, 6, 'B');

    abrirDetalhes(view.container, 6);
    const aberta0 = api().accounts.find(x => x.numero === 0)!;
    const aberta1 = api().accounts.find(x => x.numero === 1)!;
    expect(aberta0.status).toBe('aberta');
    expect(aberta1.status).toBe('aberta');
    // Ambas listadas...
    expect(view.container.querySelector('#table-details-account-0')).toBeTruthy();
    expect(view.container.querySelector('#table-details-account-1')).toBeTruthy();
    // ... e NENHuma selecionada: o aviso exige a escolha do operador.
    expect(view.container.querySelector('#table-details-account-hint')!.textContent).toContain('Escolha qual conta continua');
    expect(view.container.querySelector('#table-details-new-order-btn')).toBeDisabled();

    // Escolhendo a conta liberada, o próximo código é o dela (0.2), não 1.2.
    fireEvent.click(view.container.querySelector('#table-details-account-0')!);
    expect(view.container.querySelector('#table-details-account-hint')!.textContent).toContain('Próximo lançamento: 0.2');
    expect(view.container.querySelector('#table-details-new-order-btn')!.textContent).toContain('0.2');
  });

  it('DETALHE "Novo lançamento" continua a conta escolhida e reencupa a mesa', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const conta = api().accounts[0];
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id });
    act(() => api().generateOrderMirror(a.id));
    expect(api().tables.find(t => t.numero === 6)!.status).toBe('livre');

    abrirDetalhes(view.container, 6);
    fireEvent.click(view.container.querySelector('#table-details-new-order-btn')!);

    // O PDV foi aberto já com a mesa e a conta corretas.
    expect(api().activeModule).toBe('pdv');
    expect(api().posHandoff).toBeTruthy();
    act(() => sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id }));
    const b = api().orders[0];
    expect(b.codigoExibicao).toBe('0.2');
    expect(b.contaNumero).toBe(0);
    expect(api().accounts).toHaveLength(1);
    const mesa = api().tables.find(t => t.numero === 6)!;
    expect(mesa.status).toBe('ocupada');
    expect(mesa.contaAtualNumero).toBe(0);
  });

  it('DETALHE "Novo atendimento" cria conta nova independente e primeiro lançamento', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const conta0 = api().accounts[0];
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta0.id });
    act(() => api().generateOrderMirror(a.id));

    abrirDetalhes(view.container, 6);
    expect(view.container.querySelector('#table-details-new-account-btn')!.textContent).toContain('1.1');
    fireEvent.click(view.container.querySelector('#table-details-new-account-btn')!);

    expect(api().accounts).toHaveLength(2);
    const nova = api().accounts.find(x => x.numero === 1)!;
    expect(nova.status).toBe('aberta');
    // A conta 0 continua aberta e com saldo: independência total.
    expect(api().accounts.find(x => x.numero === 0)!.status).toBe('aberta');
    act(() => sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: nova.id }));
    expect(api().orders[0].codigoExibicao).toBe('1.1');
    expect(api().accounts.find(x => x.numero === 0)!.saldoRestante).toBe(20);
  });

  it('DETALHE "Novo atendimento" em mesa ocupada explica que a conta aberta deve continuar', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: api().accounts[0].id });
    abrirDetalhes(view.container, 6);
    fireEvent.click(view.container.querySelector('#table-details-new-account-btn')!);
    const erro = view.container.querySelector('#table-details-error');
    expect(erro).toBeTruthy();
    expect(erro!.textContent).toContain('Conta 0');
    // Nada foi criado indevidamente.
    expect(api().accounts).toHaveLength(1);
  });

  it('DETALHE "Fechar" volta ao mapa sem apagar conta nem histórico', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const conta = api().accounts[0];
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id });
    act(() => api().generateOrderMirror(a.id));
    abrirDetalhes(view.container, 6);
    fireEvent.click(view.container.querySelector('#table-details-close-btn')!);
    expect(view.container.querySelector('#table-details-modal')).toBeNull();
    expect(view.container.querySelector('#table-card-6')).toBeTruthy();
    expect(api().accounts).toHaveLength(1);
    expect(api().orders).toHaveLength(1);
    expect(api().getAccount(conta.id).status).toBe('aberta');
  });

  it('MAPA反映: mesa liberada pelo espelho continua exibindo só "Livre"', () => {
    const { api, view } = bootMap();
    act(() => api().openTableWithOrder(6));
    const conta = api().accounts[0];
    const a = sale(api, { tipo: 'mesa', mesaNumero: 6, contaId: conta.id });
    act(() => api().generateOrderMirror(a.id));
    const card = view.container.querySelector('#table-card-6')!;
    expect(card.textContent).toContain('Livre');
    expect(card.textContent).not.toMatch(/R\$|Conta\s*\d|0\.1/i);
    // A conta segue existindo com o histórico intacto.
    expect(api().getAccount(conta.id).status).toBe('aberta');
    expect(api().getAccount(conta.id).mesaOriginalNumero).toBe(6);
    expect(api().getAccount(conta.id).mesaAtualNumero).toBeUndefined();
  });
});
