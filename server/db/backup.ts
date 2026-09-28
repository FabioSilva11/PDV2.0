import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getBackupsDir, closeDatabase, getDb, getDatabaseFile, openDatabase, setMeta, getMeta } from './sqlite';

export interface BackupResult {
  success: boolean;
  file?: string;
  error?: string;
}

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Backup consistente usando o mecanismo próprio do SQLite (VACUUM INTO):
 * produz uma cópia íntegra mesmo com o PDV escrevendo, porque roda dentro de
 * uma transação de leitura do arquivo.
 */
export const createBackup = (label = 'auto'): BackupResult => {
  const source = getDatabaseFile();
  if (!fs.existsSync(source)) {
    return { success: false, error: 'Arquivo de banco ainda não existe.' };
  }

  try {
    fs.mkdirSync(getBackupsDir(), { recursive: true });
    const name = `pdv-${label}-${timestamp()}.sqlite`;
    const target = path.join(getBackupsDir(), name);

    const db = getDb();
    // O destino é removido antes: VACUUM INTO falha se o arquivo já existir.
    if (fs.existsSync(target)) fs.rmSync(target);
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);

    setMeta('last_backup_at', new Date().toISOString());
    console.log(`[SQLite] Backup criado em ${target}`);
    return { success: true, file: target };
  } catch (error: any) {
    // Nunca toca no banco original em caso de falha.
    console.error('[SQLite] ERRO no backup:', error?.message);
    return { success: false, error: error?.message || 'Falha ao gerar backup.' };
  }
};

export const getLastBackup = (): { at: string | null; file: string | null } => {
  const at = getMeta('last_backup_at');
  let file: string | null = null;
  if (at && fs.existsSync(getBackupsDir())) {
    const candidates = fs
      .readdirSync(getBackupsDir())
      .filter(name => name.endsWith('.sqlite'))
      .sort();
    file = candidates.length ? path.join(getBackupsDir(), candidates[candidates.length - 1]) : null;
  }
  return { at, file };
};

export const listBackups = (): { nome: string; caminho: string; bytes: number; criadoEm: string }[] => {
  if (!fs.existsSync(getBackupsDir())) return [];
  return fs
    .readdirSync(getBackupsDir())
    .filter(name => name.endsWith('.sqlite'))
    .map(nome => {
      const caminho = path.join(getBackupsDir(), nome);
      const stat = fs.statSync(caminho);
      return { nome, caminho, bytes: stat.size, criadoEm: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
};

/**
 * Restauração: guarda o estado atual, valida o arquivo escolhido e só então
 * substitui o banco.
 *
 * Copiar por cima do arquivo com a conexão aberta é o jeito errado: o SQLite
 * continuaria lendo as páginas antigas em memória e o WAL poderia regravar o
 * arquivo novo por baixo. Por isso a conexão é fechada e o arquivo é validado
 * antes da troca.
 */
export const restoreBackup = (backupFile: string): BackupResult => {
  const source = path.isAbsolute(backupFile) ? backupFile : path.join(getBackupsDir(), backupFile);
  if (!fs.existsSync(source)) {
    return { success: false, error: 'Backup não encontrado.' };
  }

  let target = '';
  try {
    // 1. Valida o backup antes de destruir qualquer coisa.
    const probe = new DatabaseSync(source, { readOnly: true });
    try {
      const row = probe.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (String(row?.integrity_check ?? '') !== 'ok') {
        return { success: false, error: 'Backup corrompido: falha na verificação de integridade.' };
      }
    } finally {
      probe.close();
    }

    // 2. Segurança do estado atual antes da troca.
    target = getDatabaseFile();
    const safety = createBackup('pre-restauracao');
    if (!safety.success) {
      return { success: false, error: `Não foi possível salvar o estado atual: ${safety.error}` };
    }

    // 3. Troca limpa: sem handle aberto e sem WAL pendente.
    closeDatabase();
    for (const file of [target, `${target}-wal`, `${target}-shm`]) {
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
    fs.copyFileSync(source, target);

    // 4. Reabre para validar o resultado e voltar a atender requisições.
    const db = openDatabase(target);
    setMeta('last_restore_at', new Date().toISOString());
    const check = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    if (String(check?.integrity_check ?? '') !== 'ok') {
      return { success: false, error: 'Banco restaurado, mas a verificação de integridade falhou.' };
    }

    console.log(`[SQLite] Backup restaurado de ${source}`);
    return { success: true, file: target };
  } catch (error: any) {
    console.error('[SQLite] ERRO na restauração:', error?.message);
    // Reabre o que existia para o PDV não ficar sem banco por causa da falha.
    try {
      if (target) openDatabase(target);
    } catch {
      // Sem banco utilizável: o próximo start tenta de novo.
    }
    return { success: false, error: error?.message || 'Falha ao restaurar backup.' };
  }
};
