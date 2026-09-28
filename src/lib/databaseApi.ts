/**
 * Cliente do banco de dados local.
 *
 * O React não conhece SQLite: conversa apenas com a API do backend, que por
 * sua vez usa o arquivo local como fonte de verdade. O contrato
 * (GET/POST /api/database) foi mantido para não alterar a lógica de negócio.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export type DatabaseBootstrapStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface DatabaseHealth {
  engine?: string;
  bootstrap?: DatabaseBootstrapStatus;
  file?: string;
  exists?: boolean;
  sizeBytes?: number;
  schemaVersion?: number;
  integrity?: { ok: boolean; detail: string };
  lastWriteAt?: string | null;
  lastBackupAt?: string | null;
  lastBackupFile?: string | null;
  lastError?: string | null;
}

export const databaseEnabled = true;

/** Consulta a saúde do backend local e do banco. */
export async function checkDatabaseHealth(): Promise<{ serverOk: boolean; database: DatabaseHealth | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return { serverOk: false, database: null };
    const json = await res.json();
    return { serverOk: true, database: json.database || null };
  } catch {
    return { serverOk: false, database: null };
  }
}

/** Estado do bootstrap, usado para não mostrar o SetupWizard antes da carga. */
export async function fetchDatabaseStatus(): Promise<DatabaseBootstrapStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/database/status`, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return 'error';
    const json = await res.json();
    const status = (json?.bootstrap ?? json?.status) as DatabaseBootstrapStatus | undefined;
    return status ?? 'error';
  } catch {
    return 'error';
  }
}

/** Carrega o snapshot persistido no banco local. */
export async function loadDatabase<T>(): Promise<T | undefined> {
  try {
    const res = await fetch(`${API_BASE}/api/database`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return undefined;
    const json = await res.json();
    if (json.success && json.data) return json.data as T;
    return undefined;
  } catch (error) {
    console.warn('[Banco Local] Backend indisponível. Mantendo o cache local até reconectar.');
    return undefined;
  }
}

let saveTimeout: any = null;

/** Persiste o snapshot no banco local, com debounce para não gravar a cada tecla. */
export function saveDatabase(snapshot: object): Promise<boolean> {
  return new Promise((resolve) => {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot)
        });
        const json = await res.json();
        resolve(Boolean(json.success));
      } catch (err) {
        console.warn('[Banco Local] Não foi possível persistir agora. Os dados seguem no cache local.');
        resolve(false);
      }
    }, 300);
  });
}
