import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.mock('../utils/audio', () => ({ sounds: { notification: vi.fn(), cash: vi.fn() } }));
// MariaDB offline nos testes: valida o caminho de cache local sem rede.
vi.mock('../lib/mariaDatabase', () => ({
  mariaDatabaseEnabled: true,
  checkMariaDbHealth: vi.fn(async () => ({ serverOk: false, dbStatus: null })),
  loadMariaDatabase: vi.fn(async () => undefined),
  saveMariaDatabase: vi.fn(async () => false),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
