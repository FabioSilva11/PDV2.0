import { Router } from 'express';
import { loadSnapshot, saveSnapshot, countEntities } from '../db/repository';
import { getBootstrapStatus, getDatabaseStatus, getSchemaVersion, checkIntegrity } from '../db/sqlite';
import { createBackup, getLastBackup, listBackups, restoreBackup } from '../db/backup';
import { getMeta } from '../db/sqlite';

const router = Router();

/** GET /api/database — snapshot montado a partir das tabelas estruturadas. */
router.get('/', (_req, res) => {
  try {
    const snapshot = loadSnapshot();
    res.json({
      success: true,
      data: snapshot,
      bootstrap: getBootstrapStatus(),
      engine: 'sqlite',
      schemaVersion: getSchemaVersion()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao ler o banco local.' });
  }
});

/** POST /api/database — grava o snapshot em uma transação SQLite. */
router.post('/', (req, res) => {
  const snapshot = req.body;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return res.status(400).json({ success: false, error: 'Snapshot inválido.' });
  }
  try {
    saveSnapshot(snapshot);
    res.json({ success: true, message: 'Dados salvos no banco local (SQLite).' });
  } catch (error: any) {
    res.status(503).json({ success: false, error: error?.message || 'Não foi possível gravar no banco local.' });
  }
});

/** GET /api/database/status — bootstrap, arquivo, integridade e última gravação. */
router.get('/status', (_req, res) => {
  const status = getDatabaseStatus();
  const integrity = checkIntegrity();
  const backup = getLastBackup();

  res.json({
    success: true,
    engine: 'sqlite',
    bootstrap: getBootstrapStatus(),
    file: status.file,
    exists: status.exists,
    sizeBytes: status.sizeBytes,
    schemaVersion: getSchemaVersion(),
    integrity,
    lastWriteAt: status.lastWriteAt,
    lastBackupAt: backup.at,
    lastBackupFile: backup.file,
    migrationStatus: getMeta('migration_status'),
    migratedFrom: getMeta('migrated_from'),
    migrationCompletedAt: getMeta('migration_completed_at'),
    counts: countEntities(),
    lastError: status.lastError
  });
});

/** POST /api/database/backup — gera backup consistente. */
router.post('/backup', (_req, res) => {
  const result = createBackup('manual');
  if (!result.success) return res.status(500).json({ success: false, error: result.error });
  res.json({ success: true, file: result.file, at: new Date().toISOString() });
});

/** GET /api/database/backups — lista backups disponíveis. */
router.get('/backups', (_req, res) => {
  res.json({ success: true, backups: listBackups() });
});

/** POST /api/database/restore — restaura um backup (estrutura pronta para UI). */
router.post('/restore', (req, res) => {
  const file = String(req.body?.file ?? '');
  if (!file) return res.status(400).json({ success: false, error: 'Informe o arquivo de backup.' });
  const result = restoreBackup(file);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, file: result.file, message: 'Backup restaurado. Reinicie o backend.' });
});

export default router;
