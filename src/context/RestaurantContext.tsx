import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';import {
  AppModule,
  MenuItem, 
  CartItem, 
  Order, 
  Table, 
  CashRegister, 
  OrderStatus,
  PaymentMethodId,
  PrinterRouteRule, PrintRouteDocument, MenuCatalog, OrderType, KitchenStation,
  PaymentRecord,
  PrinterDevice,
  PrintJob,
  SystemAlert,
  ManualPaymentOption,
  CategoryType, Customer, Reservation, UserAccount, PermissionKey, AuditLog,
  RestaurantSettings, MenuCategory,
  Account, AccountStatus, AccountSearchFilters, AccountSplitInput, AccountSplitResult, CreateAccountInput, CreateOrderInput
} from '../types';
import {
  migrateOrdersToAccounts,
  reconcileTableOccupancy,
  nextAccountNumber,
  nextOrderSequence,
  buildDisplayCode,
  accountOrders,
  ordersAwaitingMirror,
  isLastOperationalOrder,
  isAccountOpen,
  canAcceptNewOrder,
  openAccountsForTable,
  resolveTableAccount,
  computeAccountTotals,
  deriveAccountStatus,
  searchAccounts
} from '../lib/accountMigration';
import type { TableAccountResolution } from '../lib/accountMigration';
import { 
  INITIAL_MENU, 
  INITIAL_TABLES, 
  INITIAL_PRINTERS, 
  INITIAL_MANUAL_PAYMENTS
} from '../data/seedData';
import { LocalStore, useStoreField } from '../lib/localStore';
import { uid, money, amount, subtotal as calculateSubtotal, totals, reconcile } from '../utils/business';
import { formatCurrency as formatBRL } from '../utils/formatters';
import { sounds } from '../utils/audio';
import {
  DEFAULT_MENU_CATEGORIES,
  getMenuCategoryByLegacyName,
  getCategoryById,
  isCategoryAllowedForCatalog as checkCategoryAllowed
} from '../data/menuCategories';
import {
  loadMariaDatabase,
  saveMariaDatabase,
  checkMariaDbHealth,
  mariaDatabaseEnabled
} from '../lib/mariaDatabase';
import {
  DEFAULT_RESTAURANT_SETTINGS,
  normalizeRestaurantSettings
} from '../config/defaultSettings';
import { AUDIT_LOG_MAX_ENTRIES, STORAGE_KEYS } from '../config/appConfig';
import { hashPassword, verifyPassword, createSession, loadSession, clearSession } from '../lib/auth';

interface HealthStatus {
  internet: 'online' | 'offline' | 'atencao' | 'unknown';
  servidor: 'online' | 'offline' | 'atencao' | 'unknown';
  sistema: 'online' | 'offline' | 'atencao' | 'unknown';
  impressoras: 'online' | 'offline' | 'atencao' | 'unknown';
  mariadb?: 'online' | 'offline' | 'atencao' | 'unknown';
  ultimoBackup: string; // "Não configurado" até existir mecanismo real
  ultimaSincronizacao: string;
}

export interface CurrentUser {
  id: string;
  nome: string;
  cargo: string;
  perfil?: UserRole;
  usuario?: string;
  isPrimaryAdmin?: boolean;
}

/**
 * Encaminhamento Mapa de Mesas -> PDV.
 *  - `motivo: 'lancamento'`: continuar uma conta EXISTENTE (nunca cria conta);
 *  - `motivo: 'atendimento'`: abrir um NOVO atendimento (conta nova, explícito).
 */
export interface PosHandoff {
  tableNumber: number;
  contaId?: string;
  motivo: 'lancamento' | 'atendimento';
}
import type { UserRole } from '../types';

interface RestaurantContextType {
  // Navigation & Active State
  activeModule: AppModule;
  setActiveModule: (mod: AppModule) => void;
  /**
   * Encaminhamento do Mapa de Mesas para o PDV: o operador pediu "Novo
   * lançamento" (continuar uma conta) ou "Novo atendimento" (conta nova) em
   * uma mesa específica. O PDV consome uma única vez ao montar a seleção.
   */
  posHandoff: PosHandoff | null;
  setPosHandoff: (handoff: PosHandoff | null) => void;
  currentUser: CurrentUser | null;
  hasPermission: (permission: PermissionKey) => boolean;
  users: UserAccount[]; saveUser: (user: UserAccount) => void;
  changeUserPassword: (userId: string, senha: string) => Promise<void>;
  // Autenticação
  login: (usuario: string, senha: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  authChecked: boolean;
  needsSetup: boolean; // assistente de primeira execução
  completeSetup: (payload: { settings: Partial<RestaurantSettings>; admin: { nome: string; usuario: string; senha: string } }) => Promise<void>;
  // Configuração do estabelecimento
  settings: RestaurantSettings;
  saveSettings: (patch: Partial<RestaurantSettings>) => void;
  menuCategories: MenuCategory[];
  saveMenuCategory: (category: MenuCategory) => void;
  deleteMenuCategory: (id: string) => void;
  isCategoryAllowedForCatalog: (category: MenuCategory | undefined, catalogo: MenuCatalog) => boolean;
  customers: Customer[]; saveCustomer: (customer: Customer) => void; deleteCustomer: (id: string) => void;
  reservations: Reservation[]; saveReservation: (reservation: Reservation) => void; updateReservationStatus: (id: string, status: Reservation['status']) => void;
  auditLogs: AuditLog[];

  // System Health & Alerts
  health: HealthStatus;
  refreshHealth: () => void;
  alerts: SystemAlert[];
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
  addAlert: (alert: Omit<SystemAlert, 'id' | 'horario' | 'lida'>) => void;
  isAlertsDrawerOpen: boolean;
  setIsAlertsDrawerOpen: (open: boolean) => void;
  isHealthModalOpen: boolean;
  setIsHealthModalOpen: (open: boolean) => void;

  // Menu Management
  menu: MenuItem[];
  categories: CategoryType[];
  saveMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  toggleItemAvailability: (id: string) => void;
  updateItemPrice: (id: string, newPrice: number) => void;
  resetMenuToDefaults: () => void;

  // Orders Management
  orders: Order[];
  createOrder: (orderData: CreateOrderInput) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  cancelOrder: (orderId: string, motivo: string) => void;
  cancelOrderItem: (orderId: string, cartItemId: string, motivo: string) => void;
  applyOrderDiscount: (orderId: string, desconto: number, motivo: string) => void;
  addItemsToOrder: (orderId: string, items: CartItem[]) => void;
  generateOrderMirror: (orderId: string) => void;
  rerouteOrderPrintBatch: (orderId: string, grupoId?: string) => void;
  setOrderPriority: (orderId: string, prioridade: 'normal' | 'urgente') => void;
  reopenOrder: (id: string, motivo: string) => void;
  /** Edita campos de um pedido existente com recálculo de totais e auditoria. */
  editOrder: (orderId: string, patch: import('../types').OrderEditPatch) => void;
  selectedOrderForModal: Order | null;
  setSelectedOrderForModal: (order: Order | null) => void;
  selectedReceiptOrder: Order | null;
  setSelectedReceiptOrder: (order: Order | null) => void;

  // ==========================================================
  // CONTAS / CHECKS  (atendimento financeiro —≠ mesa e ≠ pedido)
  // ==========================================================
  accounts: Account[];
  /** Contas que aceitam novos lançamentos. */
  openAccounts: Account[];
  getAccount: (contaId: string) => Account | undefined;
  getAccountByNumber: (numero: number) => Account | undefined;
  /** Cria uma nova conta (novo atendimento financeiro). */
  createAccount: (input: CreateAccountInput) => Account;
  /** Lançamentos da conta em ordem de sequência. */
  getAccountOrders: (contaId: string) => Order[];
  /** Próxima sequência comercial do lançamento (max(sequencia)+1). */
  getNextSequence: (contaId: string) => number;
  /** Localiza contas por número, lançamento, mesa, cliente, valor e status. */
  searchAccounts: (filters: AccountSearchFilters) => Account[];
  /** Baixa o pagamento distribuindo nos lançamentos da conta. */
  payAccount: (contaId: string, formaId: PaymentMethodId, valor?: number, valorRecebido?: number, observacao?: string) => Order[];
  /** Encerra a conta. Exige saldo zero e registra autor/motivo. */
  closeAccount: (contaId: string, motivo?: string) => Account;
  /** Move a conta para outra mesa. A conta e os lançamentos continuam os mesmos. */
  transferAccount: (contaId: string, toTableNumber: number) => Account;
  /** Divide a conta: os itens escolhidos vão para uma nova conta filha. */
  splitAccount: (input: AccountSplitInput) => AccountSplitResult;
  /** Une duas contas abertas preservando o histórico de origem. */
  mergeAccounts: (sourceAccountId: string, targetAccountId: string) => Account;
  /** Registra um novo lançamento na conta indicated (sem inferir pela mesa). */
  addOrderToAccount: (contaId: string, data: Partial<Order>) => Order;
  /**
   * HIERARQUIA CENTRAL de escolha da conta de uma mesa:
   * conta atual -> conta aberta relacionada -> única conta aberta -> nova.
   * `ambigua` significa "exibir as opções e exigir escolha do operador".
   */
  getPreferredAccountForTable: (tableNumber?: number) => TableAccountResolution;
  /** Contas abertas ligadas à mesa (nunca inclui `paga` nem `encerrada`). */
  getOpenTableAccounts: (tableNumber?: number) => Account[];


  // Manual Payments (No gateway, manual employee registration)
  paymentOptions: ManualPaymentOption[];
  addManualPaymentToOrder: (orderId: string, formaId: PaymentMethodId, valor: number, valorRecebido?: number, observacao?: string) => boolean;
  reverseOrderPayment: (orderId: string, paymentId: string, motivo: string) => void;
  markOrderAsPaidManually: (orderId: string) => void;
  isPaymentModalOpen: boolean;
  orderForPaymentModal: Order | null;
  openPaymentModal: (order: Order) => void;
  closePaymentModal: () => void;

  // Tables Management
  tables: Table[];
  openTableWithOrder: (tableNumber: number, customerName?: string, pessoas?: number) => void;
  addItemsToTable: (tableNumber: number, items: CartItem[]) => void;
  requestTableBill: (tableNumber: number) => void;
  settleTableAccount: (tableNumber: number, method?: PaymentMethodId, amountPaid?: number, change?: number) => Order | null;
  freeTableManually: (tableNumber: number) => void;
  transferTable: (fromTable: number, toTable: number) => void;
  joinTables: (sourceTable: number, targetTable: number) => void;
  updateTableLayout: (tableId: string, x: number, y: number, formato?: Table['formato'], setor?: Table['setor']) => void;
  addNewTable: (table: Omit<Table, 'id' | 'valorAtual'>) => void;
  configureTableCount: (count: number) => void;

  // Cash Register (Manual Flow)
  cashRegister: CashRegister;
  openCashRegister: (initialAmount: number) => void;
  closeCashRegister: (blindCloseData?: CashRegister['fechamentoCego']) => void;
  addCashMovement: (tipo: 'suprimento' | 'sangria' | 'entrada_manual' | 'saida_manual', valor: number, motivo: string) => void;

  // Printers & Print Queue
  printers: PrinterDevice[];
  printQueue: PrintJob[];
  triggerTestPrint: (printerId: string) => void;
  reprintJob: (jobId: string) => void;
  togglePrinterStatus: (printerId: string) => void;
  savePrinter: (printer: PrinterDevice) => void;
  deletePrinter: (printerId: string) => void;

  // Sound and UI Extras
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

const DATABASE_STORAGE_KEY = STORAGE_KEYS.database;
const LEGACY_STORAGE_PREFIXES = ['murupi_restaurant_database_v1', 'rest_saas_v6_', 'rest_saas_v5_', 'rest_saas_v4_', 'rest_saas_v3_'];

interface RestaurantDatabaseSnapshot {
  operationalDemoResetApplied?: boolean;
  settings?: Partial<RestaurantSettings>;
  alerts?: SystemAlert[];
  menu?: MenuItem[];
  menuCategories?: MenuCategory[];
  orders?: Order[];
  accounts?: Account[];
  paymentOptions?: ManualPaymentOption[];
  tables?: Table[];
  cashRegister?: CashRegister;
  printers?: PrinterDevice[];
  printQueue?: PrintJob[];
  users?: UserAccount[]; customers?: Customer[]; reservations?: Reservation[]; auditLogs?: AuditLog[];
}

const normalizeMenuItem = (item: any): MenuItem => ({ ...item, catalogo: item.catalogo === 'lanche' || item.categoria === 'Hambúrgueres' || item.categoria === 'Lanches & Burgers' ? 'lanche' : 'restaurante' });

const normalizeOrder = (order: any): Order => ({
  ...order,
  contaId: order.contaId || order.mesaSessaoId,
  contaNumero: Number.isFinite(Number(order.contaNumero)) ? Number(order.contaNumero)
    : Number.isFinite(Number(order.mesaSessaoNumero)) ? Number(order.mesaSessaoNumero) : undefined,
  sequencia: Number.isFinite(Number(order.sequencia)) ? Number(order.sequencia)
    : Number.isFinite(Number(order.mesaPedidoSequencia)) ? Number(order.mesaPedidoSequencia) : undefined,
  codigoExibicao: order.codigoExibicao || order.codigoMesa,
  mesaSessaoId: order.mesaSessaoId,
  mesaSessaoNumero: Number.isFinite(Number(order.mesaSessaoNumero)) ? Number(order.mesaSessaoNumero) : undefined,
  mesaPedidoSequencia: Number.isFinite(Number(order.mesaPedidoSequencia)) ? Number(order.mesaPedidoSequencia) : undefined,
  codigoMesa: order.codigoMesa || (order.mesaSessaoNumero !== undefined && order.mesaPedidoSequencia !== undefined ? `${order.mesaSessaoNumero}.${order.mesaPedidoSequencia}` : undefined),
  tipo: order.tipo === 'delivery' || order.tipo === 'mesa' ? order.tipo : 'balcao',
  status: ['novo', 'pronto', 'entregue', 'finalizado', 'cancelado'].includes(order.status) ? order.status : 'novo',
  itens: asArray(order.itens, [] as CartItem[]).map((item: any) => { const { statusProducao, ...clean } = item || {}; return clean; }),
  pagamentos: asArray(order.pagamentos, [] as Order['pagamentos']),
  impressoes: asArray(order.impressoes, [])
});

const normalizeAccount = (account: any): Account => ({
  ...account,
  numero: Number(account.numero) || 0,
  status: (['aberta', 'paga', 'encerrada'] as const).includes(account.status) ? account.status : 'aberta',
  total: Number(account.total) || 0,
  valorPago: Number(account.valorPago) || 0,
  saldoRestante: Number(account.saldoRestante) || 0
});

/**
 * Aplica a migração CONTA sobre um snapshot inteiro. Só reconstrói a ocupação
 * das mesas quando existe histórico de pedidos — assim a carga inicial não
 * apaga a ocupação demo de uma instalação nova.
 */
const applyAccountModel = (snapshot: RestaurantDatabaseSnapshot): RestaurantDatabaseSnapshot => {
  const orders = asArray(snapshot.orders, [] as Order[]).map(normalizeOrder);
  const tables = asArray(snapshot.tables, [] as Table[]);
  if (!orders.length) {
    return { ...snapshot, orders, accounts: asArray(snapshot.accounts, [] as Account[]).map(normalizeAccount) };
  }
  const migrated = migrateOrdersToAccounts(
    orders,
    tables,
    asArray(snapshot.accounts, [] as Account[]).map(normalizeAccount)
  );
  return {
    ...snapshot,
    orders: migrated.orders,
    accounts: migrated.accounts,
    tables: reconcileTableOccupancy(tables, migrated.accounts, migrated.orders)
  };
};

export const normalizePrinter = (printer: any): PrinterDevice => ({
  ...printer,
  finalidade: printer.finalidade || (String(printer.local || '').toLowerCase().includes('balc') ? 'pedido' : 'espelho'),
  regras: asArray(printer.regras, []).map((r: any, index: number) => ({
    // ID determinístico: nunca gerar UUID aleatório — mesma regra = mesmo ID em toda carga.
    // Usar printer.id (estável) + índice para evitar colisões entre impressoras.
    id: r.id || `${String(printer.id || 'prn')}-rule-${index}`,
    nome: r.nome || `Regra ${index + 1}`,
    documentos: asArray(r.documentos, []),
    catalogos: asArray(r.catalogos, []),
    tiposPedido: asArray(r.tiposPedido, []),
    categorias: asArray(r.categorias, []),
    categoriaIds: asArray(r.categoriaIds, []),
    estacoes: asArray(r.estacoes, []),
    prioridade: Number.isFinite(Number(r.prioridade)) ? Number(r.prioridade) : index + 1,
    modo: 'incluir',
    ativo: r.ativo !== false
  }))
})

const normalizePrintJob = (job: any): PrintJob => ({
  ...job,
  tipo: job.tipo || (String(job.titulo || '').toLowerCase().includes('espelho') ? 'espelho' : 'pedido'),
  tentativas: Number(job.tentativas || 0)
});

const loadRestaurantDatabase = (): RestaurantDatabaseSnapshot => {
  const parse = <T,>(raw: string | null): T | undefined => {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  };

  const savedDatabase = parse<RestaurantDatabaseSnapshot>(localStorage.getItem(DATABASE_STORAGE_KEY));
  if (savedDatabase) {
    return applyAccountModel({ ...savedDatabase,
      menu: (savedDatabase.menu || INITIAL_MENU).map(normalizeMenuItem),
      orders: (savedDatabase.orders || []).map(normalizeOrder),
      printers: (savedDatabase.printers || []).map(normalizePrinter),
      printQueue: (savedDatabase.printQueue || []).map(normalizePrintJob) });
  }

  // Migração única: importa o armazenamento antigo para o banco unificado.
  const readLegacy = <T,>(name: string): T | undefined => {
    for (const prefix of LEGACY_STORAGE_PREFIXES) {
      const value = parse<T>(localStorage.getItem(prefix + name));
      if (value !== undefined) return value;
    }
    return undefined;
  };

  return applyAccountModel({
    alerts: readLegacy<SystemAlert[]>('alerts'),
    menu: (readLegacy<MenuItem[]>('menu') || INITIAL_MENU).map(normalizeMenuItem),
    orders: (readLegacy<Order[]>('orders') || []).map(normalizeOrder),
    paymentOptions: readLegacy<ManualPaymentOption[]>('payment_options'),
    tables: readLegacy<Table[]>('tables'),
    cashRegister: readLegacy<CashRegister>('cash'),
    printers: ((readLegacy<PrinterDevice[]>('printers')?.length ? readLegacy<PrinterDevice[]>('printers') : INITIAL_PRINTERS) || []).map(normalizePrinter),
    printQueue: (readLegacy<PrintJob[]>('print_queue') || []).map(normalizePrintJob)
  });
};

const clearDemoTableOccupancy = (tables: Table[]): Table[] => tables.map(table => ({
  ...table,
  status: 'livre',
  garcomResponsavel: undefined,
  clienteNome: undefined,
  abertaEm: undefined,
  pedidoAtivoId: undefined,
  sessaoAtivaId: undefined,
  sessaoNumero: undefined,
  valorAtual: 0,
  pessoasSentadas: undefined
}));

const asArray = <T,>(value: T[] | Record<string, T> | undefined, fallback: T[]): T[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return fallback;
};

/** Caixa em estado neutro: fechado, zerado, sem operador fixo. */
const EMPTY_CASH_REGISTER: CashRegister = {
  id: 'csh-current',
  aberto: false,
  saldoInicial: 0,
  saldoAtualGaveta: 0,
  transacoes: []
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [database] = useState<RestaurantDatabaseSnapshot>(loadRestaurantDatabase);
  const [store] = useState(() => new LocalStore(DATABASE_STORAGE_KEY));
  const [operationError, setOperationError] = useState('');
  // Navigation & User — o usuário atual vem SEMPRE da sessão (login) ou do
  // assistente de instalação. Nunca é um usuário fixo no código.
  const [activeModule, setActiveModule] = useState<AppModule>('dashboard');
  // Mapa de Mesas -> PDV: pedido explícito de "Novo lançamento"/"Novo atendimento".
  const [posHandoff, setPosHandoff] = useState<PosHandoff | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useStoreField<UserAccount[]>(store, 'users', () => database.users || []);
  const [customers, setCustomers] = useStoreField<Customer[]>(store, 'customers', () => database.customers || []);
  const [reservations, setReservations] = useStoreField<Reservation[]>(store, 'reservations', () => database.reservations || []);
  const [auditLogs, setAuditLogs] = useStoreField<AuditLog[]>(store, 'auditLogs', () => database.auditLogs || []);
  const hasPermission = useCallback((permission: PermissionKey) => { if (!currentUser) return false; const user = users.find(u => u.id === currentUser.id); return user?.ativo !== false && (user?.perfil === 'administrador' || !!user?.permissoes?.includes(permission)); }, [users, currentUser?.id]);
  const recordAudit = useCallback((acao: string, entidade: string, entidadeId?: string, detalhes?: string) => { if (!currentUser) return; setAuditLogs(prev => [{ id: uid('audit'), dataHora: new Date().toISOString(), usuarioId: currentUser.id, usuarioNome: currentUser.nome, acao, entidade, entidadeId, detalhes }, ...prev].slice(0, AUDIT_LOG_MAX_ENTRIES)); }, [setAuditLogs, currentUser]);

  // Operational Health — valores iniciais "unknown": só exibimos métrica
  // realmente medida. Backup só aparece quando existir mecanismo real.
  const [health, setHealth] = useState<HealthStatus>({
    internet: 'unknown',
    servidor: 'unknown',
    sistema: 'unknown',
    impressoras: 'unknown',
    ultimoBackup: 'Não configurado',
    ultimaSincronizacao: 'Aguardando verificação'
  });
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useStoreField<SystemAlert[]>(store, 'alerts', () => {
    return database.operationalDemoResetApplied ? (database.alerts || []) : [];
  });
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);

  // Menu
  const [menu, setMenu] = useStoreField<MenuItem[]>(store, 'menu', () => {
    return (database.menu || INITIAL_MENU).map(normalizeMenuItem);
  });

  // =============================================================
  // CONFIGURAÇÃO ÚNICA DO ESTABELECIMENTO (restaurant_settings)
  // Fonte de verdade para identidade, PIX, taxas e limites.
  // =============================================================
  const [settings, setSettings] = useStoreField<RestaurantSettings>(store, 'settings', () => normalizeRestaurantSettings(database.settings));
  const saveSettings = useCallback((patch: Partial<RestaurantSettings>) => {
    if (!currentUser) throw new Error('Faça login para alterar a configuração.');
    setSettings(prev => normalizeRestaurantSettings({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
    recordAudit('alterou configuração', 'configuracao', 'singleton', Object.keys(patch).join(', '));
  }, [setSettings, currentUser, recordAudit]);

  // =============================================================
  // CATEGORIAS DINÂMICAS (menu_categories + catálogos)
  // Uma categoria pode pertencer a restaurante, lanche ou ambos.
  // =============================================================
  const [menuCategories, setMenuCategories] = useStoreField<MenuCategory[]>(store, 'menuCategories', () => database.menuCategories || DEFAULT_MENU_CATEGORIES);
  const saveMenuCategory = useCallback((category: MenuCategory) => {
    if (!hasPermission('cardapio')) throw new Error('Sem permissão para alterar categorias.');
    if (!category.nome?.trim()) throw new Error('Informe o nome da categoria.');
    setMenuCategories(prev => {
      const exists = prev.some(c => c.id === category.id);
      if (exists) return prev.map(c => c.id === category.id ? category : c);
      return [...prev, category];
    });
    recordAudit('alterou categoria', 'menu_category', category.id, `${category.nome} • ${category.catalogos.join('+')}`);
  }, [setMenuCategories, hasPermission, recordAudit]);
  const deleteMenuCategory = useCallback((id: string) => {
    if (!hasPermission('cardapio')) throw new Error('Sem permissão para alterar categorias.');
    const inUse = store.state.menu.some((m: MenuItem) => m.categoriaId === id || m.categoria === store.state.menuCategories?.find((c: MenuCategory) => c.id === id)?.nome);
    if (inUse) throw new Error('Existem produtos usando esta categoria. Mova-os antes de excluí-la.');
    setMenuCategories(prev => prev.filter(c => c.id !== id));
    recordAudit('excluiu categoria', 'menu_category', id);
  }, [setMenuCategories, hasPermission, recordAudit, store]);
  const isCategoryAllowedForCatalog = useCallback((category: MenuCategory | undefined, catalogo: MenuCatalog) => {
    return !!category && category.catalogos.includes(catalogo);
  }, []);

  // Orders
  const [orders, setOrders] = useStoreField<Order[]>(store, 'orders', () => {
    return database.operationalDemoResetApplied ? (database.orders || []) : [];
  });
  // =============================================================
  // CONTAS (CHECKS) — unidade financeiro do atendimento.
  // Sempre carregada junto dos pedidos: a migração reconstrói as contas
  // a partir do histórico (mesaSessaoId -> contaId) sem perder nada.
  // =============================================================
  const [accounts, setAccounts] = useStoreField<Account[]>(store, 'accounts', () => database.accounts || []);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  // Manual Payments
  const [paymentOptions, setPaymentOptions] = useStoreField<ManualPaymentOption[]>(store, 'paymentOptions', () => {
    return database.paymentOptions || INITIAL_MANUAL_PAYMENTS;
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [orderForPaymentModal, setOrderForPaymentModal] = useState<Order | null>(null);

  // Tables
  const [tables, setTables] = useStoreField<Table[]>(store, 'tables', () => {
    return database.operationalDemoResetApplied
      ? (database.tables || clearDemoTableOccupancy(INITIAL_TABLES))
      : clearDemoTableOccupancy(database.tables || INITIAL_TABLES);
  });

  const saveUser = useCallback((user: UserAccount) => {
    if (!hasPermission('usuarios')) throw new Error('Sem permissão para gerenciar usuários.');
    setUsers(prev => {
      // Regra de domínio: existe NO MÁXIMO UM administrador principal.
      if (user.isPrimaryAdmin && prev.some(u => u.isPrimaryAdmin && u.id !== user.id)) {
        throw new Error('Já existe um administrador principal. Apenas um é permitido.');
      }
      // Promover alguém a administrador sem ser o principal também é bloqueado:
      const othersAdmin = prev.filter(u => u.perfil === 'administrador' && u.id !== user.id && !u.isPrimaryAdmin);
      if (user.perfil === 'administrador' && !user.isPrimaryAdmin && othersAdmin.length === 0 && prev.some(u => u.isPrimaryAdmin)) {
        throw new Error('Apenas o administrador principal pode ter perfil administrador.');
      }
      return prev.some(u => u.id === user.id) ? prev.map(u => u.id === user.id ? user : u) : [...prev, user];
    });
    recordAudit('alterou usuário','usuario',user.id,`${user.nome} • ${user.perfil}`);
  }, [hasPermission,setUsers,recordAudit]);
  const saveCustomer = useCallback((c:Customer) => { setCustomers(prev=>prev.some(x=>x.id===c.id)?prev.map(x=>x.id===c.id?c:x):[c,...prev]); recordAudit('salvou cliente','cliente',c.id,c.nome); }, [setCustomers,recordAudit]);
  const deleteCustomer = useCallback((id:string)=>{setCustomers(prev=>prev.filter(c=>c.id!==id));recordAudit('excluiu cliente','cliente',id);},[setCustomers,recordAudit]);
  const saveReservation = useCallback((r:Reservation)=>{if(!hasPermission('reservas'))throw new Error('Sem permissão para gerenciar reservas.');setReservations(prev=>prev.some(x=>x.id===r.id)?prev.map(x=>x.id===r.id?r:x):[r,...prev]);if(r.mesaNumero&&r.status!=='cancelada'&&r.status!=='finalizada')setTables(prev=>prev.map(t=>t.numero===r.mesaNumero&&t.status==='livre'?{...t,status:'reservada'}:t));recordAudit('salvou reserva','reserva',r.id,`${r.clienteNome} • Mesa ${r.mesaNumero||'a definir'}`);},[hasPermission,setReservations,setTables,recordAudit]);
  const updateReservationStatus = useCallback((id:string,status:Reservation['status'])=>{const r=reservations.find(x=>x.id===id);setReservations(prev=>prev.map(x=>x.id===id?{...x,status}:x));if(r?.mesaNumero&&(status==='cancelada'||status==='finalizada'))setTables(prev=>prev.map(t=>t.numero===r.mesaNumero&&t.status==='reservada'?{...t,status:'livre'}:t));recordAudit('alterou status da reserva','reserva',id,status);},[reservations,setReservations,setTables,recordAudit]);

  // Cash Register — inicia FECHADO e zerado. Nenhum valor operacional fixo.
  const [cashRegister, setCashRegister] = useStoreField<CashRegister>(store, 'cashRegister', () => {
    return database.cashRegister || EMPTY_CASH_REGISTER;
  });

  // Cash Register
  const openCashRegister = useCallback((initialAmount: number) => {
    const valor = amount(initialAmount, 'Abertura', true);
    if (valor < 0) throw new Error('Valor inicial inválido.');
    if (store.state.cashRegister.aberto) return;
    setCashRegister(prev => ({ ...prev, aberto: true, operadorAbertura: currentUser.nome, abertoEm: new Date().toISOString(), fechadoEm: undefined, saldoInicial: valor, saldoAtualGaveta: valor, transacoes: [...prev.transacoes, { id: uid('tx-open'), tipo: 'abertura', valor, motivo: 'Abertura de caixa', horario: new Date().toISOString(), operador: currentUser.nome }] }));
    recordAudit('abriu caixa','caixa',store.state.cashRegister.id,`Fundo R$ ${valor.toFixed(2)}`);
  }, [setCashRegister, currentUser, store, recordAudit]);

  const closeCashRegister = useCallback((blindCloseData?: CashRegister['fechamentoCego']) => {
    if (!hasPermission('caixa')) throw new Error('Sem permissão para fechar o caixa.');
    if (!store.state.cashRegister.aberto) return;
    setCashRegister(prev => ({ ...prev, aberto: false, fechadoEm: new Date().toISOString(), fechamentoCego: blindCloseData ? { ...blindCloseData, conferidoPor: blindCloseData.conferidoPor || currentUser.nome } : prev.fechamentoCego, transacoes: [...prev.transacoes, { id: uid('tx-close'), tipo: 'fechamento', valor: prev.saldoAtualGaveta, motivo: 'Fechamento de caixa', horario: new Date().toISOString(), operador: currentUser.nome }] }));
    recordAudit('fechou caixa','caixa',store.state.cashRegister.id);
  }, [setCashRegister, currentUser, store, hasPermission, recordAudit]);

  const addCashMovement = useCallback((tipo: 'suprimento' | 'sangria' | 'entrada_manual' | 'saida_manual', valor: number, motivo: string) => {
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa antes de registrar movimentações.');
    const v = amount(valor, 'Movimentação', false);
    if (v <= 0) throw new Error('Informe um valor maior que zero.');
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    const entrada = tipo === 'suprimento' || tipo === 'entrada_manual';
    if (!entrada && store.state.cashRegister.saldoAtualGaveta < v) throw new Error('Saldo de caixa insuficiente.');
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta + (entrada ? v : -v)), transacoes: [{ id: uid('tx'), tipo, valor: v, motivo, horario: new Date().toISOString(), operador: currentUser.nome }, ...prev.transacoes] }));
    recordAudit('movimentou caixa','caixa',store.state.cashRegister.id,`${tipo} • R$ ${v.toFixed(2)} • ${motivo}`);
  }, [setCashRegister, currentUser, store, recordAudit]);

  // Printers
  const [printers, setPrinters] = useStoreField<PrinterDevice[]>(store, 'printers', () => {
    return database.printers?.length ? database.printers : INITIAL_PRINTERS;
  });
  const [printQueue, setPrintQueue] = useStoreField<PrintJob[]>(store, 'printQueue', () => database.printQueue || []);

  // Sound
  const [soundEnabled, setSoundEnabled] = useState(true);

  // MariaDB é a fonte remota primária em localhost. O estado local é exibido imediatamente
  // como cache (localStorage) e substituído pelo MariaDB assim que a resposta chega.
  const [databaseSyncReady, setDatabaseSyncReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateDatabase = async () => {
      // MariaDB é a única persistência remota. Se estiver indisponível,
      // mantemos o cache local (localStorage) sem sobrescrever o banco.
      let remote: RestaurantDatabaseSnapshot | undefined;
      try {
        remote = await loadMariaDatabase<RestaurantDatabaseSnapshot>();
      } catch {
        // MariaDB indisponível: segue com cache local
      }

      if (cancelled) return;

      if (remote) {
        setSettings(normalizeRestaurantSettings(remote.settings || database.settings));
        setMenuCategories(asArray(remote.menuCategories, DEFAULT_MENU_CATEGORIES));
        setAlerts(remote.operationalDemoResetApplied ? asArray(remote.alerts, []) : []);
        setMenu(asArray(remote.menu, database.menu || INITIAL_MENU).map(normalizeMenuItem));
        const remoteSnapshot = applyAccountModel({
          ...remote,
          orders: remote.operationalDemoResetApplied ? asArray(remote.orders, []) : [],
          accounts: asArray(remote.accounts, []),
          tables: asArray(remote.tables, database.tables || INITIAL_TABLES)
        });
        setOrders(remoteSnapshot.orders);
        setAccounts(remoteSnapshot.accounts);
        setPaymentOptions(asArray(remote.paymentOptions, database.paymentOptions || INITIAL_MANUAL_PAYMENTS));
        const remoteTables = remoteSnapshot.tables.length ? remoteSnapshot.tables : (remote.operationalDemoResetApplied ? asArray(remote.tables, INITIAL_TABLES) : clearDemoTableOccupancy(asArray(remote.tables, INITIAL_TABLES)));
        setTables(remoteTables);
        setCashRegister(remote.cashRegister || database.cashRegister || EMPTY_CASH_REGISTER);
        setPrinters(asArray(remote.printers, database.printers || INITIAL_PRINTERS).map(normalizePrinter));
        setPrintQueue(asArray(remote.printQueue, []).map(normalizePrintJob));
        setUsers(asArray(remote.users, users)); setCustomers(asArray(remote.customers, [])); setReservations(asArray(remote.reservations, [])); setAuditLogs(asArray(remote.auditLogs, []));
      }

      setDatabaseSyncReady(true);
    };

    void hydrateDatabase();
    return () => {
      cancelled = true;
    };
  }, [database]);

  store.state.operationalDemoResetApplied = true;
  useEffect(() => {
    store.onCommit = snapshot => {
      // Persistência: MariaDB (autoridade) + localStorage (cache via LocalStore)
      void saveMariaDatabase(snapshot);
    };
    return () => { store.onCommit = undefined; };
  }, [store]);

  // =============================================================
  // AUTENTICAÇÃO — login no frontend (PBKDF2), sessão persistida.
  // A sessão é restaurada de forma SÍNCRONA no primeiro render para que
  // hasPermission/currentUser estejam válidos imediatamente.
  // =============================================================
  if (!authChecked) {
    const session = loadSession();
    const usersList = store.state.users as UserAccount[] | undefined;
    if (session) {
      const user = (usersList || []).find(u => u.id === session.userId && u.ativo);
      if (user) {
        setCurrentUser({ id: user.id, nome: user.nome, cargo: user.cargo, perfil: user.perfil, usuario: user.usuario, isPrimaryAdmin: user.isPrimaryAdmin });
      } else {
        clearSession();
      }
    }
    setAuthChecked(true);
  }

  const needsSetup = !settings.setupComplete;

  const login = useCallback(async (usuario: string, senha: string): Promise<{ ok: boolean; error?: string }> => {
    const normalized = usuario.trim().toLowerCase();
    const user = users.find(u => u.usuario?.toLowerCase() === normalized && u.ativo);
    if (!user) return { ok: false, error: 'Usuário não encontrado ou inativo.' };
    if (!user.senhaHash) return { ok: false, error: 'Usuário sem senha configurada. Recrie o usuário ou redefina a senha.' };
    const valid = await verifyPassword(senha, user.senhaHash);
    if (!valid) return { ok: false, error: 'Senha incorreta.' };
    createSession(user);
    setCurrentUser({ id: user.id, nome: user.nome, cargo: user.cargo, perfil: user.perfil, usuario: user.usuario, isPrimaryAdmin: user.isPrimaryAdmin });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lastLoginAt: new Date().toISOString() } : u));
    return { ok: true };
  }, [users, setUsers]);

  const logout = useCallback(() => {
    clearSession();
    setCurrentUser(null);
    setActiveModule('dashboard');
  }, []);

  const changeUserPassword = useCallback(async (userId: string, senha: string) => {
    if (!currentUser) throw new Error('Faça login para alterar senhas.');
    if (!hasPermission('usuarios')) throw new Error('Sem permissão para gerenciar usuários.');
    const hash = await hashPassword(senha);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, senhaHash: hash } : u));
    recordAudit('alterou senha', 'usuario', userId);
  }, [currentUser, hasPermission, setUsers, recordAudit]);

  const completeSetup = useCallback(async (payload: { settings: Partial<RestaurantSettings>; admin: { nome: string; usuario: string; senha: string } }) => {
    const senhaHash = await hashPassword(payload.admin.senha);
    const adminId = 'usr-primary-admin';
    // Garante que existe NO MÁXIMO um administrador principal.
    setUsers(prev => [
      ...prev.filter(u => !u.isPrimaryAdmin && u.perfil !== 'administrador'),
      { id: adminId, nome: payload.admin.nome.trim(), usuario: payload.admin.usuario.trim().toLowerCase(), senhaHash, cargo: 'Administrador', perfil: 'administrador' as const, ativo: true, isPrimaryAdmin: true, permissoes: ['pdv','pedidos','mesas','caixa','cardapio','clientes','reservas','desconto','cancelamento','reabertura','auditoria','usuarios','impressoras','configuracoes'], criadoEm: new Date().toISOString() }
    ]);
    setSettings(normalizeRestaurantSettings({ ...DEFAULT_RESTAURANT_SETTINGS, ...payload.settings, setupComplete: true }));
    createSession({ id: adminId, nome: payload.admin.nome.trim(), usuario: payload.admin.usuario.trim().toLowerCase(), cargo: 'Administrador', perfil: 'administrador', ativo: true, isPrimaryAdmin: true, permissoes: [] });
    setCurrentUser({ id: adminId, nome: payload.admin.nome.trim(), cargo: 'Administrador', perfil: 'administrador', usuario: payload.admin.usuario.trim().toLowerCase(), isPrimaryAdmin: true });
    recordAudit('concluiu configuração inicial', 'configuracao', 'singleton');
  }, [setUsers, setSettings, recordAudit]);

  // Refresh Health
  const refreshHealth = useCallback(() => {
    const hasOfflinePrinters = store.state.printers.some((p: PrinterDevice) => p.status === 'offline');
    void checkMariaDbHealth().then(({ dbStatus }) => {
      setHealth({
        // Internet só é "online" se verificado de fato (fetch ao backend).
        internet: dbStatus ? 'online' : 'offline',
        servidor: dbStatus ? 'online' : 'offline',
        sistema: dbStatus ? 'online' : 'atencao',
        impressoras: hasOfflinePrinters ? 'atencao' : 'online',
        mariadb: dbStatus?.connected ? 'online' : 'offline',
        // Não há rotina de backup implementada: reportar "Não configurado".
        ultimoBackup: 'Não configurado',
        ultimaSincronizacao: dbStatus ? 'Sincronizado agora' : 'MariaDB indisponível'
      });
    });
    if (soundEnabled) sounds.click();
  }, [printers, soundEnabled]);

  // Alerts
  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const addAlert = useCallback((alert: Omit<SystemAlert, 'id' | 'horario' | 'lida'>) => {
    const newAlert: SystemAlert = {
      ...alert,
      id: uid('alt'),
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false
    };
    setAlerts(prev => [newAlert, ...prev]);
  }, []);

  // Menu Management
  const categories: CategoryType[] = [
    'Hambúrgueres',
    'Lanches & Burgers',
    'Pizzas',
    'Pratos principais',
    'Entradas',
    'Porções Extras',
    'Bebidas',
    'Sucos de Frutas',
    'Sobremesas',
    'Combos'
  ];

  const saveMenuItem = useCallback((item: MenuItem) => {
    if (!hasPermission('cardapio')) throw new Error('Sem permissão para alterar o cardápio.');
    item = normalizeMenuItem(item);
    amount(item.preco, 'Preço');
    if (!item.nome.trim() || item.nome.length > 200) throw new Error('Nome de produto inválido.');
    setMenu(prev => {
      const exists = prev.some(m => m.id === item.id);
      if (exists) {
        return prev.map(m => m.id === item.id ? item : m);
      } else {
        return [item, ...prev];
      }
    });
  }, [setMenu, hasPermission]);

  const deleteMenuItem = useCallback((id: string) => {
    const item = store.state.menu.find(m => m.id === id);
    if (item) {
      setMenu(prev => prev.filter(m => m.id !== id));
    }
  }, [menu, setMenu]);

  const toggleItemAvailability = useCallback((id: string) => {
    setMenu(prev => prev.map(m => {
      if (m.id === id) {
        const novoStatus = !m.disponivel;
        return { ...m, disponivel: novoStatus };
      }
      return m;
    }));
  }, [setMenu]);

  const updateItemPrice = useCallback((id: string, newPrice: number) => {
    newPrice = amount(newPrice, 'Preço');
    setMenu(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, preco: newPrice };
      }
      return m;
    }));
  }, [setMenu]);

  const resetMenuToDefaults = useCallback(() => {
    setMenu(INITIAL_MENU);
  }, [setMenu]);

  const snapshotItems = (items: CartItem[]): CartItem[] => items.map(item => ({
    ...structuredClone(item),
    cartItemId: item.cartItemId || uid('item')
  }));

  // =================================================================
  // NÚCLEO: CONTA (CHECK) x LANÇAMENTO x MESA
  //
  // Regras invioláveis implementadas aqui:
  //  1. Toda alteração financeira é feita por conta (contaId), nunca por
  //     número de mesa.
  //  2. A ocupação física da mesa só é alterada pela conta que a ocupa
  //     (table.contaAtualId === contaId). Pagamento de conta antiga nunca
  //     toca na mesa ocupada por outra conta.
  //  3. Espelho conclui o preparo do lançamento. Só quando não resta nenhum
  //     lançamento aguardando espelho NA CONTA, a mesa é liberada.
  //  4. Liberar mesa ≠ pagar ≠ encerrar conta ≠ apagar histórico.
  // =================================================================

  const accountList = (): Account[] => store.state.accounts as Account[];
  const orderList = (): Order[] => store.state.orders as Order[];
  const tableList = (): Table[] => store.state.tables as Table[];

  const accountById = (contaId?: string): Account | undefined =>
    contaId ? accountList().find(a => a.id === contaId) : undefined;
  const tableByNumber = (numero?: number): Table | undefined =>
    numero === undefined ? undefined : tableList().find(t => t.numero === numero);
  const ordersOfAccount = (contaId: string): Order[] => accountOrders(orderList(), contaId);

  /** Lançamentos da conta que ainda NÃO tiveram espelho (preparo pendente). */
  const pendingMirrorOf = (contaId: string): Order[] => ordersAwaitingMirror(orderList(), contaId);

  /**
   * Espelha a ocupação da mesa a partir da conta.
   * Só mexe na mesa que ESTA conta ocupa. Qualquer outra conta é intocável.
   */
  const syncTableOccupation = (contaId: string) => {
    const account = accountById(contaId);
    if (!account || account.mesaAtualNumero === undefined) return;
    setTables(prev => prev.map(t => {
      if (t.numero !== account.mesaAtualNumero) return t;
      if (t.contaAtualId !== contaId) return t; // ISOLAMENTO DE CONTAS
      const own = ordersOfAccount(contaId).filter(o => o.status !== 'cancelado');
      return {
        ...t,
        valorAtual: money(account.saldoRestante),
        pedidoAtivoId: own.length ? own[own.length - 1].id : t.pedidoAtivoId
      };
    }));
  };

  /**
   * Recalcula total/pago/saldo/status da conta a partir dos lançamentos.
   * `paga` só é alcançada por baixa financeira; `encerrada` é explícita.
   */
  const syncAccountTotals = (contaId: string) => {
    if (!contaId) return;
    const { total, valorPago, saldoRestante } = computeAccountTotals(orderList(), contaId);
    setAccounts(prev => prev.map(a => {
      if (a.id !== contaId) return a;
      const status = deriveAccountStatus(a.status, saldoRestante, total);
      return {
        ...a,
        total,
        valorPago,
        saldoRestante,
        status,
        ...(status === 'paga' && !a.pagaEm ? { pagaEm: new Date().toISOString() } : {})
      };
    }));
    syncTableOccupation(contaId);
  };

  /**
   * Compatibilidade: o nome antigo continua existindo, mas resolve a conta do
   * lançamento. Nunca mais procura a mesa apenas por `order.mesaNumero`.
   */
  const syncTableTotals = (order: Order) => {
    if (!order?.contaId) return;
    syncAccountTotals(order.contaId);
  };

  /**
   * Ocupa fisicamente a mesa com a conta informada.
   *
   * Ao continuar um atendimento cuja mesa foi liberada pelo espelho, a conta é
   * RE-LIGADA à mesa (`mesaAtual*`): a mesa volta a OCUPADA pela mesma conta,
   * sem criar conta nova e sem perder o histórico de `mesaOriginal*`.
   *
   * `assumeVaga` é usado apenas quando o OPERADOR escolheu explicitamente a
   * conta: nesse caso a mesa passa a seguir a conta escolhida e o ocupante
   * anterior é somente LIBERADO fisicamente (continua aberto, com saldo e
   * histórico). Sem essa flag, uma mesa com conta atual de OUTRA conta nunca é
   * sequestrada — é o que impede conta antiga de roubar a mesa.
   */
  const occupyTable = (table: Table, account: Account, pessoas?: number, opts?: { assumeVaga?: boolean }) => {
    const live = tableByNumber(table.numero) || table;
    const temOutraConta = !!live.contaAtualId && live.contaAtualId !== account.id;
    if (temOutraConta && !opts?.assumeVaga) return;
    if (temOutraConta && opts?.assumeVaga) releaseTableOccupation(live.numero);
    setAccounts(prev => prev.map(a => a.id === account.id
      ? {
        ...a,
        mesaAtualId: live.id,
        mesaAtualNumero: live.numero,
        mesaSessaoId: a.mesaSessaoId || a.id,
        mesaSessaoNumero: a.mesaSessaoNumero ?? a.numero
      }
      : a));
    setTables(prev => prev.map(t => {
      if (t.id !== live.id) return t;
      if (t.contaAtualId && t.contaAtualId !== account.id) return t;
      return {
        ...t,
        status: (t.status === 'conta' || t.status === 'fechando') ? t.status : 'ocupada',
        contaAtualId: account.id,
        contaAtualNumero: account.numero,
        sessaoAtivaId: account.id,
        sessaoNumero: account.numero,
        ultimaContaId: account.id,
        ultimaContaNumero: account.numero,
        pedidoAtivoId: ordersOfAccount(account.id).filter(o => o.status !== 'cancelado').slice(-1)[0]?.id,
        clienteNome: account.nomeCliente || t.clienteNome,
        garcomResponsavel: t.garcomResponsavel || currentUser?.nome,
        abertaEm: t.abertaEm || account.abertaEm,
        pessoasSentadas: pessoas ?? t.pessoasSentadas
      };
    }));
  };

  /**
   * Libera apenas a OCUPAÇÃO FÍSICA da mesa. Não paga, não encerra conta e
   * não apaga pedidos — o histórico (ultimaConta*) continua na mesa.
   *
   * A conta também é sincronizada: `mesaAtual*` é removido porque a mesa não
   * está mais ocupada, mas `mesaOriginal*` e o `status` são PRESERVADOS
   * (a conta continua aberta com saldo e segue disponível para
   * "Continuar Conta X" quando o operador voltar a esta mesa).
   */
  const releaseTableOccupation = (tableNumber: number) => {
    const table = tableByNumber(tableNumber);
    const contaId = table?.contaAtualId;
    setTables(prev => prev.map(t => t.numero !== tableNumber ? t : {
      ...t,
      status: 'livre',
      pedidoAtivoId: undefined,
      contaAtualId: undefined,
      contaAtualNumero: undefined,
      sessaoAtivaId: undefined,
      sessaoNumero: undefined,
      clienteNome: undefined,
      abertaEm: undefined,
      valorAtual: 0,
      pessoasSentadas: undefined
    }));
    // Sincroniza a conta liberada: some a mesa atual, some a origem NÃO some.
    if (contaId) {
      setAccounts(prev => prev.map(a => a.id === contaId && a.mesaAtualNumero === tableNumber
        ? { ...a, mesaAtualId: undefined, mesaAtualNumero: undefined, mesaSessaoId: undefined, mesaSessaoNumero: undefined }
        : a));
    }
  };

  /**
   * Cria uma CONTA (novo atendimento financeiro). Só uma nova conta abre um
   * novo atendimento — o espelho NUNCA cria conta por conta própria.
   *
   * Se a mesa já estiver ocupada por OUTRA conta aberta, a criação é recusada
   * com mensagem clara: duas contas abertas na mesma mesa só existem por
   * escolha explícita do operador (nova conta de um cliente diferente em
   * mesa livre).
   */
  const createAccount = (input: CreateAccountInput): Account => {
    const table = input.mesaNumero !== undefined ? tableByNumber(input.mesaNumero) : undefined;
    if (input.mesaNumero !== undefined && !table) throw new Error('Mesa inexistente.');
    if (input.id && accountById(input.id)) throw new Error('Já existe uma conta com este identificador.');
    // OCUPAÇÃO: nunca sequestrar a mesa de outra conta aberta.
    const occupant = accountById(table?.contaAtualId);
    const occupiedByOther = !!table && !!table.contaAtualId && table.contaAtualId !== input.id && isAccountOpen(occupant);
    if (occupiedByOther) {
      throw new Error(`Esta mesa já está ocupada pela Conta ${occupant!.numero}. Continue essa conta ou libere/encerre a ocupação atual.`);
    }
    const numero = input.numero ?? nextAccountNumber(accountList());
    const id = input.id || uid('acc');
    const tipo = input.tipo || (table ? 'mesa' : 'balcao');
    const account: Account = {
      id,
      numero,
      tipo,
      nomeCliente: input.nomeCliente,
      telefoneCliente: input.telefoneCliente,
      mesaOriginalId: table?.id,
      mesaOriginalNumero: table?.numero,
      mesaAtualId: table?.id,
      mesaAtualNumero: table?.numero,
      status: input.status || 'aberta',
      abertaEm: input.abertaEm || new Date().toISOString(),
      total: Number(input.total) || 0,
      valorPago: Number(input.valorPago) || 0,
      saldoRestante: Number(input.saldoRestante) || 0,
      origem: input.origem || (table ? 'mesa' : tipo === 'delivery' ? 'delivery' : 'balcao'),
      contaPaiId: input.contaPaiId,
      observacoes: input.observacoes,
      criadaPor: input.criadaPor || currentUser?.nome,
      mesaSessaoId: table ? id : undefined,
      mesaSessaoNumero: table ? numero : undefined
    };
    setAccounts(prev => [...prev, account]);
    if (table) occupyTable(table, account, input.pessoas);
    recordAudit('abriu conta', 'conta', account.id, `Conta ${account.numero}${table ? ` • Mesa ${table.numero}` : ''}`);
    return account;
  };

  /** Desfaz uma conta criada na mesma operação (rollback de estado). */
  const discardAccount = (contaId: string) => {
    setAccounts(prev => prev.filter(a => a.id !== contaId));
    setTables(prev => prev.map(t => t.contaAtualId === contaId
      ? {
        ...t,
        contaAtualId: undefined,
        contaAtualNumero: undefined,
        sessaoAtivaId: undefined,
        sessaoNumero: undefined,
        status: (t.status === 'conta' || t.status === 'fechando') ? t.status : 'livre',
        valorAtual: 0
      }
      : t));
    setOrders(prev => prev.filter(o => o.contaId !== contaId));
  };

  /**
   * Escolha CENTRAL da conta de um lançamento de mesa. Mesma hierarquia do
   * PDV: conta atual -> única conta aberta ligada à mesa -> nova.
   * Em ambiguidade devolve `ambigua` para o chamador exigir escolha do
   * operador — nunca escolhe por sorteio.
   */
  const getPreferredAccountForTable = (tableNumber?: number): TableAccountResolution =>
    resolveTableAccount(accountList(), tableNumber !== undefined ? tableByNumber(tableNumber) : undefined);

  /** Contas abertas que podem receber lançamento na mesa (nunca encerradas). */
  const getOpenTableAccounts = (tableNumber?: number): Account[] =>
    openAccountsForTable(accountList(), tableNumber);


  /**
   * Decide a conta de um novo lançamento, na ordem de precedência:
   *  1. contaId explícito (o operador escolheu "Continuar Conta X");
   *  2. `novaConta: true` — escolha explícita de "Criar novo atendimento";
   *  3. conta ABERTA que ocupa a mesa;
   *  4. ÚNICA conta ABERTA ligada à mesa (inclusive liberada pelo espelho);
   *  5. nova conta.
   *
   * Nunca deriva do `status` da mesa e nunca escolhe arbitrariamente: havendo
   * mais de uma conta aberta, exige escolha do operador. Informa se a conta foi
   * CRIADA aqui, para que o chamador possa desfazer em caso de erro.
   */
  const resolveAccountForOrder = (data: CreateOrderInput, table?: Table): { account: Account; created: boolean } => {
    if (data.contaId) {
      const account = accountById(data.contaId);
      if (!account) throw new Error('A conta informada não existe.');
      if (account.status === 'encerrada') throw new Error(`A Conta ${account.numero} está encerrada e não aceita novos lançamentos.`);
      if (account.status === 'paga') throw new Error(`A Conta ${account.numero} já está quitada. Abra um novo atendimento para o próximo cliente.`);
      if (table && account.mesaAtualNumero !== undefined && account.mesaAtualNumero !== table.numero) {
        throw new Error(`A Conta ${account.numero} pertence à Mesa ${account.mesaAtualNumero}. Transfira a conta antes de lançar itens.`);
      }
      return { account, created: false };
    }
    // Escolha EXPLÍCITA de novo atendimento: não reaproveita conta aberta da
    // mesa. A criação continua sendo feita AQUI (nunca na tela do PDV).
    if (data.novaConta) {
      return {
        account: createAccount({
          tipo: data.tipo || (table ? 'mesa' : 'balcao'),
          nomeCliente: data.nomeCliente,
          telefoneCliente: data.telefoneCliente,
          mesaNumero: table?.numero
        }),
        created: true
      };
    }
    if (table) {
      const resolution = resolveTableAccount(accountList(), table);
      if (resolution.kind === 'conta') return { account: resolution.account, created: false };
      if (resolution.kind === 'ambigua') {
        throw new Error(`A Mesa ${resolution.tableNumber} tem mais de uma conta aberta (${resolution.accounts.map(a => `Conta ${a.numero}`).join(' e ')}). Escolha qual conta continua antes de confirmar.`);
      }
    }
    return {
      account: createAccount({
        tipo: data.tipo || (table ? 'mesa' : 'balcao'),
        nomeCliente: data.nomeCliente,
        telefoneCliente: data.telefoneCliente,
        mesaNumero: table?.numero
      }),
      created: true
    };
  };


  const activePrinters = () => store.state.printers.filter((p: PrinterDevice) => p.ativa && p.status === 'online');
  const buildOrderPrintContent = (order: Order, title: string, items = order.itens) => {
    const s = store.state.settings as RestaurantSettings;
    const headerName = (s?.nomeFantasia || s?.nomeCurto || 'ESTABELECIMENTO').toUpperCase();
    const lines = [
      headerName, title, `PEDIDO #${order.numero}${order.codigoExibicao ? ` • ${order.codigoExibicao}` : ''}`, `TIPO: ${order.tipo.toUpperCase()}`,
      order.contaNumero !== undefined ? `CONTA: ${order.contaNumero} • LANÇAMENTO: ${order.sequencia ?? 1}` : '',
      order.mesaNumero ? `MESA: ${order.mesaNumero}` : '', order.nomeCliente ? `CLIENTE: ${order.nomeCliente}` : '',
      order.telefoneCliente ? `TELEFONE: ${order.telefoneCliente}` : '',
      order.tipo === 'delivery' && order.enderecoEntrega ? `ENDEREÇO: ${order.enderecoEntrega.logradouro}, ${order.enderecoEntrega.numero} - ${order.enderecoEntrega.bairro}` : '',
      '--------------------------------',
      ...items.flatMap(item => [
        `${item.quantidade}x ${item.nome}${item.variacaoNome ? ` (${item.variacaoNome})` : ''}`,
        ...(item.adicionais || []).map(addon => `  + ${addon.nome}`),
        ...(item.remocoes || []).map(removal => `  SEM: ${removal}`),
        ...(item.observacao ? [`  OBS: ${item.observacao}`] : [])
      ]),
      '--------------------------------',
      `SUBTOTAL: R$ ${order.subtotal.toFixed(2)}`,
      order.desconto > 0 ? `DESCONTO: -R$ ${order.desconto.toFixed(2)}` : '',
      order.taxaEntrega > 0 ? `TAXA ENTREGA: R$ ${order.taxaEntrega.toFixed(2)}` : '',
      `TOTAL: R$ ${order.total.toFixed(2)}`, '--------------------------------'
    ];
    return lines.filter(Boolean).join('\n');
  };


  const printerMatchesLegacyPurpose = (printer: PrinterDevice, tipo: PrintRouteDocument) =>
    printer.finalidade === tipo || printer.finalidade === 'geral';

  const printerMatchesRule = (printer: PrinterDevice, order: Order, item: CartItem, tipo: PrintRouteDocument) => {
    const rules = (printer.regras || []).filter(r => r.ativo).sort((a, b) => a.prioridade - b.prioridade);
    if (!rules.length) return printerMatchesLegacyPurpose(printer, tipo);
    const menuItem = store.state.menu.find((m: MenuItem) => m.id === item.menuItemId);
    const catalogo = menuItem?.catalogo || 'restaurante';
    return rules.some(rule => {
      const docOk = !rule.documentos.length || rule.documentos.includes(tipo);
      const catalogoOk = !rule.catalogos.length || rule.catalogos.includes(catalogo as MenuCatalog);
      const tipoOk = !rule.tiposPedido.length || rule.tiposPedido.includes(order.tipo as OrderType);
      // Roteamento por categoria usa IDs (categoriaIds); o campo textual legado
      // continua aceito para compatibilidade com dados antigos.
      const categoriaOk = (!rule.categoriaIds?.length || rule.categoriaIds.includes(menuItem?.categoriaId || '')) &&
        (!rule.categorias?.length || rule.categorias.includes((menuItem?.categoria || '') as CategoryType));
      const estacaoOk = !rule.estacoes.length || rule.estacoes.includes(item.estacaoProducao as KitchenStation);
      return docOk && catalogoOk && tipoOk && categoriaOk && estacaoOk;
    });
  };

  const routePrintJobs = (order: Order, tipo: PrintRouteDocument, items = order.itens, grupoImpressaoId?: string) => {
    const printers = activePrinters();
    const jobs: PrintJob[] = [];
    const groupId = grupoImpressaoId || uid('printgrp');
    const unmatched = new Set(items.map(item => item.cartItemId));

    const configuredDedicated = store.state.printers.find(p => !(p.regras || []).length && p.finalidade === tipo);
    const dedicated = printers.find(p => !(p.regras || []).length && p.finalidade === tipo);
    const general = printers.find(p => !(p.regras || []).length && p.finalidade === 'geral');
    const legacyFallback = dedicated || (!configuredDedicated ? general : undefined);
    for (const printer of printers) {
      let routedItems = items.filter(item => printerMatchesRule(printer, order, item, tipo));
      // Delivery uses one complete ESPELHO: a destination only qualifies when
      // its active rule matches the entire order. This prevents a box from
      // receiving a partial mirror because of category-level routing.
      if (order.tipo === 'delivery' && tipo === 'espelho') {
        const complete = items.length > 0 && items.every(item => printerMatchesRule(printer, order, item, tipo));
        routedItems = complete ? items : [];
      }
      if (!(printer.regras || []).length && printer !== legacyFallback) routedItems = [];
      if (!routedItems.length) continue;
      routedItems.forEach(item => unmatched.delete(item.cartItemId));
      const job: PrintJob = {
        id: uid(`print-${tipo}`), pedidoId: order.id, grupoImpressaoId: groupId, tipo,
        impressoraId: printer.id, impressoraNome: printer.nome,
        pedidoNumero: order.numero, titulo: `${tipo === 'pedido' ? 'PEDIDO' : tipo === 'espelho' ? 'ESPELHO' : 'COMPROVANTE'} #${order.numero}`,
        conteudoTexto: buildOrderPrintContent(order, tipo === 'pedido' ? 'VIA DO PEDIDO' : tipo === 'espelho' ? 'ESPELHO DO PEDIDO' : 'COMPROVANTE', routedItems),
        status: 'pendente', dataHora: new Date().toISOString(), tentativas: 0
      };
      jobs.push(job);
    }

    if (unmatched.size) {
      const missingItems = items.filter(item => unmatched.has(item.cartItemId));
      jobs.push({
        id: uid(`print-${tipo}-falha`), pedidoId: order.id, grupoImpressaoId: groupId, tipo,
        impressoraId: 'sem-impressora', impressoraNome: 'SEM IMPRESSORA CONFIGURADA', pedidoNumero: order.numero,
        titulo: `${tipo.toUpperCase()} #${order.numero} — ROTEAMENTO INCOMPLETO`,
        conteudoTexto: buildOrderPrintContent(order, `${tipo.toUpperCase()} SEM DESTINO`, missingItems),
        status: 'falha', dataHora: new Date().toISOString(), tentativas: 0
      });
    }
    if (!jobs.length) {
      jobs.push({
        id: uid(`print-${tipo}-falha`), pedidoId: order.id, grupoImpressaoId: groupId, tipo,
        impressoraId: 'sem-impressora', impressoraNome: 'SEM IMPRESSORA CONFIGURADA', pedidoNumero: order.numero,
        titulo: `${tipo.toUpperCase()} #${order.numero} — SEM ROTEAMENTO`,
        conteudoTexto: buildOrderPrintContent(order, `${tipo.toUpperCase()} SEM DESTINO`, items),
        status: 'falha', dataHora: new Date().toISOString(), tentativas: 0
      });
    }
    setPrintQueue(prev => [...prev, ...jobs]);
    return { jobs, groupId, ok: jobs.every(j => j.status !== 'falha') };
  };

  const dispatchItems = (order: Order, items = order.itens, tipoOperacao: 'pedido_inicial' | 'pedido_adicional' = 'pedido_inicial') => {
    const result = routePrintJobs(order, 'pedido', items);
    const batch = {
      grupoId: result.groupId,
      pedidoJobId: result.jobs.find(j => j.status !== 'falha')?.id,
      pedidoJobIds: result.jobs.filter(j => j.status !== 'falha').map(j => j.id),
      pedidoGeradoEm: result.jobs[0]?.dataHora,
      tipoOperacao,
      itemIds: items.map(item => item.cartItemId)
    };
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, impressoes: [...(o.impressoes || []), batch] } : o));
    return batch;
  };

  const rerouteOrderPrintBatch = (orderId: string, grupoId?: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') throw new Error('Pedido inválido para reprocessar impressão.');
    const batches = order.impressoes || [];
    const batch = [...batches].reverse().find(b => !grupoId || b.grupoId === grupoId);
    if (!batch) throw new Error('Lote de impressão não encontrado.');
    const items = batch.itemIds?.length ? order.itens.filter(i => batch.itemIds!.includes(i.cartItemId)) : order.itens;
    const result = routePrintJobs(order, 'pedido', items, batch.grupoId);
    const next = batches.map(b => b.grupoId === batch.grupoId ? {
      ...b,
      pedidoJobId: result.jobs.find(j => j.status !== 'falha')?.id,
      pedidoJobIds: result.jobs.filter(j => j.status !== 'falha').map(j => j.id),
      pedidoGeradoEm: result.jobs[0]?.dataHora
    } : b);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, impressoes: next } : o));
    if (!result.ok) throw new Error('O roteamento continua incompleto. Verifique as regras e as impressoras.');
  };

  const generateOrderMirror = (orderId: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') throw new Error('Pedido inválido para gerar espelho.');
    const batches = order.impressoes || [];
    const batch = [...batches].reverse().find(item => !item.espelhoJobId && !(item.espelhoJobIds || []).length);
    if (!batch) return;
    if (order.status !== 'novo') throw new Error('O espelho só pode ser gerado para um pedido aguardando preparo.');
    const pedidoJobs = (batch.pedidoJobIds || [batch.pedidoJobId]).filter(Boolean).map(id => store.state.printQueue.find((job: PrintJob) => job.id === id)).filter(Boolean) as PrintJob[];
    if (!pedidoJobs.length || pedidoJobs.some(job => job.status === 'falha')) throw new Error('A via PEDIDO não foi impressa em todos os destinos. Corrija o roteamento e reimprima antes de gerar o espelho.');
    const batchItems = batch.itemIds?.length ? order.itens.filter(item => batch.itemIds!.includes(item.cartItemId)) : order.itens;
    if (!batchItems.length) throw new Error('Não há itens vinculados a este lote de impressão.');
    const result = routePrintJobs(order, 'espelho', batchItems, batch.grupoId);
    if (!result.ok) throw new Error('O espelho não foi roteado para todas as impressoras configuradas. Corrija o roteamento antes de concluir o preparo.');
    const nextBatches = batches.map(item => item.grupoId === batch.grupoId ? {
      ...item,
      espelhoJobId: result.jobs.find(j => j.status !== 'falha')?.id,
      espelhoJobIds: result.jobs.filter(j => j.status !== 'falha').map(j => j.id),
      espelhoGeradoEm: result.jobs[0]?.dataHora
    } : item);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'pronto', impressoes: nextBatches } : o));
    recordAudit('gerou espelho', 'pedido', orderId, `Lançamento ${order.codigoExibicao || order.codigoMesa || order.numero} • conclui preparo (não paga a conta)`);
    // REGRA DO SALÃO: com o espelho gerado o preparo daquele lançamento acaba.
    // Se é o ÚLTIMO lançamento da conta ainda aguardando espelho, a mesa volta
    // a ficar livre — e SOMENTE se esta conta for a que ocupa a mesa.
    // O débito permanece nos lançamentos, visível na Central de Contas.
    const contaId = order.contaId;
    if (order.tipo === 'mesa' && contaId) {
      const table = tableByNumber(order.mesaNumero);
      const isCurrentOfTable = !!table && table.contaAtualId === contaId;
      if (isCurrentOfTable && isLastOperationalOrder(orderList(), contaId, orderId)) {
        releaseTableOccupation(table!.numero);
        recordAudit('liberou mesa por espelho', 'mesa', table!.id, `Mesa ${table!.numero} • último lançamento da Conta ${accountById(contaId)?.numero} concluído`);
      }
    }
  };

  /** Próxima sequência comercial do lançamento: max(sequencia) + 1. */
  const getNextSequence = (contaId: string) => nextOrderSequence(orderList(), contaId);


  /**
   * Cria um LANÇAMENTO (pedido) dentro de uma conta.
   *
   * A numeração comercial é `contaNumero.sequencia` (ex.: 0.1, 0.2, 0.3) e a
   * sequência é SEMPRE `max(sequencia) + 1` da conta — ela nunca reinicia por
   * causa de mesa liberada e nunca usa `Date.now()`.
   */
  const createOrder = (data: CreateOrderInput): Order => {
    if (data.operacaoId) {
      const existing = orderList().find((o: Order) => o.operacaoId === data.operacaoId);
      if (existing) return existing;
    }
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa antes de vender.');
    if (!data.itens?.length) throw new Error('Adicione produtos ao pedido.');
    const values = totals(data.itens, data.desconto, data.taxaServico, data.taxaEntrega);
    const table = data.tipo === 'mesa' ? tableByNumber(data.mesaNumero) : undefined;
    if (data.tipo === 'mesa' && !table) throw new Error('Mesa inexistente.');
    // 1) conta explícita -> 2) conta atual da mesa -> 3) única conta aberta
    // ligada à mesa -> 4) nova conta. `createOrder` é quem decide: o PDV não
    // cria conta antecipadamente nem duplica esta regra.
    const { account, created } = resolveAccountForOrder(data, table);
    try {
      return buildOrderInAccount(data, table, account, values);
    } catch (err) {
      // TRANSACIONALIDADE (frontend): se a conta foi criada nesta operação e o
      // lançamento não saiu, nada sobra — nem conta, nem ocupação, nem pedido.
      if (created) discardAccount(account.id);
      throw err;
    }
  };

  /**
   * Grava o LANÇAMENTO na conta já resolvida e ocupa a mesa.
   * Separado de `createOrder` para que a resolução da conta e a gravação
   * possam ser envolvidas por rollback.
   */
  const buildOrderInAccount = (
    data: CreateOrderInput,
    table: Table | undefined,
    account: Account,
    values: ReturnType<typeof totals>
  ): Order => {
    const items = snapshotItems(data.itens);
    const sequencia = getNextSequence(account.id);
    const codigoExibicao = buildDisplayCode(account.numero, sequencia);
    // `novaConta` é flag de ENTRADA (intenção do operador), não faz parte do
    // lançamento persistido.
    const { novaConta: _intencaoNovaConta, ...entrada } = data;
    const order: Order = {
      ...entrada,
      ...values,
      id: uid('ord'),
      operacaoId: data.operacaoId || uid('op'),
      numero: Math.max(1000, ...orderList().map((o: Order) => o.numero)) + 1,
      tipo: data.tipo || 'balcao',
      contaId: account.id,
      contaNumero: account.numero,
      sequencia,
      codigoExibicao,
      mesaNumero: account.mesaAtualNumero ?? table?.numero,
      mesaOriginalNumero: account.mesaOriginalNumero ?? table?.numero,
      // espelhamento legado (modo de compatibilidade com o modelo anterior)
      mesaSessaoId: account.id,
      mesaSessaoNumero: account.numero,
      mesaPedidoSequencia: sequencia,
      codigoMesa: codigoExibicao,
      garcomNome: data.garcomNome || currentUser.nome,
      canal: data.canal || (data.tipo === 'mesa' ? 'Salão' : data.tipo === 'delivery' ? 'Delivery' : 'Balcão'),
      criadoEm: new Date().toISOString(),
      itens: items,
      status: 'novo',
      statusPagamento: values.total === 0 ? 'pago' : 'pendente',
      pagamentos: [],
      valorTotalPago: 0,
      saldoRestante: values.total
    };
    setOrders(prev => [order, ...prev]);
    if (order.clienteId) setCustomers(prev => prev.map(c => c.id === order.clienteId ? { ...c, ultimoPedidoEm: order.criadoEm, totalComprado: money((c.totalComprado || 0) + order.total) } : c));
    // A mesa é ocupada por ESTA conta. Sem conta explicitamente escolhida, outra
    // conta que já ocupa a mesa NÃO é sequestrada (a nova fica sem mesa até ser
    // transferida). Escolhendo a conta na mão, a mesa segue a escolha e o
    // ocupante anterior é apenas liberado fisicamente.
    if (table) occupyTable(table, account, undefined, { assumeVaga: !!data.contaId });
    syncAccountTotals(account.id);
    // Processar pagamentos incluídos no pedido (ex: venda balcão paga na hora).
    // addManualPaymentToOrder atualiza o store de forma síncrona via setOrders;
    // relemos o estado APÓS o loop para garantir que o pedido retornado já
    // reflita todos os pagamentos aplicados.
    if (data.pagamentos?.length) {
      for (const payment of data.pagamentos) {
        if (!addManualPaymentToOrder(order.id, payment.formaId, payment.valor, payment.valorRecebido, payment.observacao)) {
          throw new Error('Falha ao registrar pagamento. Verifique se o caixa está aberto e a forma de pagamento está ativa.');
        }
      }
    }
    dispatchItems(order);
    recordAudit('criou pedido', 'pedido', order.id, `Lançamento ${codigoExibicao} • conta ${account.numero}`);
    // Retorna o pedido mais atualizado do store (com pagamentos aplicados).
    return orderList().find((o: Order) => o.id === order.id) ?? order;
  };

  /** Lançamento explicitamente em uma conta escolhida pelo operador. */
  const addOrderToAccount = (contaId: string, data: Partial<Order>): Order =>
    createOrder({ ...data, contaId });


  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    if (status === 'pronto') {
      generateOrderMirror(orderId);
      return;
    }
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      if (status === 'entregue' && o.status !== 'pronto') throw new Error('O pedido precisa estar pronto antes de ser entregue.');
      if (status === 'finalizado' && o.status !== 'entregue' && o.tipo !== 'mesa') throw new Error('Finalize somente um pedido já entregue.');
      return { ...o, status };
    }));
  }, [setOrders]);

  const cancelOrder = (orderId: string, motivo: string) => {
    if (!hasPermission('cancelamento')) throw new Error('Sem permissão para cancelar pedidos.');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    if (!motivo.trim()) throw new Error('Informe o motivo do cancelamento.');
    if (order.valorTotalPago > 0) throw new Error('Estorne os pagamentos antes de cancelar.');
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelado', cancelamento: { motivo, usuario: currentUser.nome, dataHora: new Date().toISOString() } } : o));
    // A mesa só é liberada se ESTA conta a ocupava e não sobrou nenhum
    // lançamento válido com saldo. Cancelar nunca toca em conta alheia.
    if (order.tipo === 'mesa' && order.contaId) {
      syncAccountTotals(order.contaId);
      const account = accountById(order.contaId);
      const table = tableByNumber(order.mesaNumero);
      const own = ordersOfAccount(order.contaId).filter(o => o.status !== 'cancelado');
      if (table && table.contaAtualId === order.contaId && !own.some(o => o.saldoRestante > 0)) {
        releaseTableOccupation(table.numero);
        recordAudit('liberou mesa', 'mesa', table.id, `Mesa ${table.numero} • lançamento cancelado, conta ${account?.numero} sem saldo`);
      }
    }
    recordAudit('cancelou pedido','pedido',orderId,motivo);
  };

  const cancelOrderItem = (orderId: string, itemId: string, motivo: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado' || order.status === 'finalizado' || order.status === 'entregue') return;
    const removed = asArray(order.itens, []).find(i => i.cartItemId === itemId);
    if (!removed) return;
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    const printedBatch = (order.impressoes || []).some(batch =>
      batch.espelhoJobId && batch.itemIds?.includes(itemId)
    );
    if (printedBatch) throw new Error('Este item já foi espelhado. Reabra o pedido para fazer uma correção administrativa.');
    const items = asArray(order.itens, []).filter(i => i.cartItemId !== itemId);
    const values = totals(items, Math.min(order.desconto, calculateSubtotal(items)), order.taxaServico, order.taxaEntrega);
    if (values.total < order.valorTotalPago) throw new Error('Estorne o valor excedente antes de remover o item.');
    const next = reconcile({ ...order, ...values, itens: items });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
  };

  const addItemsToOrder = (orderId: string, newItems: CartItem[]) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado' || order.status === 'finalizado' || order.status === 'entregue' || !newItems.length) return;
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa.');
    const added = snapshotItems(newItems);
    const items = [...asArray(order.itens, []), ...added];
    const values = totals(items, order.desconto, order.taxaServico, order.taxaEntrega);
    const next = reconcile({ ...order, ...values, itens: items, status: 'novo' });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    dispatchItems(next, added, 'pedido_adicional');
    // O lançamento voltou para "aguardando espelho". Se a conta é a que ocupa
    // a mesa, a ocupação é retomada; se outra conta já ocupa a mesa, nada muda.
    const account = accountById(next.contaId);
    if (account && account.status === 'aberta' && account.mesaAtualNumero !== undefined) {
      const table = tableByNumber(account.mesaAtualNumero);
      if (table && (!table.contaAtualId || table.contaAtualId === account.id)) {
        occupyTable(table, account);
        recordAudit('reocupou mesa', 'mesa', table.id, `Mesa ${table.numero} • novo item na Conta ${account.numero} aguardando espelho`);
      }
    }
  };

  const applyOrderDiscount = (orderId: string, desconto: number, motivo: string) => {
    if (!hasPermission('desconto')) throw new Error('Sem permissão para aplicar descontos.');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado' || order.status === 'finalizado' || order.status === 'entregue') return;
    const values = totals(order.itens, desconto, order.taxaServico, order.taxaEntrega);
    if (values.total < order.valorTotalPago) throw new Error('Estorne o excedente antes de aplicar desconto.');
    const next = reconcile({ ...order, ...values, descontoMotivo: motivo });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    recordAudit('aplicou desconto','pedido',orderId,`R$ ${desconto.toFixed(2)} • ${motivo}`);
  };

  const setOrderPriority = useCallback((orderId: string, prioridade: 'normal' | 'urgente') => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, prioridade } : o));
  }, [setOrders]);

  const reopenOrder = (id: string, motivo: string) => {
    if (!hasPermission('reabertura')) throw new Error('Sem permissão para reabrir pedidos.');
    const order = store.state.orders.find((o: Order) => o.id === id) as Order | undefined;
    if (!order) return;
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    // Reabertura administrativa devolve o pedido ao estado 'pronto':
    // a cozinha já recebeu/preparou a via anterior, portanto não recriamos um
    // envio para cozinha. Novas alterações/itens gerarão um novo par impresso.
    setOrders(prev => prev.map(o => o.id === id ? { ...reconcile(o), status: 'pronto', cancelamento: undefined } : o));
    recordAudit('reabriu pedido','pedido',id,motivo);
    // Reabertura é operação PREPARO: a mesa volta a ser ocupada apenas pela
    // conta que realmente a ocupa. Uma conta antiga nunca reocupa a mesa.
    const account = accountById(order.contaId);
    if (order.tipo === 'mesa' && account && account.status === 'aberta') {
      const table = account.mesaAtualNumero !== undefined ? tableByNumber(account.mesaAtualNumero) : tableByNumber(order.mesaNumero);
      if (table && (!table.contaAtualId || table.contaAtualId === account.id)) {
        occupyTable(table, account);
        syncAccountTotals(account.id);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // editOrder — edição real de pedido com recálculo de totais e auditoria.
  // Permite alterar: itens, cliente, telefone, endereço, observação, taxaEntrega.
  // Não altera: id, numero, status, impressoes, pagamentos, operacaoId.
  // ---------------------------------------------------------------------------
  const editOrder = (orderId: string, patch: import('../types').OrderEditPatch) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order) throw new Error('Pedido não encontrado.');
    if (order.status === 'cancelado') throw new Error('Não é possível editar um pedido cancelado.');
    if (order.status === 'finalizado') throw new Error('Não é possível editar um pedido finalizado.');
    if (order.status === 'entregue') throw new Error('Não é possível editar um pedido entregue. Reabra o pedido primeiro.');
    if (order.status === 'pronto') {
      throw new Error(
        'Este pedido já foi espelhado. Use "Reabrir Pedido" antes de editar. ' +
        'Após a reabertura, as alterações gerarão uma nova via de impressão.'
      );
    }
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa antes de editar pedidos.');

    // Montar objeto atualizado com os campos do patch
    const updated: Order = {
      ...order,
      ...(patch.nomeCliente !== undefined && { nomeCliente: patch.nomeCliente }),
      ...(patch.telefoneCliente !== undefined && { telefoneCliente: patch.telefoneCliente }),
      ...(patch.enderecoEntrega !== undefined && { enderecoEntrega: patch.enderecoEntrega }),
      ...(patch.observacoesGerais !== undefined && { observacoesGerais: patch.observacoesGerais }),
      ...(patch.taxaEntrega !== undefined && { taxaEntrega: Math.max(0, patch.taxaEntrega) }),
      ...(patch.itens !== undefined && { itens: patch.itens }),
    };

    // Recalcular totais financeiros com as mesmas funções do contexto
    const calcTotals = totals(
      updated.itens,
      updated.desconto || 0,
      updated.taxaServico || 0,
      updated.taxaEntrega || 0
    );

    const withTotals: Order = {
      ...updated,
      subtotal: calcTotals.subtotal,
      desconto: calcTotals.desconto,
      taxaServico: calcTotals.taxaServico,
      taxaEntrega: calcTotals.taxaEntrega,
      total: calcTotals.total,
    };

    const recalculated = reconcile(withTotals);

    // Guardar validação financeira: nunca pode ficar com valorTotalPago > total
    if (recalculated.valorTotalPago > recalculated.total + 0.001) {
      throw new Error(
        `Impossível salvar: o valor já pago (${recalculated.valorTotalPago.toFixed(2)}) ` +
        `supera o novo total (${recalculated.total.toFixed(2)}). ` +
        `Estorne o excedente antes de reduzir o pedido.`
      );
    }

    // Gerar resumo de auditoria
    const changes: string[] = [];
    if (patch.nomeCliente !== undefined && patch.nomeCliente !== order.nomeCliente) changes.push(`cliente: "${order.nomeCliente}" → "${patch.nomeCliente}"`);
    if (patch.telefoneCliente !== undefined && patch.telefoneCliente !== order.telefoneCliente) changes.push(`telefone alterado`);
    if (patch.observacoesGerais !== undefined && patch.observacoesGerais !== order.observacoesGerais) changes.push(`observação alterada`);
    if (patch.taxaEntrega !== undefined && patch.taxaEntrega !== order.taxaEntrega) changes.push(`taxaEntrega: ${order.taxaEntrega?.toFixed(2)} → ${patch.taxaEntrega.toFixed(2)}`);
    if (patch.itens !== undefined) changes.push(`itens editados (${order.itens.length} → ${patch.itens.length} itens)`);
    if (order.total !== recalculated.total) changes.push(`total: R$${order.total.toFixed(2)} → R$${recalculated.total.toFixed(2)}`);
    const auditDetail = changes.length > 0 ? changes.join('; ') : 'sem alterações relevantes';

    setOrders(prev => prev.map(o => o.id === orderId ? recalculated : o));
    syncTableTotals(recalculated);
    recordAudit('editou pedido', 'pedido', orderId, auditDetail);
  };


  const addManualPaymentToOrder = (orderId: string, formaId: PaymentMethodId, valor: number, valorRecebido?: number, observacao?: string): boolean => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    const option = store.state.paymentOptions.find((p: ManualPaymentOption) => p.id === formaId) as ManualPaymentOption | undefined;
    if (!order || order.status === 'cancelado' || !store.state.cashRegister.aberto || !option?.ativo) return false;
    if (!Number.isFinite(valor) || valor <= 0 || money(valor) > order.saldoRestante || order.saldoRestante <= 0) return false;
    valor = amount(valor, 'Pagamento', false);
    const received = formaId === 'dinheiro' ? (valorRecebido ?? valor) : valor;
    if (!Number.isFinite(received) || received < valor) return false;
    amount(received);
    const payment: PaymentRecord = { id: uid('pay'), formaId, formaNome: option.nome, valor, valorRecebido: money(received), troco: formaId === 'dinheiro' ? money(received - valor) : 0, observacao, dataHora: new Date().toISOString(), registradoPor: currentUser.nome };
    const next = reconcile({ ...order, pagamentos: [...order.pagamentos, payment] });
    // Payment does not mark food as delivered or remove it from the kitchen.
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta + (formaId === 'dinheiro' ? valor : 0)), transacoes: [{ id: uid('tx'), tipo: 'venda_manual', valor, motivo: 'Recebimento pedido #' + order.numero, formaPagamento: formaId, horario: new Date().toISOString(), pedidoId: orderId, operador: currentUser.nome }, ...prev.transacoes] }));
    syncTableTotals(next);
    return true;
  };

  const reverseOrderPayment = (orderId: string, paymentId: string, motivo: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    const payment = order?.pagamentos.find(p => p.id === paymentId);
    if (!order || !payment || payment.estornado) return;
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa para registrar o estorno.');
    if (!motivo.trim()) throw new Error('Informe o motivo do estorno.');
    if (payment.formaId === 'dinheiro' && store.state.cashRegister.saldoAtualGaveta < payment.valor) throw new Error('Saldo de caixa insuficiente para estorno.');
    const next = reconcile({ ...order, pagamentos: order.pagamentos.map(p => p.id === paymentId ? { ...p, estornado: true, motivoEstorno: motivo, estornadoPor: currentUser.nome, estornadoEm: new Date().toISOString() } : p) });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta - (payment.formaId === 'dinheiro' ? payment.valor : 0)), transacoes: [{ id: uid('tx-rev'), tipo: 'saida_manual', valor: payment.valor, formaPagamento: payment.formaId, motivo: 'Estorno: ' + motivo, horario: new Date().toISOString(), pedidoId: orderId, operador: currentUser.nome }, ...prev.transacoes] }));
    syncTableTotals(next);
  };

  const markOrderAsPaidManually = (orderId: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    if (!order.saldoRestante) return; // Já quitado
    // Esta função indica ao usuário que deve usar o fluxo correto de pagamento.
    // Ela não realiza pagamento direto; use addManualPaymentToOrder para isso.
    throw new Error('Para registrar o recebimento, selecione a forma de pagamento e informe o valor. Para cortesia total, aplique um desconto de 100% com motivo.');
  };

  const openPaymentModal = useCallback((order: Order) => {
    setOrderForPaymentModal(order);
    setIsPaymentModalOpen(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    setIsPaymentModalOpen(false);
    setOrderForPaymentModal(null);
  }, []);

  // =================================================================
  // OPERAÇÕES DE CONTA (CHECK)
  // =================================================================

  const getAccount = (contaId: string) => accountById(contaId);
  const getAccountByNumber = (numero: number) => accountList().find(a => a.numero === numero);
  const getAccountOrders = (contaId: string) => ordersOfAccount(contaId);

  /**
   * Conta que pode ser cobrada a partir de uma mesa: a conta que ocupa a mesa
   * ou, se ela já estiver livre, a ÚNICA conta ABERTA ligada àquela mesa com
   * saldo. Ambiguidade não é resolvida por sorteio — a cobrança avisa o
   * operador para escolher na Central de Contas & Checks.
   */
  const settleableAccountOf = (table: Table): Account | undefined => {
    const current = accountById(table.contaAtualId);
    if (current && current.status !== 'encerrada') return current;
    const due = openAccountsForTable(accountList(), table.numero).filter(a => a.saldoRestante > 0);
    return due.length === 1 ? due[0] : undefined;
  };

  /**
   * Baixa financeira da CONTA: distribui o valor recebido nos lançamentos
   * (ordem de sequência) e, quando o saldo zera, conclui o atendimento.
   *
   * Não confunde com o espelho: o espelho NÃO paga. E nunca altera a mesa de
   * outra conta — só libera a mesa quando ESTA conta é a que a ocupa.
   */
  const payAccount = (contaId: string, formaId: PaymentMethodId, valor?: number, valorRecebido?: number, observacao?: string): Order[] => {
    const account = accountById(contaId);
    if (!account) throw new Error('Conta não encontrada.');
    if (account.status === 'encerrada') throw new Error(`A Conta ${account.numero} está encerrada e não recebe lançamentos.`);
    const own = ordersOfAccount(contaId).filter(o => o.status !== 'cancelado');
    if (!own.length) throw new Error('Esta conta ainda não possui lançamentos.');
    const totalDue = money(own.reduce((sum, o) => sum + o.saldoRestante, 0));
    if (totalDue <= 0) return [];
    if (!formaId) throw new Error('Selecione a forma de pagamento antes de cobrar a conta.');
    const requested = valor === undefined ? totalDue : Math.min(totalDue, amount(valor, 'Pagamento', false));
    if (requested <= 0) throw new Error('Informe um valor de pagamento válido.');
    let remaining = requested;
    const paid: Order[] = [];
    for (const order of own) {
      if (remaining <= 0) break;
      const pay = Math.min(order.saldoRestante, remaining);
      if (pay <= 0) continue;
      const first = paid.length === 0;
      const received = first && formaId === 'dinheiro' && valorRecebido !== undefined
        ? Math.max(pay, valorRecebido)
        : pay;
      const label = observacao || `Baixa da Conta ${account.numero} • Lançamento ${order.codigoExibicao || order.numero}`;
      if (!addManualPaymentToOrder(order.id, formaId, pay, received, label)) {
        throw new Error('Falha ao registrar o pagamento. Verifique se o caixa está aberto e a forma de pagamento está ativa.');
      }
      paid.push(order);
      remaining = money(remaining - pay);
    }
    if (!paid.length) throw new Error('Não foi possível registrar o pagamento.');
    const stillDue = money(ordersOfAccount(contaId).reduce((sum, o) => sum + (o.status === 'cancelado' ? 0 : o.saldoRestante), 0));
    if (stillDue > 0) {
      recordAudit('registrou pagamento', 'conta', contaId, `Conta ${account.numero} • parcial • restante ${formatBRL(stillDue)}`);
      return paid;
    }
    // Conta quitada: conclui o atendimento dos lançamentos e libera a mesa
    // SOMENTE se esta conta for a que a ocupa.
    setOrders(prev => prev.map(o => o.contaId === contaId && o.status !== 'cancelado' && o.status !== 'finalizado'
      ? { ...o, status: 'finalizado' } : o));
    const table = account.mesaAtualNumero !== undefined ? tableByNumber(account.mesaAtualNumero) : undefined;
    if (table && table.contaAtualId === contaId) {
      releaseTableOccupation(table.numero);
      recordAudit('liberou mesa', 'mesa', table.id, `Mesa ${table.numero} • Conta ${account.numero} quitada`);
    }
    syncAccountTotals(contaId);
    recordAudit('pagou conta', 'conta', contaId, `Conta ${account.numero} • ${paid.length} lançamento(s) baixado(s)`);
    return paid;
  };

  /**
   * ENCERRAMENTO DA CONTA: etapa explícita e separada do pagamento.
   * A mesa não precisa estar ocupada. Depois disso a conta não aceita novos
   * lançamentos.
   */
  const closeAccount = (contaId: string, motivo?: string): Account => {
    const account = accountById(contaId);
    if (!account) throw new Error('Conta não encontrada.');
    if (account.status === 'encerrada') throw new Error(`A Conta ${account.numero} já está encerrada.`);
    if (account.saldoRestante > 0) throw new Error(`A Conta ${account.numero} ainda tem ${formatBRL(account.saldoRestante)} em aberto. Registre o pagamento antes de encerrar.`);
    const agora = new Date().toISOString();
    setAccounts(prev => prev.map(a => a.id === contaId ? {
      ...a,
      status: 'encerrada',
      encerradaEm: agora,
      encerramento: { usuario: currentUser?.nome || 'sistema', dataHora: agora, motivo: motivo?.trim() || undefined }
    } : a));
    // A conta encerrada não ocupa mais a mesa. O histórico permanece.
    const table = account.mesaAtualNumero !== undefined ? tableByNumber(account.mesaAtualNumero) : undefined;
    if (table && table.contaAtualId === contaId) releaseTableOccupation(table.numero);
    recordAudit('encerrou conta', 'conta', contaId, `Conta ${account.numero}${motivo ? ` • ${motivo}` : ''}`);
    return { ...account, status: 'encerrada', encerradaEm: agora };
  };

  /** TRANSFERÊNCIA DE MESA: a conta e os lançamentos continuam os mesmos. */
  const transferAccount = (contaId: string, toTableNumber: number): Account => {
    const account = accountById(contaId);
    if (!account) throw new Error('Conta não encontrada.');
    if (account.status === 'encerrada') throw new Error(`A Conta ${account.numero} está encerrada e não pode ser transferida.`);
    const target = tableByNumber(toTableNumber);
    if (!target) throw new Error('Mesa inexistente.');
    if (account.mesaAtualNumero === toTableNumber) return account;
    if (target.contaAtualId && target.contaAtualId !== contaId) throw new Error(`A Mesa ${toTableNumber} já está ocupada por outra conta.`);
    const from = account.mesaAtualNumero !== undefined ? tableByNumber(account.mesaAtualNumero) : undefined;
    setAccounts(prev => prev.map(a => a.id === contaId ? {
      ...a,
      mesaAtualId: target.id,
      mesaAtualNumero: target.numero,
      mesaOriginalId: a.mesaOriginalId || target.id,
      mesaOriginalNumero: a.mesaOriginalNumero ?? target.numero,
      mesaSessaoId: a.mesaSessaoId || contaId,
      mesaSessaoNumero: a.mesaSessaoNumero ?? a.numero
    } : a));
    // Os lançamentos mudam apenas a referência de mesa atual.
    setOrders(prev => prev.map(o => o.contaId === contaId ? { ...o, mesaNumero: target.numero } : o));
    if (from && from.contaAtualId === contaId) releaseTableOccupation(from.numero);
    occupyTable(target, { ...account, mesaAtualId: target.id, mesaAtualNumero: target.numero });
    syncAccountTotals(contaId);
    recordAudit('transferiu conta', 'conta', contaId, `Conta ${account.numero} • Mesa ${from?.numero ?? '—'} → Mesa ${target.numero}`);
    return { ...account, mesaAtualId: target.id, mesaAtualNumero: target.numero };
  };

  /**
   * SPLIT DE CONTA: os itens escolhidos vão para uma nova conta filha.
   * Lançamentos são copiados (nunca apagados) quando só parte dos itens sai.
   */
  const splitAccount = (input: AccountSplitInput): AccountSplitResult => {
    const origin = accountById(input.contaId);
    if (!origin) throw new Error('Conta não encontrada.');
    if (origin.status !== 'aberta') throw new Error(`A Conta ${origin.numero} não está aberta para divisão.`);
    const selected = new Set(input.itemIds || []);
    if (!selected.size) throw new Error('Selecione ao menos um item para dividir a conta.');
    const own = ordersOfAccount(origin.id).filter(o => o.status !== 'cancelado');
    const movable = own.flatMap(o => o.itens).filter(i => selected.has(i.cartItemId));
    if (!movable.length) throw new Error('Nenhum item selecionado pertence a esta conta.');
    if (movable.length === own.reduce((sum, o) => sum + o.itens.length, 0)) {
      throw new Error('A divisão precisa manter ao menos um item na conta original.');
    }
    const created: Order[] = [];
    const touched: string[] = [];
    for (const order of own) {
      const kept = order.itens.filter(i => !selected.has(i.cartItemId));
      const moving = order.itens.filter(i => selected.has(i.cartItemId));
      if (!moving.length) continue;
      const values = totals(moving, 0, order.taxaServico, order.taxaEntrega);
      created.push({
        ...order,
        ...values,
        id: uid('ord'),
        operacaoId: uid('op'),
        itens: moving.map(i => ({ ...structuredClone(i), cartItemId: uid('item') })),
        valorTotalPago: 0,
        saldoRestante: values.total,
        statusPagamento: values.total === 0 ? 'pago' : 'pendente',
        pagamentos: [],
        impressoes: [],
        observacoesGerais: `Divisão da Conta ${origin.numero}`
      });
      if (kept.length) {
        const keptValues = totals(kept, order.desconto, order.taxaServico, order.taxaEntrega);
        if (keptValues.total < order.valorTotalPago) {
          throw new Error(`O lançamento ${order.codigoExibicao} já tem pagamento. Estorne o excedente antes de dividir.`);
        }
        touched.push(order.id);
        setOrders(prev => prev.map(o => o.id === order.id ? reconcile({ ...o, ...keptValues, itens: kept }) : o));
      } else {
        touched.push(order.id);
      }
    }
    // A conta filha herda a mesa como origem, mas NÃO ocupa a mesa.
    const child = createAccount({
      tipo: origin.tipo,
      nomeCliente: input.nomeCliente || origin.nomeCliente,
      telefoneCliente: origin.telefoneCliente,
      origem: 'split',
      contaPaiId: origin.id,
      observacoes: `Divisão da Conta ${origin.numero}`
    });
    let sequencia = getNextSequence(child.id);
    for (const order of created) {
      const codigoExibicao = buildDisplayCode(child.numero, sequencia);
      setOrders(prev => [reconcile({ ...order, contaId: child.id, contaNumero: child.numero, sequencia, codigoExibicao, mesaSessaoId: child.id, mesaSessaoNumero: child.numero, mesaPedidoSequencia: sequencia, codigoMesa: codigoExibicao }), ...prev]);
      sequencia += 1;
    }
    // Lançamentos esvaziados: ficam sem saldo, mas nunca são apagados.
    setOrders(prev => prev.map(o => touched.includes(o.id) && !o.itens.length
      ? reconcile({ ...o, status: o.status === 'finalizado' ? 'finalizado' : o.status })
      : o));
    setAccounts(prev => prev.map(a => a.id === origin.id ? { ...a, contaFilhaId: child.id } : a));
    syncAccountTotals(origin.id);
    syncAccountTotals(child.id);
    recordAudit('dividiu conta', 'conta', origin.id, `Conta ${origin.numero} → Conta ${child.numero} (${created.length} lançamento(s))`);
    return {
      contaOrigemId: origin.id,
      contaNovaId: child.id,
      contaNovaNumero: child.numero,
      lancamentosOrigem: touched,
      lancamentosNovos: created.map(o => o.id)
    };
  };

  /** UNE DUAS CONTAS ABERTAS. Nenhum registro de origem é apagado. */
  const mergeAccounts = (sourceAccountId: string, targetAccountId: string): Account => {
    if (sourceAccountId === targetAccountId) throw new Error('Escolha duas contas diferentes.');
    const source = accountById(sourceAccountId);
    const target = accountById(targetAccountId);
    if (!source || !target) throw new Error('Conta não encontrada.');
    if (target.status !== 'aberta') throw new Error(`A Conta ${target.numero} não está aberta.`);
    if (source.status === 'encerrada') throw new Error(`A Conta ${source.numero} está encerrada e não pode ser unificada.`);
    const moving = ordersOfAccount(source.id).filter(o => o.status !== 'cancelado');
    if (!moving.length) throw new Error(`A Conta ${source.numero} não possui lançamentos válidos.`);
    let sequencia = getNextSequence(target.id);
    for (const order of moving) {
      const codigoExibicao = buildDisplayCode(target.numero, sequencia);
      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        contaId: target.id,
        contaNumero: target.numero,
        sequencia,
        codigoExibicao,
        mesaSessaoId: target.id,
        mesaSessaoNumero: target.numero,
        mesaPedidoSequencia: sequencia,
        codigoMesa: codigoExibicao,
        mesaNumero: target.mesaAtualNumero ?? o.mesaNumero
      } : o));
      sequencia += 1;
    }
    const agora = new Date().toISOString();
    setAccounts(prev => prev.map(a => {
      if (a.id === source.id) {
        return { ...a, status: 'encerrada', encerradaEm: agora, contaFilhaId: target.id, encerramento: { usuario: currentUser?.nome || 'sistema', dataHora: agora, motivo: `Unificada na Conta ${target.numero}` } };
      }
      if (a.id === target.id) return { ...a, nomeCliente: a.nomeCliente || source.nomeCliente };
      return a;
    }));
    // A mesa de origem é liberada; a conta de destino permanece na sua mesa.
    const sourceTable = source.mesaAtualNumero !== undefined ? tableByNumber(source.mesaAtualNumero) : undefined;
    if (sourceTable && sourceTable.contaAtualId === source.id) {
      releaseTableOccupation(sourceTable.numero);
    }
    syncAccountTotals(target.id);
    const targetTable = target.mesaAtualNumero !== undefined ? tableByNumber(target.mesaAtualNumero) : undefined;
    if (targetTable) occupyTable(targetTable, accountById(target.id) || target);
    recordAudit('unificou conta', 'conta', target.id, `Conta ${source.numero} + Conta ${target.numero} → Conta ${target.numero}`);
    return accountById(target.id) || target;
  };

  const searchAccountList = (filters: AccountSearchFilters) => searchAccounts(accountList(), orderList(), filters);

  // =================================================================
  // OPERAÇÕES DE MESA (ocupação física) — todas via Table + Account + Order
  // =================================================================

  /** Abre um NOVO atendimento: cria uma conta nova na mesa. */
  const openTableWithOrder = (tableNumber: number, customerName?: string, pessoas: number = 2) => {
    const table = tableByNumber(tableNumber);
    if (!table) throw new Error('Mesa inexistente.');
    // "Abrir mesa" é o gesto EXPLÍCITO de novo atendimento. Ele nunca
    // sequestra uma mesa ocupada: se a conta que ocupa a mesa está aberta, o
    // operador precisa continuar aquele atendimento.
    if (table.contaAtualId) {
      const current = accountById(table.contaAtualId);
      if (current && current.status === 'aberta') {
        throw new Error(`A Mesa ${tableNumber} já possui o atendimento da Conta ${current.numero} em aberto. Use "Adicionar lançamento" para continuar nesta conta.`);
      }
    }
    createAccount({
      tipo: 'mesa',
      nomeCliente: customerName || `Mesa ${tableNumber}`,
      mesaNumero: tableNumber,
      pessoas
    });
  };

  /** Novo lançamento na conta que ocupa a mesa (ou na única conta aberta dela). */
  const addItemsToTable = (number: number, items: CartItem[]) => {
    const table = tableByNumber(number);
    if (!table || !items.length) return;
    // `contaId` fica undefined de propósito: createOrder aplica a hierarquia
    // (conta atual -> única conta aberta -> nova) e nunca duplica regra.
    createOrder({
      tipo: 'mesa',
      mesaNumero: number,
      nomeCliente: table.clienteNome,
      itens: items
    });
  };

  /** "Pedindo conta": sinaliza que a mesa aguarda baixa. Não paga nada. */
  const requestTableBill = (tableNumber: number) => {
    const table = tableByNumber(tableNumber);
    if (!table) throw new Error('Mesa inexistente.');
    if (!table.contaAtualId) return; // mesa livre não tem conta em espera
    setTables(prev => prev.map(t => t.numero === tableNumber ? { ...t, status: 'conta' } : t));
    recordAudit('solicitou conta', 'mesa', table.id, `Mesa ${tableNumber} • Conta ${table.contaAtualNumero}`);
  };

  /** Baixa manual da conta que ocupa a mesa (ou a única conta aberta dela). */
  const settleTableAccount = (tableNumber: number, method?: PaymentMethodId, amountPaid?: number, change?: number): Order | null => {
    const table = tableByNumber(tableNumber);
    if (!table) throw new Error('Mesa inexistente.');
    const account = settleableAccountOf(table);
    if (!account) {
      const due = openAccountsForTable(accountList(), tableNumber).filter(a => a.saldoRestante > 0);
      if (due.length > 1) {
        throw new Error(`A Mesa ${tableNumber} tem ${due.length} contas abertas com saldo (${due.map(a => `Conta ${a.numero}`).join(' e ')}). Escolha a conta em "Detalhes da Mesa" ou cobre em Contas & Checks.`);
      }
      throw new Error('Esta mesa não possui uma conta ativa.');
    }
    const own = ordersOfAccount(account.id).filter(o => o.status !== 'cancelado');
    if (!own.length) throw new Error('Esta conta ainda não possui lançamentos.');
    if (account.saldoRestante <= 0) {
      if (table.contaAtualId === account.id) releaseTableOccupation(tableNumber);
      return own[own.length - 1] || null;
    }
    const paid = payAccount(account.id, method as PaymentMethodId, amountPaid, method === 'dinheiro' && change ? amountPaid! + change : undefined, `Baixa manual da Mesa ${tableNumber}`);
    const updated = ordersOfAccount(account.id);
    return updated[updated.length - 1] || paid[paid.length - 1] || null;
  };

  /**
   * LIBERAR MESA manualmente: ação administrativa que altera SOMENTE a
   * ocupação física. Não paga, não encerra conta e não apaga pedidos.
   */
  const freeTableManually = (tableNumber: number) => {
    const table = tableByNumber(tableNumber);
    if (!table) throw new Error('Mesa inexistente.');
    if (!table.contaAtualId) return;
    const account = accountById(table.contaAtualId);
    releaseTableOccupation(tableNumber);
    recordAudit('liberou mesa manualmente', 'mesa', table.id,
      `Mesa ${tableNumber} • conta ${account?.numero ?? '—'} mantida${account && account.saldoRestante > 0 ? ` com saldo ${formatBRL(account.saldoRestante)}` : ''}`);
  };

  /** Transferência de mesa = transferência da conta que a ocupa. */
  const transferTable = (fromTable: number, toTable: number) => {
    const origin = tableByNumber(fromTable);
    if (!origin) throw new Error('Mesa inexistente.');
    if (fromTable === toTable) throw new Error('A mesa de origem e destino são a mesma.');
    if (!origin.contaAtualId) return; // nada ocupando a mesa
    transferAccount(origin.contaAtualId, toTable);
  };

  /** Juntar mesas: une as contas abertas ou move a única conta ocupada. */
  const joinTables = (sourceTable: number, targetTable: number) => {
    const src = tableByNumber(sourceTable);
    const tgt = tableByNumber(targetTable);
    if (!src || !tgt) throw new Error('Mesa inexistente.');
    if (sourceTable === targetTable) throw new Error('A mesa de origem e destino são a mesma.');
    if (!src.contaAtualId && !tgt.contaAtualId) throw new Error('Não há mesas ocupadas para juntar.');
    if (src.contaAtualId && tgt.contaAtualId) {
      mergeAccounts(src.contaAtualId, tgt.contaAtualId);
      return;
    }
    const accountId = (src.contaAtualId || tgt.contaAtualId)!;
    transferAccount(accountId, src.contaAtualId ? targetTable : sourceTable);
  };

  const updateTableLayout = useCallback((tableId: string, x: number, y: number, formato?: Table['formato'], setor?: Table['setor']) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          posX: x,
          posY: y,
          formato: formato || t.formato,
          setor: setor || t.setor
        };
      }
      return t;
    }));
  }, [setTables]);

  const addNewTable = useCallback((tableData: Omit<Table, 'id' | 'valorAtual'>) => {
    const newTable: Table = {
      ...tableData,
      id: uid('tbl'),
      valorAtual: 0
    };
    setTables(prev => [...prev, newTable]);
  }, [setTables]);

  const configureTableCount = useCallback((requestedCount: number) => {
    const count = Math.max(1, Math.floor(Number(requestedCount) || 1));

    setTables(prev => {
      const sorted = [...prev].sort((a, b) => a.numero - b.numero);
      const byNumber = new Map(sorted.map(table => [table.numero, table]));
      const nextTables: Table[] = [];
      const columns = 4;

      for (let number = 1; number <= count; number += 1) {
        const existing = byNumber.get(number);
        if (existing) {
          nextTables.push(existing);
          continue;
        }

        const row = Math.floor((number - 1) / columns);
        const column = (number - 1) % columns;
        nextTables.push({
          id: `tbl-${number}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          numero: number,
          capacidade: 4,
          status: 'livre',
          valorAtual: 0,
          posX: 30 + column * 120,
          posY: 40 + row * 100,
          formato: 'quadrada',
          setor: row >= 3 ? 'Deck Externo' : row >= 1 ? 'Varanda' : 'Salão Principal'
        });
      }

      // Nunca descarta uma mesa que ainda tenha operação aberta. Assim, reduzir
      // a configuração não apaga uma conta ativa ou uma reserva existente.
      const preservedOpenTables = sorted.filter(table =>
        table.numero > count && table.status !== 'livre'
      );

      return [...nextTables, ...preservedOpenTables];
    });
  }, [setTables]);

  // Printers
  const triggerTestPrint = useCallback((printerId: string) => {
    const prn = store.state.printers.find(p => p.id === printerId);
    if (!prn) return;
    const job: PrintJob = {
      id: uid('job-test'),
      tipo: 'teste',
      impressoraId: prn.id,
      impressoraNome: prn.nome,
      pedidoNumero: 0,
      titulo: 'TESTE DE COMUNICAÇÃO DE IMPRESSORA',
      conteudoTexto: `TESTE OPERACIONAL ${prn.larguraPapel}\nIP: ${prn.ip}:${prn.porta}\nStatus: ${prn.status.toUpperCase()}`,
      status: prn.status === 'online' ? 'sucesso' : 'falha',
      dataHora: new Date().toLocaleTimeString('pt-BR'),
      tentativas: 1
    };
    setPrintQueue(prev => [job, ...prev]);
    if (soundEnabled) sounds.print();
  }, [printers, soundEnabled, setPrintQueue]);

  const reprintJob = useCallback((jobId: string) => {
    const job = store.state.printQueue.find((item: PrintJob) => item.id === jobId);
    const printer = job ? store.state.printers.find((item: PrinterDevice) => item.id === job.impressoraId) : undefined;
    if (!job || !printer || printer.status !== 'online' || !printer.ativa) {
      throw new Error('Impressora indisponível para reimpressão.');
    }
    setPrintQueue(prev => prev.map(j => j.id === jobId ? { ...j, status: 'pendente', tentativas: j.tentativas + 1, dataHora: new Date().toISOString() } : j));
    if (soundEnabled) sounds.print();
  }, [soundEnabled, setPrintQueue, store]);

  const togglePrinterStatus = useCallback((printerId: string) => {
    setPrinters(prev => prev.map(p => {
      if (p.id === printerId) {
        const nextStatus = p.status === 'online' ? 'offline' : 'online';
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  }, [setPrinters]);

  const savePrinter = useCallback((printer: PrinterDevice) => {
    const normalized = normalizePrinter(printer);
    setPrinters(prev => {
      const exists = prev.some(p => p.id === normalized.id);
      if (exists) return prev.map(p => p.id === normalized.id ? normalized : p);
      return [...prev, normalized];
    });
  }, [setPrinters]);

  const deletePrinter = useCallback((printerId: string) => {
    setPrinters(prev => prev.filter(p => p.id !== printerId));
  }, [setPrinters]);

  const guardActions = <T extends object,>(api: T): T => Object.fromEntries(Object.entries(api).map(([key, value]) => [key, typeof value === 'function' ? (...args: unknown[]) => {
    try { return store.transaction(() => value(...args)); }
    catch (error) { setOperationError(error instanceof Error ? error.message : 'Não foi possível concluir a operação.'); throw error; }
  } : value])) as T;

  return (
    <RestaurantContext.Provider
      value={guardActions({
        activeModule,
        setActiveModule,
    posHandoff,
    setPosHandoff,
        currentUser, hasPermission, users, saveUser, changeUserPassword,
        login, logout, authChecked, needsSetup, completeSetup,
        settings, saveSettings, menuCategories, saveMenuCategory, deleteMenuCategory, isCategoryAllowedForCatalog,
        customers, saveCustomer, deleteCustomer, reservations, saveReservation, updateReservationStatus, auditLogs,

        health,
        refreshHealth,
        alerts,
        dismissAlert,
        clearAllAlerts,
        addAlert,
        isAlertsDrawerOpen,
        setIsAlertsDrawerOpen,
        isHealthModalOpen,
        setIsHealthModalOpen,

        menu,
        categories,
        saveMenuItem,
        deleteMenuItem,
        toggleItemAvailability,
        updateItemPrice,
        resetMenuToDefaults,

        orders,
        createOrder,
        updateOrderStatus,
        generateOrderMirror,
        rerouteOrderPrintBatch,
        cancelOrder,
        cancelOrderItem,
        addItemsToOrder,
        applyOrderDiscount,
        setOrderPriority,
        reopenOrder,
        editOrder,
        selectedOrderForModal,
        setSelectedOrderForModal,
        selectedReceiptOrder,
        setSelectedReceiptOrder,

        accounts,
        openAccounts: accounts.filter(a => a.status === 'aberta'),
        getAccount,
        getAccountByNumber,
        getAccountOrders,
        getNextSequence,
        addOrderToAccount,
        getPreferredAccountForTable,
        getOpenTableAccounts,
        createAccount,
        payAccount,
        closeAccount,
        transferAccount,
        splitAccount,
        mergeAccounts,
        searchAccounts: searchAccountList,

        paymentOptions,
        addManualPaymentToOrder,
        reverseOrderPayment,
        markOrderAsPaidManually,
        isPaymentModalOpen,
        orderForPaymentModal: orders.find(o => o.id === orderForPaymentModal?.id) || orderForPaymentModal,
        openPaymentModal,
        closePaymentModal,

        tables,
        openTableWithOrder,
        addItemsToTable,
        requestTableBill,
        settleTableAccount,
        freeTableManually,
        transferTable,
        joinTables,
        updateTableLayout,
        addNewTable,
        configureTableCount,


        cashRegister,
        openCashRegister,
        closeCashRegister,
        addCashMovement,


        printers,
        printQueue,
        triggerTestPrint,
        reprintJob,
        togglePrinterStatus,
        savePrinter,
        deletePrinter,

        soundEnabled,
        setSoundEnabled
      })}
    >
      {operationError && <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-xl rounded-xl bg-red-950 text-white p-4 shadow-xl">{operationError}<button className="ml-4 underline" onClick={() => setOperationError('')}>Fechar</button></div>}
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
