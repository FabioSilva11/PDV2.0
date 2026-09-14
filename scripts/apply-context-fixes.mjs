import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/context/RestaurantContext.tsx';
let s = readFileSync(path, 'utf8');
s = s.replace("useCallback }", "useCallback, useRef }");
s = s.replace("import { sounds }", "import { LocalStore, useStoreField } from '../lib/localStore';\nimport { uid, money, amount, quantity, subtotal as calculateSubtotal, totals, reconcile, requirePermission } from '../utils/business';\nimport { sounds }");
s = s.replace("const [database] = useState<RestaurantDatabaseSnapshot>(loadRestaurantDatabase);", "const [database] = useState<RestaurantDatabaseSnapshot>(loadRestaurantDatabase);\n  const [store] = useState(() => new LocalStore(DATABASE_STORAGE_KEY));\n  const [operationError, setOperationError] = useState('');");
const fields = {staffList:'staff',alerts:'alerts',menu:'menu',orders:'orders',paymentOptions:'paymentOptions',settings:'settings',tables:'tables',comandas:'comandas',cashRegister:'cashRegister',ingredients:'ingredients',stockMovements:'stockMovements',batches:'batches',suppliers:'suppliers',purchaseOrders:'purchaseOrders',couriers:'couriers',customers:'customers',financialEntries:'financialEntries',printers:'printers',printQueue:'printQueue',auditLogs:'auditLogs'};
for (const [name, key] of Object.entries(fields)) {
  const regex = new RegExp(`(const \\[${name}, \\w+\\] = )useState(<[^;\\n]+?>)?\\(`);
  s = s.replace(regex, (_, prefix, type = '') => `${prefix}useStoreField${type}(store, '${key}', `);
}
// Atomic disk persistence is now handled at the command boundary.
const effectStart = s.indexOf('  // Cache local e documento remoto único:');
const effectEnd = s.indexOf('  // Helper to log audit events', effectStart);
s = s.slice(0, effectStart) + `  store.state.staffResetApplied = true;
  store.state.operationalDemoResetApplied = true;
  useEffect(() => {
    store.onCommit = snapshot => {
      if (firebaseSyncReady) void saveRemoteDatabase(snapshot).catch(error => setOperationError(error.message));
    };
    return () => { store.onCommit = undefined; };
  }, [store, firebaseSyncReady]);

` + s.slice(effectEnd);
// Read current committed/draft state, including calls batched before React renders.
const start = s.indexOf('  // Helper to log audit events');
const end = s.indexOf('  return (\n    <RestaurantContext.Provider', start);
let actions = s.slice(start, end);
for (const [name, key] of Object.entries(fields)) actions = actions.replace(new RegExp(`\\b${name}\\.`, 'g'), `store.state.${key}.`);
actions = actions.replace(/'ord-' \+ Date\.now\(\)/g, "uid('ord')").replace(/'tx-' \+ Date\.now\(\)/g, "uid('tx')").replace(/'tx-rev-' \+ Date\.now\(\)/g, "uid('tx-rev')");
s = s.slice(0, start) + actions + s.slice(end);
// All API commands share one transaction, including nested setters and audit logs.
s = s.replace('  return (\n    <RestaurantContext.Provider', `  const guardActions = <T extends object,>(api: T): T => Object.fromEntries(Object.entries(api).map(([key, value]) => [key, typeof value === 'function' ? (...args: unknown[]) => {
    try { return store.transaction(() => value(...args)); }
    catch (error) { setOperationError(error instanceof Error ? error.message : 'Não foi possível concluir a operação.'); throw error; }
  } : value])) as T;

  return (
    <RestaurantContext.Provider`);
s = s.replace('      value={{', '      value={guardActions({');
s = s.replace('      }}\n    >', '      })}\n    >');
s = s.replace('      {children}', `      {operationError && <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-xl rounded-xl bg-red-950 text-white p-4 shadow-xl">{operationError}<button className="ml-4 underline" onClick={() => setOperationError('')}>Fechar</button></div>}
      {children}`);
// Always expose live order details, not the snapshot taken when opening a modal.
s = s.replace('        orderForPaymentModal,', '        orderForPaymentModal: orders.find(o => o.id === orderForPaymentModal?.id) || orderForPaymentModal,');
writeFileSync(path, s);
