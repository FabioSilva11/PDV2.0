export class SyncConflict extends Error {
  constructor(public field: string) { super('Conflito de sincronização em ' + field + '. Os dados locais foram preservados para conferência.'); }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value);
const keyed = (value: any[]) => value.every(v => object(v) && typeof v.id === 'string');

// Three-way merge: disjoint records/fields may merge; concurrent edits to the
// same value abort the whole transaction instead of overwriting another till.
export function mergeSnapshots(base: any, local: any, remote: any, path = 'database'): any {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(local, remote)) return local;
  if (Array.isArray(local) && Array.isArray(remote) && keyed(local) && keyed(remote) && (!base || (Array.isArray(base) && keyed(base)))) {
    const before = new Map((base || []).map((v: any) => [v.id, v]));
    const ours = new Map(local.map((v: any) => [v.id, v]));
    const theirs = new Map(remote.map((v: any) => [v.id, v]));
    return [...new Set([...theirs.keys(), ...ours.keys(), ...before.keys()])].map(id => mergeSnapshots(before.get(id), ours.get(id), theirs.get(id), path + '/' + id)).filter(v => v !== undefined);
  }
  if (object(base) && object(local) && object(remote)) {
    const result: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeSnapshots(base[key], local[key], remote[key], path + '/' + key);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  throw new SyncConflict(path);
}

const arrayFields = ['staff', 'alerts', 'menu', 'orders', 'paymentOptions', 'tables', 'comandas', 'ingredients', 'stockMovements', 'batches', 'suppliers', 'purchaseOrders', 'couriers', 'customers', 'financialEntries', 'printers', 'printQueue', 'auditLogs', 'cashHistory'];
export function normalizeSnapshot(value: any): any {
  if (!value) return {};
  const next = { ...value };
  delete next._syncBase;
  for (const key of arrayFields) {
    if (key in next) next[key] = Array.isArray(next[key]) ? next[key] : Object.values(next[key] || {});
    else next[key] = [];
  }
  next.orders = next.orders.map((o: any) => ({ ...o, itens: Object.values(o.itens || {}), pagamentos: Object.values(o.pagamentos || {}) }));
  if (next.cashRegister) next.cashRegister = { ...next.cashRegister, transacoes: Object.values(next.cashRegister.transacoes || {}) };
  return JSON.parse(JSON.stringify(next));
}
