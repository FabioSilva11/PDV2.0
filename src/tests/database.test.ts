import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cada teste abre um banco SQLite isolado em pasta temporária, para não tocar no
 * arquivo real de `data/pdv.sqlite`. Os módulos leem o caminho do ambiente no
 * momento da abertura, por isso importamos dinamicamente depois de definir
 * SQLITE_DB_PATH.
 */
const makeSnapshot = (overrides: Record<string, unknown> = {}) => ({
  operationalDemoResetApplied: true,
  settings: {
    id: 'singleton',
    nomeFantasia: 'Restaurante Teste',
    razaoSocial: 'Teste LTDA',
    cnpj: '11222333000144',
    setupComplete: true
  },
  menuCategories: [{ id: 'cat-1', nome: 'Bebidas', cor: '#f97316' }],
  menu: [
    {
      id: 'item-1',
      nome: 'Coca-Cola',
      preco: 6.5,
      categoria: 'Bebidas',
      catalogo: 'restaurante',
      disponivel: true
    }
  ],
  accounts: [{ id: 'acc-1', numero: 1, tipo: 'mesa', status: 'aberta', abertaEm: '2026-09-28T12:00:00.000Z' }],
  orders: [
    {
      id: 'ped-1',
      numero: 1,
      contaId: 'acc-1',
      contaNumero: 1,
      status: 'aberta',
      total: 13,
      criadoEm: '2026-09-28T12:00:00.000Z',
      itens: [{ cartItemId: 'ci-1', menuItemId: 'item-1', nome: 'Coca-Cola', quantidade: 2, precoUnitario: 6.5 }],
      pagamentos: [{ id: 'pay-1', formaId: 'dinheiro', formaNome: 'Dinheiro', valor: 13, contaId: 'acc-1' }]
    }
  ],
  paymentOptions: [{ id: 'dinheiro', nome: 'Dinheiro', ativo: true, permiteTroco: true }],
  tables: [{ id: 'tab-1', numero: 1, capacidade: 4, status: 'livre' }],
  customers: [{ id: 'cus-1', nome: 'João', telefone: '11999999999' }],
  reservations: [{ id: 'res-1', clienteNome: 'João', data: '2026-09-30', hora: '19:00', pessoas: 2 }],
  printers: [{ id: 'pr-1', nome: 'Cozinha', tipo: 'rede', ip: '192.168.0.50', porta: 9100, status: 'online', padrao: true }],
  printQueue: [{ id: 'job-1', impressoraId: 'pr-1', status: 'concluido', criadoEm: '2026-09-28T12:00:00.000Z' }],
  users: [{ id: 'usr-1', nome: 'Admin', usuario: 'admin', senhaHash: 'hash', perfil: 'administrador' }],
  auditLogs: [{ id: 'log-1', acao: 'abriu pedido', entidade: 'pedido', entidadeId: 'ped-1', dataHora: '2026-09-28T12:00:00.000Z' }],
  cashRegister: {
    id: 'caixa-principal',
    aberto: true,
    saldoInicial: 0,
    saldoAtualGaveta: 0,
    turnoAtual: { id: 'turno-1', abertoEm: '2026-09-28T12:00:00.000Z', saldoInicial: 0 },
    transacoes: [{ id: 'tx-1', tipo: 'venda', valor: 13, motivo: 'Pedido ped-1', horario: '2026-09-28T12:00:01.000Z', operador: 'Admin' }],
    turnosHistorico: []
  },
  ...overrides
});

let tempDir = '';
const loadDb = async () => {
  const sqlite = await import('../../server/db/sqlite');
  const repository = await import('../../server/db/repository');
  return { sqlite, repository };
};

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdv-db-'));
  process.env.SQLITE_DB_PATH = path.join(tempDir, 'test.sqlite');
  vi.resetModules();
});

afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* arquivo pode estar aberto pelo SQLite */
  }
});

describe('SQLite local', () => {
  it('cria o arquivo e as tabelas estruturadas no primeiro start', async () => {
    const { sqlite } = await loadDb();
    sqlite.openDatabase();
    const db = sqlite.getDb();

    expect(fs.existsSync(path.join(tempDir, 'test.sqlite'))).toBe(true);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const expected of [
      'users',
      'menu_items',
      'orders',
      'order_items',
      'accounts',
      'payments',
      'cash_register',
      'printers',
      'print_jobs',
      'audit_logs',
      'restaurant_settings',
      'database_meta'
    ]) {
      expect(tables).toContain(expected);
    }
    expect(sqlite.getBootstrapStatus()).toBe('empty');
    expect(sqlite.checkIntegrity().ok).toBe(true);
    sqlite.closeDatabase();
  });

  it('grava e lê o snapshot preservando IDs e relacionamentos', async () => {
    const { sqlite, repository } = await loadDb();
    sqlite.openDatabase();
    repository.saveSnapshot(makeSnapshot() as any);

    const loaded = repository.loadSnapshot() as any;
    expect(loaded).not.toBeNull();
    expect(loaded.settings.nomeFantasia).toBe('Restaurante Teste');
    expect(loaded.settings.setupComplete).toBe(true);
    expect(loaded.orders[0].id).toBe('ped-1');

    const db = sqlite.getDb();
    const item = db.prepare('SELECT menu_item_id, order_id, quantidade, preco FROM order_items WHERE id = ?').get('ci-1') as any;
    expect(item.menu_item_id).toBe('item-1');
    expect(item.order_id).toBe('ped-1');
    expect(item.quantidade).toBe(2);
    expect(item.preco).toBe(6.5);
    const payment = db.prepare('SELECT conta_id, forma_id, valor FROM payments WHERE id = ?').get('pay-1') as any;
    expect(payment.conta_id).toBe('acc-1');
    expect(payment.forma_id).toBe('dinheiro');
    expect(payment.valor).toBe(13);
    sqlite.closeDatabase();
  });

  it('preserva catalogos múltiplos do produto no SQLite (raw_data + coluna)', async () => {
    const { sqlite, repository } = await loadDb();
    sqlite.openDatabase();
    const snap = makeSnapshot();
    snap.menu = [{ id: 'item-dual', nome: 'Fritas', preco: 20, categoria: 'Porções Extras', catalogos: ['restaurante', 'lanche'], disponivel: true }] as any;
    repository.saveSnapshot(snap as any);

    const db = sqlite.getDb();
    const row = db.prepare('SELECT catalogos FROM menu_items WHERE id = ?').get('item-dual') as any;
    expect(JSON.parse(row.catalogos)).toEqual(['restaurante', 'lanche']);

    const loaded = repository.loadSnapshot() as any;
    expect(loaded.menu.find((m: any) => m.id === 'item-dual').catalogos).toEqual(['restaurante', 'lanche']);
    sqlite.closeDatabase();
  });

  it('migra legado catalogo único para catalogos sem duplicar', async () => {
    const { sqlite, repository } = await loadDb();
    sqlite.openDatabase();
    const snap = makeSnapshot();
    snap.menu = [{ id: 'item-legacy', nome: 'X-Burger', preco: 15, categoria: 'Lanches & Burgers', catalogo: 'lanche', disponivel: true }] as any;
    repository.saveSnapshot(snap as any);

    const db = sqlite.getDb();
    const row = db.prepare('SELECT catalogos FROM menu_items WHERE id = ?').get('item-legacy') as any;
    expect(JSON.parse(row.catalogos)).toEqual(['lanche']);
    sqlite.closeDatabase();
  });

  it('mantém o snapshot após reabrir o banco (persistência real)', async () => {
    const first = await loadDb();
    first.sqlite.openDatabase();
    first.repository.saveSnapshot(makeSnapshot() as any);
    first.sqlite.closeDatabase();

    const second = await loadDb();
    second.sqlite.openDatabase();
    expect(second.sqlite.getBootstrapStatus()).toBe('ready');
    const reloaded = second.repository.loadSnapshot() as any;
    expect(reloaded.accounts[0].id).toBe('acc-1');
    expect(reloaded.customers[0].nome).toBe('João');
    second.sqlite.closeDatabase();
  });

  it('não considera banco vazio quando só existem dados de negócio', async () => {
    const { sqlite, repository } = await loadDb();
    sqlite.openDatabase();
    // snapshot sem settings: um bug antigo fazia o app cair no SetupWizard.
    repository.saveSnapshot(makeSnapshot({ settings: undefined }) as any);
    expect(sqlite.getBootstrapStatus()).toBe('ready');
    sqlite.closeDatabase();
  });

  it('reverte a gravação inteira em caso de erro', async () => {
    const { sqlite, repository } = await loadDb();
    sqlite.openDatabase();
    repository.saveSnapshot(makeSnapshot() as any);
    const before = repository.countEntities();

    // Duas contas com o mesmo número violam o índice único no meio da gravação:
    // nada pode sobrar pela metade depois do ROLLBACK.
    const conflicting = makeSnapshot();
    conflicting.accounts = [
      { id: 'acc-a', numero: 77, status: 'aberta', abertaEm: '2026-09-28T12:00:00.000Z' },
      { id: 'acc-b', numero: 77, status: 'aberta', abertaEm: '2026-09-28T12:00:00.000Z' }
    ] as any;
    conflicting.orders = [] as any;
    expect(() => repository.saveSnapshot(conflicting as any)).toThrow();

    // O snapshot anterior continua intacto: a gravação que falhou não partially applied.
    expect(repository.countEntities().contas).toBe(before.contas);
    expect(repository.countEntities().pedidos).toBe(before.pedidos);
    const loaded = repository.loadSnapshot() as any;
    expect(loaded.orders[0].id).toBe('ped-1');
    expect(loaded.accounts.map((a: any) => a.id).sort()).toEqual(['acc-1']);
    sqlite.closeDatabase();
  });

  it('gera backup e permite restaurar', async () => {
    const { sqlite, repository } = await loadDb();
    const backup = await import('../../server/db/backup');
    sqlite.openDatabase();
    repository.saveSnapshot(makeSnapshot() as any);

    const created = backup.createBackup('teste');
    expect(created.success).toBe(true);
    expect(fs.existsSync(created.file!)).toBe(true);
    sqlite.closeDatabase();

    const second = await loadDb();
    second.sqlite.openDatabase();
    const listed = backup.listBackups();
    expect(listed.some((item: any) => item.caminho === created.file)).toBe(true);

    const restored = await backup.restoreBackup(created.file!);
    expect(restored.success).toBe(true);
    const reloaded = second.repository.loadSnapshot() as any;
    expect(reloaded.orders[0].id).toBe('ped-1');
    second.sqlite.closeDatabase();
  });
});

describe('Migração do legado', () => {
  it('conta o snapshot e valida todas as entidades', async () => {
    const { sqlite, repository } = await loadDb();
    const legacy = await import('../../server/db/legacy-mariadb');
    sqlite.openDatabase();
    repository.saveSnapshot(makeSnapshot() as any);
    const before = repository.countEntities();

    const mismatches = legacy.validateMigration(makeSnapshot() as any, before, sqlite.getDb());
    expect(mismatches).toEqual([]);
    sqlite.closeDatabase();
  });

  it('detecta perda de dados em vez de marcar a migração como concluída', async () => {
    const { sqlite, repository } = await loadDb();
    const legacy = await import('../../server/db/legacy-mariadb');
    sqlite.openDatabase();

    // Origem com 2 pedidos, destino vazio: a validação precisa acusar a perda.
    const source = makeSnapshot();
    (source.orders as any[]).push({ id: 'ped-2', accountId: 'acc-1', status: 'aberta', total: 0, items: [], payments: [] });
    const mismatches = legacy.validateMigration(source as any, {}, sqlite.getDb());
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches.join(' ')).toContain('pedidos');
    sqlite.closeDatabase();
  });

  it('não tenta migrar quando o SQLite já tem dados', async () => {
    const { sqlite, repository } = await loadDb();
    const legacy = await import('../../server/db/legacy-mariadb');
    sqlite.openDatabase();
    repository.saveSnapshot(makeSnapshot() as any);

    const report = await legacy.runLegacyMigration({
      source: 'teste',
      read: async () => makeSnapshot() as any
    });
    expect(report.migrated).toBe(false);
    expect(sqlite.getMeta('migration_status')).not.toBe('completed');
    sqlite.closeDatabase();
  });

  it('grava e marca a migração como concluída quando a origem é válida', async () => {
    const { sqlite } = await loadDb();
    const legacy = await import('../../server/db/legacy-mariadb');
    sqlite.openDatabase();

    const report = await legacy.runLegacyMigration({
      source: 'teste',
      read: async () => makeSnapshot() as any
    });

    expect(report.migrated).toBe(true);
    expect(sqlite.getMeta('migration_status')).toBe('completed');
    expect(sqlite.getMeta('migrated_from')).toBe('teste');
    const loaded = (await import('../../server/db/repository')).loadSnapshot() as any;
    expect(loaded.orders[0].id).toBe('ped-1');
    sqlite.closeDatabase();
  });

  it('reverte tudo e não marca como concluído quando a validação falha', async () => {
    const { sqlite, repository } = await loadDb();
    const legacy = await import('../../server/db/legacy-mariadb');
    sqlite.openDatabase();

    // Dado legado sujo: um pagamento sem `id` não pode ser importado (não há
    // chave para gravar) e nem pode ser descartado em silêncio. A validação
    // tem que acusar a divergência e a transação inteira tem que voltar.
    const source = makeSnapshot();
    (source.orders as any)[0].pagamentos.push({ formaId: 'dinheiro', formaNome: 'Dinheiro', valor: 5 });

    const report = await legacy.runLegacyMigration({ source: 'teste', read: async () => source as any });

    expect(report.migrated).toBe(false);
    expect(report.mismatches.length).toBeGreaterThan(0);
    expect(sqlite.getMeta('migration_status')).not.toBe('completed');
    // Rollback real: nenhum pedido sobrou pela metade.
    expect(repository.countEntities().pedidos).toBe(0);
    expect(repository.countEntities().pagamentos).toBe(0);
    expect(repository.loadSnapshot()).toBeNull();
    sqlite.closeDatabase();
  });

  it('ignora banco legado vazio e não marca como migrado', async () => {
    const { sqlite } = await loadDb();
    const legacy = await import('../../server/db/legacy-mariadb');
    sqlite.openDatabase();

    const report = await legacy.runLegacyMigration({ source: 'teste', read: async () => null });
    expect(report.migrated).toBe(false);
    expect(sqlite.getMeta('migration_status')).not.toBe('completed');
    sqlite.closeDatabase();
  });
});
