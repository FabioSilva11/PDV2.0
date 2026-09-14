import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Nunca inicializar Firebase ou enviar dados de teste ao restaurante real.
vi.mock('../lib/firebaseDatabase', () => ({
  firebaseDatabaseEnabled: false,
  loadRemoteDatabase: vi.fn(async () => undefined),
  saveRemoteDatabase: vi.fn(async () => undefined),
}));
vi.mock('../utils/audio', () => ({ sounds: { notification: vi.fn(), cash: vi.fn() } }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
