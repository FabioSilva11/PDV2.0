/**
 * ============================================================
 * CONFIGURAÇÃO TÉCNICA CENTRAL
 * ============================================================
 * Este módulo contém APENAS constantes técnicas, visuais e de
 * contrato (itens 5–7 da especificação: contrato técnico, regra
 * de domínio e constante puramente visual/técnica).
 *
 * Dados de negócio (nome, CNPJ, taxa de entrega, quick amounts,
 * categorias etc.) NÃO pertencem aqui — ficam em
 * RestaurantSettings, persistidos no banco/localStorage.
 * ============================================================
 */

/** Janela máxima do log de auditoria (contrato técnico: proteção de memória). */
export const AUDIT_LOG_MAX_ENTRIES = 5000;

/** Storage keys (contrato técnico). */
export const STORAGE_KEYS = {
  database: 'pdv_database_v2',
  session: 'pdv_session_v1',
} as const;

/** Números de pedido começam a partir daqui (regra de domínio). */
export const ORDER_NUMBER_BASE = 1000;

/** Configurações de senha (segurança). */
export const PASSWORD_POLICY = {
  minLength: 4,
  /** Iterações do PBKDF2 (segurança técnica). */
  pbkdf2Iterations: 100_000,
} as const;

/** Limites de validação centralizados. */
export const LIMITS = {
  maxOrderValue: 10_000_000,
  maxItemQuantity: 100_000,
  maxMenuItemNameLength: 200,
} as const;

/** Delay do debounce de persistência no backend (técnica). */
export const PERSIST_DEBOUNCE_MS = 300;

/** Formatos/contratos técnicos de impressão. */
export const PRINT_DOCUMENT_LABELS: Record<string, string> = {
  pedido: 'VIA DO PEDIDO',
  espelho: 'ESPELHO DO PEDIDO',
  comprovante: 'COMPROVANTE',
};

/** Estações técnicas de cozinha (contrato técnico: roteamento de impressão). */
export const KITCHEN_STATION_LABELS: Record<string, string> = {
  cozinha: 'Cozinha',
  chapa: 'Chapa',
  bar: 'Bar / Bebidas',
  pizza: 'Pizza',
  sobremesa: 'Sobremesa',
};
