/**
 * Base da API do backend local.
 *
 * O PDV é um app local: quando o frontend roda em outra porta que não a do
 * backend (ex.: 3002 → 3001), `fetch('/api/...')` acerta a porta errada e a
 * reimpressão falha silenciosamente. Resolver pela mesma base configurada em
 * VITE_API_URL mantém o comportamento independente de porta.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const apiUrl = (path: string): string => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
