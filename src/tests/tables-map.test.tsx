import React from 'react';
import { act, render } from '@testing-library/react';
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

function bootMap() {
  let apiRef: ReturnType<typeof useRestaurant>;
  const Screen = () => { apiRef = useRestaurant(); return <TablesView />; };
  const view = render(<RestaurantProvider><Screen /></RestaurantProvider>);
  return { api: () => apiRef!, view };
}

const item = (overrides: Record<string, unknown> = {}) => ({
  menuItemId: product.id, nome: product.nome, precoUnitario: 20, quantidade: 1,
  observacao: '', estacaoProducao: 'cozinha', ...overrides
});

const sale = (api: ReturnType<typeof useRestaurant>, data: Record<string, unknown>) => {
  let order!: ReturnType<typeof useRestaurant>['orders'][number];
  act(() => { order = api().createOrder({ itens: [item()], ...data } as any); });
  return order;
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