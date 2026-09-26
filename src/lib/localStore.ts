import { useSyncExternalStore } from 'react';

// A command stages every affected collection and persists one snapshot before
// notifying React. Updaters run exactly once, outside React's render cycle.
export class LocalStore {
  state: Record<string, any> = {};
  private listeners = new Set<() => void>();
  private depth = 0;
  onCommit?: (snapshot: Record<string, any>) => void;
  constructor(private key: string) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  transaction<T>(work: () => T): T {
    if (this.depth) return work();
    const before = this.state;
    this.depth++;
    let result: T;
    try {
      result = work();
      if (this.state !== before) localStorage.setItem(this.key, JSON.stringify(this.state));
    } catch (error) {
      // ROLLBACK: a operação inteira é descartada. Os assinantes são avisados
      // para que a UI nunca exiba uma conta/pedido que não foi persistido.
      this.state = before;
      this.depth--;
      this.listeners.forEach(listener => listener());
      throw error;
    }
    this.depth--;
    if (this.state !== before) {
      this.listeners.forEach(listener => listener());
      this.onCommit?.(this.state);
    }
    return result;
  }
  set = (key: string, value: any) => this.transaction(() => {
    const next = typeof value === 'function' ? value(this.state[key]) : value;
    if (next !== this.state[key]) this.state = { ...this.state, [key]: next };
  });
  replace(snapshot: Record<string, any>) { this.transaction(() => { this.state = snapshot; }); }
}

export function useStoreField<T>(store: LocalStore, key: string, initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  if (!(key in store.state)) store.state[key] = typeof initial === 'function' ? (initial as () => T)() : initial;
  const value = useSyncExternalStore(store.subscribe, () => store.state[key]);
  return [value, (next) => store.set(key, next)];
}
