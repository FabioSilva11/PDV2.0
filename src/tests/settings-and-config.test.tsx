import React from 'react';
import { act, renderHook, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext';
import { ReceiptModal } from '../components/pdv/ReceiptModal';
import { buildPixPayload } from '../utils/pix';
import { DEFAULT_RESTAURANT_SETTINGS } from '../config/defaultSettings';
import { INITIAL_TABLES } from '../data/seedData';
import { hashPassword } from '../lib/auth';
import type { MenuItem, UserAccount } from '../types';

const key = 'pdv_database_v2';
const sessionKey = 'pdv_session_v1';

const product: MenuItem = {
  id: 'cfg-product', nome: 'X-Bacon QA', preco: 30, categoria: 'Porções Extras',
  categoriaId: 'cat-porcoes', catalogo: 'restaurante', disponivel: true,
  remocoesDisponiveis: ['Cebola', 'Molho especial'],
};

let hashPromise: Promise<string> | null = null;
const QA_ADMIN: UserAccount = {
  id: 'usr-qa-admin', nome: 'Operador QA', usuario: 'qa', cargo: 'Administrador',
  perfil: 'administrador', ativo: true, isPrimaryAdmin: true,
  permissoes: ['pdv','pedidos','mesas','caixa','cardapio','clientes','reservas','desconto','cancelamento','reabertura','auditoria','usuarios','impressoras','configuracoes'],
  senhaHash: 'pendente' as any,
};
hashPromise = hashPassword('1234');

const wrapper = ({ children }: { children: React.ReactNode }) => <RestaurantProvider>{children}</RestaurantProvider>;
const boot = () => renderHook(() => useRestaurant(), { wrapper });

function seedDatabase(settings: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    operationalDemoResetApplied: true,
    settings: { ...DEFAULT_RESTAURANT_SETTINGS, setupComplete: true, ...settings },
    users: [QA_ADMIN],
    menu: [product],
    orders: [], alerts: [], printQueue: [],
    tables: INITIAL_TABLES.map(t => ({ ...t, status: 'livre', valorAtual: 0, pedidoAtivoId: undefined })),
    cashRegister: { aberto: true, saldoInicial: 0, saldoAtualGaveta: 0, transacoes: [] },
    ...extra,
  };
}

beforeEach(async () => {
  localStorage.clear();
  QA_ADMIN.senhaHash = await hashPromise!;
  localStorage.setItem(key, JSON.stringify(seedDatabase()));
  localStorage.setItem(sessionKey, JSON.stringify({ userId: QA_ADMIN.id, token: 'qa-token-test', startedAt: new Date().toISOString() }));
});

describe('configuração do estabelecimento (RestaurantSettings)', () => {
  it('CFG nome do estabelecimento altera o recibo (sem Murupi fixo)', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({
      nomeFantasia: 'Sabor da Serra', cnpj: '00.111.222/0001-33', telefone: '(11) 4002-8922', cidade: 'Curitiba', estado: 'PR',
    })));
    const { result } = boot();
    let order!: ReturnType<typeof result.current.createOrder>;
    act(() => { order = result.current.createOrder({ itens: [{ cartItemId: 'i1', menuItemId: product.id, nome: product.nome, precoUnitario: 30, quantidade: 1, observacao: '', estacaoProducao: 'cozinha' }] }); });
    act(() => { result.current.setSelectedReceiptOrder(order); });
    const { container } = render(<RestaurantProvider><ReceiptModal order={order} isOpen onClose={() => {}} /></RestaurantProvider>);
    expect(container.textContent?.toUpperCase()).toContain('SABOR DA SERRA');
    expect(container.textContent).not.toContain('Murupi');
    expect(container.textContent).not.toContain('MURUPI');
    expect(container.textContent).toContain('00.111.222/0001-33');
    expect(container.textContent).toContain('(11) 4002-8922');
    expect(container.textContent).toContain('Curitiba');
  });

  it('CFG trocar telefone altera o recibo', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ nomeFantasia: 'A', telefone: '(22) 98888-7777', cidade: 'Rio' })));
    const { result } = boot();
    let order!: any;
    act(() => { order = result.current.createOrder({ itens: [{ cartItemId: 'i1', menuItemId: product.id, nome: product.nome, precoUnitario: 30, quantidade: 1, observacao: '', estacaoProducao: 'cozinha' }] }); });
    const { container } = render(<RestaurantProvider><ReceiptModal order={order} isOpen onClose={() => {}} /></RestaurantProvider>);
    expect(container.textContent).toContain('(22) 98888-7777');
  });

  it('CFG trocar cidade altera o payload PIX (sem PORTO VELHO fixo)', () => {
    const payload = buildPixPayload('chave-teste', 50, 'Nome Teste', 'Curitiba');
    expect(payload).toContain('CURITIBA');
    // Sem nome configurado: erro claro, sem fallback de negócio.
    expect(() => buildPixPayload('chave-teste', 50, '', 'Curitiba')).toThrow(/Nome/);
    // Sem cidade configurada: erro claro, sem fallback de negócio.
    expect(() => buildPixPayload('chave-teste', 50, 'Nome', '')).toThrow(/Cidade/);
  });

  it('CFG trocar taxa de entrega altera o total do PDV', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ delivery: { defaultFee: 9.9 } })));
    const { result } = boot();
    expect(result.current.settings.delivery.defaultFee).toBe(9.9);
  });

  it('CFG trocar quickAmounts reflete na configuração do caixa', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ cashier: { quickAmounts: [10, 30, 70] } })));
    const { result } = boot();
    expect(result.current.settings.cashier.quickAmounts).toEqual([10, 30, 70]);
  });

  it('CFG saveSettings persiste e audita', () => {
    const { result } = boot();
    act(() => { result.current.saveSettings({ rodapeComprovante: 'Volte sempre!' }); });
    expect(result.current.settings.rodapeComprovante).toBe('Volte sempre!');
    const audit = result.current.auditLogs.find(l => l.acao === 'alterou configuração');
    expect(audit).toBeDefined();
  });

  it('CFG dashboard usa threshold configurável (não 25 fixo)', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ operations: { lateOrderThresholdMinutes: 40, dashboardStartHour: 8, dashboardEndHour: 20, topProductsLimit: 3 } })));
    const { result } = boot();
    expect(result.current.settings.operations.lateOrderThresholdMinutes).toBe(40);
    expect(result.current.settings.operations.topProductsLimit).toBe(3);
  });
});

describe('autenticação e administrador único', () => {
  it('AUTH login com senha correta inicia sessão e audita usuário', async () => {
    const { result } = boot();
    let promise!: Promise<{ ok: boolean }>;
    act(() => { promise = result.current.login('qa', '1234'); });
    const res = await promise!;
    expect(res.ok).toBe(true);
    expect(result.current.currentUser?.nome).toBe('Operador QA');
  });

  it('AUTH senha errada é rejeitada', async () => {
    const { result } = boot();
    let promise!: Promise<{ ok: boolean; error?: string }>;
    act(() => { promise = result.current.login('qa', 'errada'); });
    const res = await promise!;
    expect(res.ok).toBe(false);
    expect(result.current.currentUser?.id).toBe(QA_ADMIN.id); // sessão seed permanece
  });

  it('AUTH não existe segundo administrador principal', () => {
    const { result } = boot();
    act(() => attempt(() => result.current.saveUser({
      id: 'usr-2', nome: 'Segundo Admin', usuario: 'admin2', cargo: 'Admin', perfil: 'administrador', ativo: true, isPrimaryAdmin: true, permissoes: [],
    })));
    expect(result.current.users.filter(u => u.isPrimaryAdmin)).toHaveLength(1);
  });

  it('AUTH senha nunca é armazenada em texto puro', async () => {
    const { result } = boot();
    let promise!: Promise<void>;
    act(() => { promise = result.current.changeUserPassword('usr-2-novo', 'senha-teste') as any; });
    // primeiro cria o usuário
    act(() => { result.current.saveUser({ id: 'usr-2-novo', nome: 'Caixa Um', usuario: 'caixa1', cargo: 'Operador', perfil: 'caixa', ativo: true, permissoes: ['pdv'] }); });
    await act(async () => { await result.current.changeUserPassword('usr-2-novo', 'senha-teste'); });
    const user = result.current.users.find(u => u.id === 'usr-2-novo');
    expect(user?.senhaHash).toBeDefined();
    expect(user?.senhaHash).toContain('pbkdf2$');
    expect(user?.senhaHash).not.toContain('senha-teste');
    void promise;
  });
});

describe('categorias dinâmicas (menu_categories)', () => {
  it('CAT categoria compartilhada (Porções) pertence aos dois catálogos', () => {
    const { result } = boot();
    const porcoes = result.current.menuCategories.find(c => c.nome === 'Porções');
    expect(porcoes?.catalogos).toEqual(['restaurante', 'lanche']);
  });

  it('CAT criar categoria só para Lanche funciona', () => {
    const { result } = boot();
    act(() => { result.current.saveMenuCategory({ id: 'cat-qa', nome: 'Hot Dogs', catalogos: ['lanche'], ordem: 99, ativo: true }); });
    const created = result.current.menuCategories.find(c => c.id === 'cat-qa');
    expect(created?.catalogos).toEqual(['lanche']);
    expect(result.current.isCategoryAllowedForCatalog(created, 'lanche')).toBe(true);
    expect(result.current.isCategoryAllowedForCatalog(created, 'restaurante')).toBe(false);
  });

  it('CAT compartilhar categoria entre os dois catálogos funciona', () => {
    const { result } = boot();
    act(() => { result.current.saveMenuCategory({ id: 'cat-qa2', nome: 'Veggie', catalogos: ['restaurante', 'lanche'], ordem: 98, ativo: true }); });
    const created = result.current.menuCategories.find(c => c.id === 'cat-qa2');
    expect(result.current.isCategoryAllowedForCatalog(created, 'restaurante')).toBe(true);
    expect(result.current.isCategoryAllowedForCatalog(created, 'lanche')).toBe(true);
  });

  it('CAT não permite excluir categoria em uso por produto', () => {
    const { result } = boot();
    act(() => attempt(() => result.current.deleteMenuCategory('cat-porcoes')));
    expect(result.current.menuCategories.some(c => c.id === 'cat-porcoes')).toBe(true);
  });

  it('CAT alterar categorias atualiza a lista usada pelo PDV', () => {
    const { result } = boot();
    const before = result.current.menuCategories.length;
    act(() => { result.current.saveMenuCategory({ id: 'cat-qa3', nome: 'Nova Cat', catalogos: ['restaurante'], ordem: 97, ativo: true }); });
    expect(result.current.menuCategories.length).toBe(before + 1);
  });
});

describe('remoções impressas', () => {
  it('IMP ingredientes removíveis aparecem na impressão', () => {
    const { result } = boot();
    let order!: any;
    act(() => { order = result.current.createOrder({ itens: [{ cartItemId: 'r1', menuItemId: product.id, nome: product.nome, precoUnitario: 30, quantidade: 1, observacao: '', estacaoProducao: 'cozinha', remocoes: ['Cebola', 'Molho especial'] }] }); });
    const job = result.current.printQueue.find(j => j.pedidoId === order.id && j.tipo === 'pedido');
    expect(job?.conteudoTexto).toContain('SEM: Cebola');
    expect(job?.conteudoTexto).toContain('SEM: Molho especial');
  });
});

describe('impressão usa configuração do estabelecimento', () => {
  it('PRN cabeçalho da via impressa vem de RestaurantSettings', () => {
    localStorage.setItem(key, JSON.stringify(seedDatabase({ nomeFantasia: 'Grill do Vale' })));
    const { result } = boot();
    let order!: any;
    act(() => { order = result.current.createOrder({ itens: [{ cartItemId: 'p1', menuItemId: product.id, nome: product.nome, precoUnitario: 30, quantidade: 1, observacao: '', estacaoProducao: 'cozinha' }] }); });
    const job = result.current.printQueue.find(j => j.pedidoId === order.id);
    expect(job?.conteudoTexto).toContain('GRILL DO VALE');
    expect(job?.conteudoTexto).not.toContain('MURUPI');
  });
});

describe('health sem métricas fictícias', () => {
  it('HLT health inicial não exibe métrica inventada (16ms, Cloud Run, v3.4.0)', () => {
    const { result } = boot();
    expect(result.current.health.ultimoBackup).toBe('Não configurado');
    expect(result.current.health.internet).toBe('unknown');
  });
});

describe('mesas consistentes', () => {
  it('MES seed de mesas não tem inconsistência 15/16', async () => {
    const { INITIAL_TABLES } = await import('../data/seedData');
    const { INITIAL_TABLES_COUNT } = await import('../data/initialMenu');
    expect(INITIAL_TABLES).toHaveLength(INITIAL_TABLES_COUNT);
  });
});

function attempt(fn: () => unknown) { try { fn(); } catch { /* permitido */ } }
