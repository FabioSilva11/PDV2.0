import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 2;

export type DatabaseBootstrapStatus = 'loading' | 'ready' | 'empty' | 'error';

/** Raiz do projeto resolvida a partir do próprio módulo (nunca do cwd frágil). */
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const dataDir = path.join(projectRoot, 'data');
export const defaultDbPath = path.join(dataDir, 'pdv.sqlite');
export const migrationsDir = path.join(projectRoot, 'server', 'db', 'migrations');

/**
 * Pasta de backups derivada do arquivo do banco. Acompanhar o arquivo em vez
 * de usar um caminho fixo evita que um banco de teste/customizado espalhe
 * backups dentro de `data/` do projeto.
 */
export const getBackupsDir = (): string => path.join(path.dirname(dbFilePath()), 'backups');

export const dbFilePath = (): string => {
  const configured = process.env.SQLITE_DB_PATH?.trim();
  if (!configured) return defaultDbPath;
  return path.isAbsolute(configured) ? configured : path.join(projectRoot, configured);
};

let connection: DatabaseSync | null = null;
let currentFile = '';
let lastError: string | null = null;
let bootstrap: DatabaseBootstrapStatus = 'loading';
let lastWriteAt: string | null = null;
let schemaVersion = 0;

export const getBootstrapStatus = (): DatabaseBootstrapStatus => bootstrap;

export const getDatabaseFile = (): string => currentFile || dbFilePath();

export const getSchemaVersion = (): number => schemaVersion;

export const getLastWriteAt = (): string | null => lastWriteAt;

export const getLastError = (): string | null => lastError;

/**
 * Executa o DDL de um arquivo .sql. O splitter ignora comentários (--) para que
 * nenhuma linha comentada seja descartada junto com o statement inteiro.
 */
const runSqlScript = (db: DatabaseSync, sql: string): void => {
  const withoutComments = sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  for (const statement of withoutComments.split(';')) {
    const trimmed = statement.trim();
    if (trimmed) db.exec(trimmed);
  }
};

const readMeta = (db: DatabaseSync, key: string): string | null => {
  const row = db.prepare('SELECT value FROM database_meta WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
};

/**
 * Aplica as migrations de `server/db/migrations` ainda não registradas em
 * `database_meta.applied_migrations`. Cada arquivo roda em transação própria e
 * é marcado como aplicado, então reiniciar o PDV no meio não repete nem
 * duplica nada.
 *
 * `ALTER TABLE ADD COLUMN` não é idempotente no SQLite; "duplicate column
 * name" significa que a coluna já existe, ou seja, a migration já cumpriu seu
 * papel — isso é tratado como sucesso e o arquivo segue marcado.
 */
const runMigrations = (db: DatabaseSync): number => {
  if (!fs.existsSync(migrationsDir)) return 0;

  const applied = new Set((readMeta(db, 'applied_migrations') ?? '').split(',').map(s => s.trim()).filter(Boolean));
  const files = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec('BEGIN IMMEDIATE');
    try {
      runSqlScript(db, sql);
      applied.add(file);
      db.prepare(
        `INSERT INTO database_meta (key, value) VALUES ('applied_migrations', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run([...applied].join(','));
      db.exec('COMMIT');
      console.log(`[SQLite] Migration aplicada: ${file}`);
      count += 1;
    } catch (error: any) {
      db.exec('ROLLBACK');
      if (/duplicate column name|already exists/i.test(String(error?.message))) {
        // Já estava no banco (banco aberto por uma versão anterior do app).
        applied.add(file);
        db.prepare(
          `INSERT INTO database_meta (key, value) VALUES ('applied_migrations', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        ).run([...applied].join(','));
        console.log(`[SQLite] Migration já aplicada: ${file}`);
        count += 1;
        continue;
      }
      throw error;
    }
  }
  return count;
};

export const setMeta = (key: string, value: string, db: DatabaseSync | null = null): void => {
  const target = db ?? connection;
  if (!target) throw new Error('Banco não inicializado.');
  target
    .prepare('INSERT INTO database_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
};

export const getMeta = (key: string): string | null => (connection ? readMeta(connection, key) : null);

/**
 * Bootstrap do banco: cria o diretório/arquivo, aplica o schema e valida.
 * Idempotente — pode rodar em toda inicialização.
 */
export const openDatabase = (file?: string): DatabaseSync => {
  const target = file ?? dbFilePath();

  if (connection && currentFile === target) return connection;

  console.log('[SQLite] Abrindo banco...');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(getBackupsDir(), { recursive: true });

  const existed = fs.existsSync(target);
  const db = new DatabaseSync(target);

  // WAL + sincronização normal: grava no disco a cada commit e permite leitura
  // concorrente, o que torna o VACUUM INTO (backup) seguro com o PDV rodando.
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  runSqlScript(db, fs.readFileSync(path.join(projectRoot, 'server', 'db', 'schema.sql'), 'utf8'));
  console.log('[SQLite] Schema verificado.');

  runMigrations(db);

  const stored = Number(readMeta(db, 'schema_version') ?? 0);
  if (stored < SCHEMA_VERSION) {
    setMeta('schema_version', String(SCHEMA_VERSION), db);
    schemaVersion = SCHEMA_VERSION;
    console.log(`[SQLite] Schema migrado para a versão ${SCHEMA_VERSION}.`);
  } else {
    schemaVersion = stored;
  }

  connection = db;
  currentFile = target;
  lastError = null;
  lastWriteAt = readMeta(db, 'last_write_at');
  bootstrap = isDatabaseEmpty(db) ? 'empty' : 'ready';

  console.log(existed
    ? `[SQLite] Banco encontrado em ${target}.`
    : `[SQLite] Banco criado em ${target}.`);
  console.log(`[SQLite] Banco pronto (${bootstrap}).`);

  return db;
};

export const getDb = (): DatabaseSync => {
  if (!connection) openDatabase();
  if (!connection) throw new Error('Banco de dados local indisponível.');
  return connection;
};

export const closeDatabase = (): void => {
  if (!connection) return;
  try {
    connection.close();
  } catch {
    // Fecha silenciosamente: o Node já vai encerrar o processo.
  }
  connection = null;
  currentFile = '';
  bootstrap = 'loading';
};

/** O banco está "vazio" quando nenhuma tabela de negócio tem registro. */
export const isDatabaseEmpty = (db: DatabaseSync = getDb()): boolean => {
  const tables = [
    'restaurant_settings', 'users', 'menu_items', 'menu_categories', 'customers',
    'reservations', 'orders', 'accounts', 'payments', 'cash_transactions',
    'turnos_operacionais', 'printers', 'print_jobs', 'audit_logs', 'tables'
  ];
  for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number };
    if (Number(row?.total ?? 0) > 0) return false;
  }
  return true;
};

/**
 * Operações críticas rodam dentro de transação: qualquer erro executa ROLLBACK
 * e nada fica gravado pela metade.
 */
export const transaction = <T>(work: (db: DatabaseSync) => T): T => {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work(db);
    db.exec('COMMIT');
    const stamp = new Date().toISOString();
    setMeta('last_write_at', stamp);
    lastWriteAt = stamp;
    // O status precisa acompanhar a gravação: sem isto, o primeiro POST do
    // SetupWizard deixava o banco como "empty" e a tela continuava pedindo
    // configuração mesmo com tudo salvo.
    bootstrap = 'ready';
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // A transação já pode ter sido desfeita pelo próprio SQLite.
    }
    throw error;
  }
};

/** Verificação de integridade do arquivo (usada pela tela de saúde). */
export const checkIntegrity = (): { ok: boolean; detail: string } => {
  try {
    const db = getDb();
    const row = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    const result = String(row?.integrity_check ?? 'unknown');
    if (result === 'ok') return { ok: true, detail: 'Banco íntegro' };
    lastError = result;
    return { ok: false, detail: `Integridade comprometida: ${result}` };
  } catch (error: any) {
    lastError = error?.message || 'Falha ao verificar integridade';
    return { ok: false, detail: lastError };
  }
};

export const getDatabaseStatus = () => {
  const file = getDatabaseFile();
  const exists = fs.existsSync(file);
  return {
    engine: 'sqlite',
    status: bootstrap,
    file,
    exists,
    sizeBytes: exists ? fs.statSync(file).size : 0,
    schemaVersion,
    lastWriteAt,
    lastError
  };
};

export const markBootstrapError = (error: unknown): void => {
  lastError = error instanceof Error ? error.message : String(error);
  bootstrap = 'error';
  console.error('[SQLite] ERRO:', lastError);
};
