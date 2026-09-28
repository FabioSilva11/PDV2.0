import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import databaseRouter from './routes/database';
import printersRouter from './routes/printers';
import {
  openDatabase,
  closeDatabase,
  getBootstrapStatus,
  getDatabaseStatus,
  getSchemaVersion,
  checkIntegrity,
  markBootstrapError,
  projectRoot
} from './db/sqlite';
import { bootstrapMigrations } from './db/legacy-mariadb';
import { getLastBackup, createBackup } from './db/backup';

dotenv.config({ path: path.join(projectRoot, '.env') });

// `node:sqlite` ainda emite ExperimentalWarning no Node 24. O aviso é esperado
// e não interessa no console do PDV; os demais avisos continuam passando.
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name !== 'ExperimentalWarning') console.warn(warning);
});

const app = express();
const port = Number(process.env.SERVER_PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/database', databaseRouter);
app.use('/api/printers', printersRouter);

/**
 * Saúde do backend. `database` substitui o antigo bloco `mariadb`: o PDV não
 * depende mais de nenhum servidor de banco externo.
 */
app.get('/api/health', (_req, res) => {
  const status = getDatabaseStatus();
  const integrity = checkIntegrity();
  const backup = getLastBackup();

  res.json({
    status: getBootstrapStatus() === 'error' ? 'degraded' : 'ok',
    timestamp: new Date().toISOString(),
    engine: 'sqlite',
    bootstrap: getBootstrapStatus(),
    database: {
      ...status,
      integrity,
      lastBackupAt: backup.at
    }
  });
});

/**
 * Bootstrap real: o backend só fica pronto depois que o arquivo existe, o
 * schema está aplicado e a migração legada (quando necessária) terminou.
 */
async function start(): Promise<void> {
  console.log('[Servidor Local] Iniciando backend do PDV...');

  try {
    openDatabase();

    const migration = await bootstrapMigrations();
    if (migration.migrated) {
      console.log('[Migration] Migração do banco legado concluída.');
    } else {
      console.log(`[Migration] ${migration.reason}`);
    }

    // Backup de segurança na inicialização (§30): o PDV mostra "Último backup".
    const backup = createBackup('startup');
    if (!backup.success) console.warn(`[SQLite] Aviso: backup de início não gerado (${backup.error}).`);

    app.listen(port, () => {
      console.log(`[Servidor Local] API em http://localhost:${port}`);
      console.log(`[Servidor Local] Banco: ${getDatabaseStatus().file} (schema v${getSchemaVersion()})`);
      console.log(`[Servidor Local] Rotas:`);
      console.log(`  - GET  /api/health`);
      console.log(`  - GET  /api/database`);
      console.log(`  - POST /api/database`);
      console.log(`  - GET  /api/database/status`);
      console.log(`  - POST /api/database/backup`);
      console.log(`  - /api/printers/*`);
    });
  } catch (error) {
    markBootstrapError(error);
    // O backend sobe mesmo assim para reportar o erro com clareza em vez de
    // simplesmente não existir — mas nunca apaga o banco original.
    app.listen(port, () => {
      console.error('[Servidor Local] API em modo de erro:', getDatabaseStatus().lastError);
    });
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log('\n[Servidor Local] Encerrando...');
    closeDatabase();
    process.exit(0);
  });
}

void start();
