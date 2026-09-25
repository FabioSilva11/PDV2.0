/**
 * Integração Frontend com o Backend Local MariaDB
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface MariaDbStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  lastError: string | null;
}

export const mariaDatabaseEnabled = true;

/**
 * Consulta a saúde da conexão do servidor local e do MariaDB
 */
export async function checkMariaDbHealth(): Promise<{ serverOk: boolean; dbStatus: MariaDbStatus | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) return { serverOk: false, dbStatus: null };
    const json = await res.json();
    return {
      serverOk: true,
      dbStatus: json.mariadb || null
    };
  } catch {
    return { serverOk: false, dbStatus: null };
  }
}

/**
 * Carrega os dados mais recentes do restaurante salvos no MariaDB
 */
export async function loadMariaDatabase<T>(): Promise<T | undefined> {
  try {
    const res = await fetch(`${API_BASE}/api/database`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return undefined;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as T;
    }
    return undefined;
  } catch (error) {
    console.warn('[MariaDB Local] Servidor backend indisponível no momento. Utilizando dados locais em cache.');
    return undefined;
  }
}

let saveTimeout: any = null;

/**
 * Salva os dados do restaurante no MariaDB com debounce para otimização
 */
export function saveMariaDatabase(snapshot: object): Promise<boolean> {
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
        console.warn('[MariaDB Local] Não foi possível persistir no banco remoto no momento. Dados mantidos em localStorage.');
        resolve(false);
      }
    }, 300);
  });
}
