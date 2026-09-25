import { RestaurantSettings } from '../types';

/**
 * ============================================================
 * CONFIGURAÇÃO DE FÁBRICA (FALLBACK DE PRIMEIRA EXECUÇÃO)
 * ============================================================
 * Não contém dados de nenhum estabelecimento real: todos os
 * campos de identidade são neutros e devem ser preenchidos no
 * Assistente de Configuração Inicial (SetupWizard) ou na tela
 * de Configurações.
 *
 * O objeto persistido no banco/localStorage SEMPRE vence este
 * default. Este default existe apenas para que o sistema seja
 * renderizável antes da configuração inicial.
 * ============================================================
 */
export const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
  id: 'singleton',
  nomeFantasia: '',
  razaoSocial: '',
  nomeCurto: '',
  cnpj: '',
  inscricaoEstadual: '',
  telefone: '',
  email: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  logo: undefined,
  nomeAplicacao: 'PDV',
  versaoExibida: '1.0.0',
  rodapeComprovante: 'Obrigado pela preferência!',
  moeda: 'BRL',
  locale: 'pt-BR',
  pix: {
    chave: '',
    nomeRecebedor: '',
    cidade: '',
    descricao: '',
  },
  delivery: {
    defaultFee: 0,
  },
  cashier: {
    quickAmounts: [20, 50, 100, 200],
  },
  operations: {
    lateOrderThresholdMinutes: 25,
    dashboardStartHour: 10,
    dashboardEndHour: 23,
    topProductsLimit: 5,
  },
  reservations: {
    defaultGuests: 2,
    defaultAdvanceMinutes: 60,
  },
  setupComplete: false,
};

/** Mescla um settings persistido (parcial/legado) com o default de fábrica. */
export function normalizeRestaurantSettings(raw: any): RestaurantSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_RESTAURANT_SETTINGS };
  const d = DEFAULT_RESTAURANT_SETTINGS;
  return {
    ...d,
    ...raw,
    id: 'singleton' as const,
    pix: { ...d.pix, ...(raw.pix || {}) },
    delivery: { ...d.delivery, ...(raw.delivery || {}) },
    cashier: { ...d.cashier, quickAmounts: Array.isArray(raw.cashier?.quickAmounts) && raw.cashier.quickAmounts.length ? raw.cashier.quickAmounts.map(Number).filter(n => Number.isFinite(n) && n >= 0) : d.cashier.quickAmounts },
    operations: { ...d.operations, ...(raw.operations || {}) },
    reservations: { ...d.reservations, ...(raw.reservations || {}) },
    setupComplete: raw.setupComplete === true,
  };
}
