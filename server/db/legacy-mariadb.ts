import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { getDb, setMeta, getMeta, dataDir } from './sqlite';
import { countEntities, saveSnapshotValidated } from './repository';
import { createBackup } from './backup';

export interface LegacySnapshotReader {
  /** Nome do mecanismo legado, para registro em database_meta. */
  readonly source: string;
  /** Retorna o snapshot legado ou null quando não há instalação antiga. */
  read(): Promise<Row | null>;
  /** Grava uma cópia de segurança dos dados originais. */
  export?(destination: string): Promise<void>;
}

type Row = Record<string, any>;

/**
 * Env do legado só é consultado durante a migração. A fonte de verdade do
 * sistema é o SQLite; nada aqui é chamado no runtime normal.
 */
const legacyEnv = (key: string): string | undefined => {
  const fromEnv = process.env[key];
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv;

  const envPath = path.join(dataDir, '..', '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find(entry => entry.trim().startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
};

export const isLegacyConfigured = (): boolean => Boolean(legacyEnv('LEGACY_DB_NAME') || legacyEnv('LEGACY_DB_HOST'));

/**
 * Leitor MariaDB legado. `mysql2` é carregado dinamicamente: se não estiver
 * instalado (instalação já migrada), o runtime do PDV continua funcionando.
 */
export const createMariaDbReader = async (): Promise<LegacySnapshotReader | null> => {
  let mysql: any;
  try {
    mysql = await import('mysql2/promise');
  } catch {
    console.log('[Migration] mysql2 indisponível — nenhuma instalação legada pode ser lida.');
    return null;
  }

  const config = {
    host: legacyEnv('LEGACY_DB_HOST') || 'localhost',
    port: Number(legacyEnv('LEGACY_DB_PORT')) || 3306,
    user: legacyEnv('LEGACY_DB_USER') || 'root',
    password: legacyEnv('LEGACY_DB_PASSWORD') || '',
    database: legacyEnv('LEGACY_DB_NAME') || ''
  };

  if (!config.database) return null;

  return {
    source: 'mariadb',
    async read() {
      let connection: any;
      try {
        connection = await mysql.createConnection({ ...config, connectTimeout: 5000 });
        const [rows] = await connection.query(
          'SELECT data FROM app_state WHERE id = ? LIMIT 1',
          ['restaurant_snapshot']
        );
        if (!rows?.length || !rows[0]?.data) return null;
        return JSON.parse(rows[0].data) as Row;
      } finally {
        await connection?.end().catch(() => undefined);
      }
    },
    async export(destination) {
      const connection = await mysql.createConnection({ ...config, connectTimeout: 5000 });
      try {
        const [rows] = await connection.query('SELECT * FROM app_state');
        fs.writeFileSync(destination, JSON.stringify(rows, null, 2), 'utf8');
      } finally {
        await connection.end().catch(() => undefined);
      }
    }
  };
};

export interface MigrationReport {
  migrated: boolean;
  reason: string;
  countsBefore?: Record<string, number>;
  countsAfter?: Record<string, number>;
  mismatches?: string[];
}

/**
 * Compara as entidades relevantes entre a origem e o destino. Uma migração só
 * é considerada concluída quando os totais batem. Recebe a conexão em uso pela
 * transação para validar o que ainda não foi confirmado.
 */
export const validateMigration = (
  source: Row,
  countsBefore: Record<string, number>,
  db: DatabaseSync = getDb()
): string[] => {
  const after = countEntities(db);
  const mismatches: string[] = [];

  const expectations: [string, number][] = [
    ['usuarios', asArray(source.users).length],
    ['produtos', asArray(source.menu).length],
    ['categorias', asArray(source.menuCategories).length],
    ['clientes', asArray(source.customers).length],
    ['reservas', asArray(source.reservations).length],
    ['pedidos', asArray(source.orders).length],
    ['itens_pedido', asArray<Row>(source.orders).reduce((total, order) => total + asArray(order?.itens ?? order?.items).length, 0)],
    ['contas', asArray(source.accounts).length],
    ['pagamentos', asArray(source.payments).length + asArray<Row>(source.orders).reduce((total, order) => total + asArray(order?.pagamentos ?? order?.payments).length, 0)],
    ['mesas', asArray(source.tables).length],
    ['formas_pagamento', asArray(source.paymentOptions).length],
    ['turnos', turnosFrom(source).length],
    ['transacoes_caixa', asArray((source.cashRegister as Row)?.transacoes).length],
    ['impressoras', asArray(source.printers).length],
    ['trabalhos_impressao', asArray(source.printQueue).length],
    ['logs', asArray(source.auditLogs).length]
  ];

  for (const [label, expected] of expectations) {
    const actual = after[label] ?? 0;
    if (expected !== actual) mismatches.push(`${label}: origem=${expected} destino=${actual}`);
  }

  // `setupComplete` precisa sobreviver: sem isso o app cairia no SetupWizard
  // depois de migrar e o usuário teria que configurar tudo de novo.
  if (source.settings && !db.prepare("SELECT 1 FROM restaurant_settings WHERE id = 'singleton'").get()) {
    mismatches.push('configurações do estabelecimento ausentes no destino');
  }

  // IDs precisam ser preservados, não recriados.
  const idChecks: [string, Row[]][] = [
    ['users', asArray<Row>(source.users)],
    ['accounts', asArray<Row>(source.accounts)],
    ['customers', asArray<Row>(source.customers)],
    ['menu_items', asArray<Row>(source.menu)],
    ['tables', asArray<Row>(source.tables)],
    ['reservations', asArray<Row>(source.reservations)],
    ['printers', asArray<Row>(source.printers)]
  ];
  for (const [table, rows] of idChecks) {
    for (const entity of rows) {
      if (!entity?.id) continue;
      const found = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(String(entity.id));
      if (!found) mismatches.push(`${table}: id ${entity.id} não preservado`);
    }
  }

  for (const order of asArray<Row>(source.orders)) {
    if (!order?.id) continue;
    const row = db.prepare('SELECT id FROM orders WHERE id = ?').get(String(order.id));
    if (!row) mismatches.push(`pedido ${order.id} não encontrado no destino`);
  }

  // O vínculo do item com o cardápio é o que permite reprint e espelho: se a
  // relação se perder, o pedido continua existindo mas some da impressão.
  for (const order of asArray<Row>(source.orders)) {
    for (const item of asArray<Row>(order?.itens ?? order?.items)) {
      const itemId = item?.cartItemId ?? item?.id;
      if (!itemId) continue;
      const row = db.prepare('SELECT menu_item_id FROM order_items WHERE id = ?').get(String(itemId)) as
        | { menu_item_id: string | null }
        | undefined;
      if (!row) {
        mismatches.push(`item ${itemId} do pedido ${order.id} não foi importado`);
      } else if (item.menuItemId && row.menu_item_id !== String(item.menuItemId)) {
        mismatches.push(`item ${itemId} perdeu o vínculo com menuItemId ${item.menuItemId}`);
      }
    }
  }

  if (countsBefore.usuarios && after.usuarios < countsBefore.usuarios) {
    mismatches.push('perda de usuários em relação ao banco já existente');
  }

  return mismatches;
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const turnosFrom = (source: Row): Row[] => {
  const cash = source.cashRegister as Row | undefined;
  if (!cash) return [];
  return [
    ...(cash.turnoAtual && !Array.isArray(cash.turnoAtual) ? [cash.turnoAtual as Row] : []),
    ...asArray<Row>(cash.turnosHistorico)
  ].filter(turno => Boolean((turno as Row)?.id));
};

/**
 * Migração única. Só roda quando o SQLite está vazio e existe uma instalação
 * legada. Interrompida no meio, a próxima execução repete com segurança porque
 * toda a gravação é feita por ID em uma única transação.
 */
export const runLegacyMigration = async (reader: LegacySnapshotReader): Promise<MigrationReport> => {
  const db = getDb();
  const countsBefore = countEntities(db);

  if (getMeta('migration_status') === 'completed') {
    return { migrated: false, reason: 'Migração já concluída anteriormente.' };
  }
  if (Object.values(countsBefore).some(total => total > 0)) {
    return { migrated: false, reason: 'SQLite já possui dados — migração ignorada.' };
  }

  console.log(`[Migration] ${reader.source} legado configurado. Lendo dados...`);
  let source: Row | null = null;
  try {
    source = await reader.read();
  } catch (error: any) {
    console.error('[Migration] ERRO ao ler a origem:', error?.message);
    console.error('[Migration] Banco SQLite não foi marcado como migrado.');
    console.error('[Migration] Dados originais permanecem intactos.');
    return { migrated: false, reason: `Falha ao ler a origem: ${error?.message}` };
  }

  if (!source) {
    return { migrated: false, reason: 'Nenhum snapshot encontrado na origem legada.' };
  }

  // 1. Backup antes de qualquer escrita.
  const backup = createBackup('pre-migracao');
  if (backup.success) {
    console.log(`[Migration] Backup criado em ${backup.file}`);
  } else {
    console.warn(`[Migration] Aviso: backup não gerado (${backup.error}). Prosseguindo.`);
  }

  // Cópia bruta do legado, para recuperação independente do SQLite.
  try {
    if (reader.export) {
      const dump = path.join(dataDir, `legacy-${reader.source}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      await reader.export(dump);
      console.log(`[Migration] Exportação de segurança salva em ${dump}`);
    }
  } catch (error: any) {
    console.warn(`[Migration] Aviso: exportação do legado falhou (${error?.message}).`);
  }

  // 2. Gravação + validação na MESMA transação. Se a validação divergir, o
  //    ROLLBACK devolve o banco ao estado vazio — nunca deixamos meio banco
  //    importado. `saveSnapshot` sozinho já abriria a própria transação.
  let mismatches: string[] = [];
  try {
    console.log('[Migration] Gravando dados no SQLite...');
    saveSnapshotValidated(source as Row, (db) => {
      mismatches = validateMigration(source as Row, countsBefore, db);
      return mismatches;
    });
  } catch (error: any) {
    console.error('[Migration] ERRO ao gravar/validar:', error?.message);
    console.error('[Migration] Transação revertida: o SQLite continua vazio.');
    console.error('[Migration] Dados originais permanecem intactos.');
    setMeta('migration_status', 'failed');
    return {
      migrated: false,
      reason: `Falha ao gravar: ${error?.message}`,
      mismatches: error?.mismatches ?? []
    };
  }

  // 3. Só então marca como concluída — nunca repetida nas próximas execuções.
  setMeta('migration_status', 'completed');
  setMeta('migrated_from', reader.source);
  setMeta('migration_completed_at', new Date().toISOString());

  const countsAfter = countEntities(db);
  console.log('[Migration] Migração concluída.');
  return { migrated: true, reason: 'ok', countsBefore, countsAfter, mismatches: [] };
};

/**
 * Ponto de entrada do backend: usa o SQLite quando ele já tem dados, migra o
 * legado uma única vez e segue. Sem MariaDB no caminho normal.
 */
export const bootstrapMigrations = async (): Promise<MigrationReport> => {
  const db = getDb();
  const empty = Object.values(countEntities(db)).every(total => total === 0);

  if (!empty) {
    return { migrated: false, reason: 'SQLite já possui dados.' };
  }
  if (getMeta('migration_status') === 'completed') {
    return { migrated: false, reason: 'Migração já concluída anteriormente.' };
  }
  if (!isLegacyConfigured()) {
    return { migrated: false, reason: 'Nenhuma instalação legada configurada.' };
  }

  const reader = await createMariaDbReader();
  if (!reader) return { migrated: false, reason: 'Sem leitor legado disponível.' };

  return runLegacyMigration(reader);
};
