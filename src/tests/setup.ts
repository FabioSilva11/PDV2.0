import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.mock('../utils/audio', () => ({ sounds: { notification: vi.fn(), cash: vi.fn() } }));
// Banco local (API) offline nos testes: valida o caminho de cache local sem rede.
// `fetchDatabaseStatus` precisa responder 'ready' — se devolvesse 'empty', os
// testes cairiam no SetupWizard em vez da tela de login.
vi.mock('../lib/databaseApi', () => ({
  databaseEnabled: true,
  checkDatabaseHealth: vi.fn(async () => ({ serverOk: false, database: null })),
  fetchDatabaseStatus: vi.fn(async () => 'ready' as const),
  loadDatabase: vi.fn(async () => undefined),
  saveDatabase: vi.fn(async () => false),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
