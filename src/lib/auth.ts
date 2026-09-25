import { PASSWORD_POLICY } from '../config/appConfig';
import type { UserAccount } from '../types';

/**
 * ============================================================
 * AUTENTICAÇÃO (FRONTEND)
 * ============================================================
 * - Senhas nunca são armazenadas em texto puro: usa PBKDF2
 *   (WebCrypto) com salt aleatório por usuário.
 * - A sessão atual é derivada de um "token" opaco persistido
 *   localmente; quem é o usuário atual NÃO é decidido por
 *   hardcode — vem do login ou da sessão persistida.
 * ============================================================
 */

const SESSION_KEY = 'pdv_session_v1';

interface StoredSession {
  userId: string;
  token: string;
  startedAt: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getRandomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Gera o hash PBKDF2 de uma senha (formato: pbkdf2$iterações$salt$hash). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PASSWORD_POLICY.pbkdf2Iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2$${PASSWORD_POLICY.pbkdf2Iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

/** Verifica se a senha confere com o hash armazenado (comparação constante). */
export async function verifyPassword(password: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = base64UrlToBytes(parts[2]);
  const expected = parts[3];
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const actual = toBase64Url(new Uint8Array(bits));
  if (actual.length !== expected.length) return false;
  // comparação em tempo constante
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function base64UrlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Cria uma sessão e persiste localmente. */
export function createSession(user: UserAccount): StoredSession {
  const session: StoredSession = {
    userId: user.id,
    token: getRandomToken(),
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** Retorna a sessão persistida, se houver. */
export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.userId ? parsed as StoredSession : null;
  } catch {
    return null;
  }
}

/** Encerra a sessão atual. */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Valida a política de senha. */
export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_POLICY.minLength) {
    return `A senha deve ter pelo menos ${PASSWORD_POLICY.minLength} caracteres.`;
  }
  return null;
}
