import { getApp, getApps, initializeApp } from 'firebase/app';
import { get, getDatabase, ref, runTransaction } from 'firebase/database';
import { mergeSnapshots, normalizeSnapshot } from './mergeSnapshots';

export interface RemoteDatabaseSnapshot {
  [key: string]: unknown;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId && firebaseConfig.appId);
export const firebaseDatabaseEnabled = hasFirebaseConfig;

const firebaseApp = hasFirebaseConfig
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;
const remoteDatabase = firebaseApp ? getDatabase(firebaseApp) : null;
const databasePath = 'restaurants/murupi/database';

let writeQueue: Promise<unknown> = Promise.resolve();

const removeUndefinedValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, removeUndefinedValues(entry)])
    );
  }

  return value;
};

export async function loadRemoteDatabase<T>(): Promise<T | undefined> {
  if (!remoteDatabase) return undefined;

  try {
    const snapshot = await get(ref(remoteDatabase, databasePath));
    return snapshot.exists() ? snapshot.val() as T : undefined;
  } catch (error) {
    throw new Error('Não foi possível consultar o servidor. Os dados locais foram preservados.');
  }
}

export function saveRemoteDatabase(snapshot: object, baseline?: object): Promise<any> {
  if (!remoteDatabase) return Promise.resolve(snapshot);
  const local = normalizeSnapshot(removeUndefinedValues(snapshot));
  const base = normalizeSnapshot(removeUndefinedValues(baseline || {}));
  const task = writeQueue.catch(() => undefined).then(async () => {
    const result = await runTransaction(ref(remoteDatabase, databasePath), current => {
      const remote = normalizeSnapshot(current);
      return removeUndefinedValues(mergeSnapshots(base, local, remote));
    }, { applyLocally: false });
    if (!result.committed) throw new Error('Sincronização não confirmada. Dados locais preservados.');
    return normalizeSnapshot(result.snapshot.val());
  });
  writeQueue = task;
  return task;
}
