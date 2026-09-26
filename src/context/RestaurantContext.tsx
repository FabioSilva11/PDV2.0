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
  RestaurantSettings, MenuCategory
} from '../types';
import { 
  INITIAL_MENU, 
  INITIAL_TABLES, 
  INITIAL_PRINTERS, 
  INITIAL_MANUAL_PAYMENTS
} from '../data/seedData';
import { LocalStore, useStoreField } from '../lib/localStore';
import { uid, money, amount, subtotal as calculateSubtotal, totals, reconcile } from '../utils/business';
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
import type { UserRole } from '../types';

interface RestaurantContextType {
  // Navigation & Active State
  activeModule: AppModule;
  setActiveModule: (mod: AppModule) => void;
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
  createOrder: (orderData: Partial<Order>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  cancelOrder: (orderId: string, motivo: string) => void;
  cancelOrderItem: (orderId: string, cartItemId: string, motivo: string) => void;
  applyOrderDiscount: (orderId: string, desconto: number, motivo: string) => void;
  addItemsToOrder: (orderId: string, items: CartItem[]) => void;
  generateOrderMirror: (orderId: string) => void;
  rerouteOrderPrintBatch: (orderId: string, grupoId?: string) => void;
  setOrderPriority: (orderId: string, prioridade: 'normal' | 'urgente') => void;
  reopenOrder: (orderId: string, motivo: string) => void;
  /** Edita campos de um pedido existente com recálculo de totais e auditoria. */
  editOrder: (orderId: string, patch: import('../types').OrderEditPatch) => void;
  selectedOrderForModal: Order | null;
  setSelectedOrderForModal: (order: Order | null) => void;
  selectedReceiptOrder: Order | null;
  setSelectedReceiptOrder: (order: Order | null) => void;

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
    return { ...savedDatabase, menu: (savedDatabase.menu || INITIAL_MENU).map(normalizeMenuItem), orders: (savedDatabase.orders || []).map(normalizeOrder), printers: (savedDatabase.printers || []).map(normalizePrinter), printQueue: (savedDatabase.printQueue || []).map(normalizePrintJob) };
  }

  // Migração única: importa o armazenamento antigo para o banco unificado.
  const readLegacy = <T,>(name: string): T | undefined => {
    for (const prefix of LEGACY_STORAGE_PREFIXES) {
      const value = parse<T>(localStorage.getItem(prefix + name));
      if (value !== undefined) return value;
    }
    return undefined;
  };

  return {
    alerts: readLegacy<SystemAlert[]>('alerts'),
    menu: (readLegacy<MenuItem[]>('menu') || INITIAL_MENU).map(normalizeMenuItem),
    orders: (readLegacy<Order[]>('orders') || []).map(normalizeOrder),
    paymentOptions: readLegacy<ManualPaymentOption[]>('payment_options'),
    tables: readLegacy<Table[]>('tables'),
    cashRegister: readLegacy<CashRegister>('cash'),
    printers: ((readLegacy<PrinterDevice[]>('printers')?.length ? readLegacy<PrinterDevice[]>('printers') : INITIAL_PRINTERS) || []).map(normalizePrinter),
    printQueue: (readLegacy<PrintJob[]>('print_queue') || []).map(normalizePrintJob)
  };
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
        setOrders(remote.operationalDemoResetApplied ? asArray(remote.orders, []) : []);
        setPaymentOptions(asArray(remote.paymentOptions, database.paymentOptions || INITIAL_MANUAL_PAYMENTS));
        const remoteTables = asArray(remote.tables, database.tables || INITIAL_TABLES);
        setTables(remote.operationalDemoResetApplied ? remoteTables : clearDemoTableOccupancy(remoteTables));
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
  const syncTableTotals = (order: Order) => {
    if (order.tipo !== 'mesa' || !order.mesaSessaoId || order.mesaNumero === undefined) return;
    const sessionTotal = store.state.orders
      .filter((o: Order) => o.tipo === 'mesa' && o.mesaNumero === order.mesaNumero && o.mesaSessaoId === order.mesaSessaoId && o.status !== 'cancelado')
      .reduce((sum: number, o: Order) => sum + o.saldoRestante, 0);
    setTables(prev => prev.map(t => t.numero === order.mesaNumero ? { ...t, valorAtual: money(sessionTotal), pedidoAtivoId: order.id } : t));
  };
  const activePrinters = () => store.state.printers.filter((p: PrinterDevice) => p.ativa && p.status === 'online');
  const buildOrderPrintContent = (order: Order, title: string, items = order.itens) => {
    const s = store.state.settings as RestaurantSettings;
    const headerName = (s?.nomeFantasia || s?.nomeCurto || 'ESTABELECIMENTO').toUpperCase();
    const lines = [
      headerName, title, `PEDIDO ${order.codigoMesa ? order.codigoMesa + ' • ' : ''}#${order.numero}`, `TIPO: ${order.tipo.toUpperCase()}`,
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
    // Regra de salão: com o espelho gerado o preparo da mesa está concluído.
    // Quando não sobra nenhum pedido da sessão aguardando espelho, a mesa volta
    // a ficar livre. Eventual débito permanece nos pedidos (visível em Pedidos).
    if (order.tipo === 'mesa' && order.mesaNumero !== undefined) {
      const sessionId = order.mesaSessaoId;
      const stillAwaitingMirror = store.state.orders.some(o =>
        o.tipo === 'mesa' && o.status === 'novo' && (sessionId
          ? o.mesaSessaoId === sessionId
          : o.mesaNumero === order.mesaNumero && !o.mesaSessaoId));
      if (!stillAwaitingMirror) {
        setTables(prev => prev.map(t => t.numero === order.mesaNumero ? {
          ...t,
          status: 'livre',
          pedidoAtivoId: undefined,
          sessaoAtivaId: undefined,
          sessaoNumero: undefined,
          clienteNome: undefined,
          abertaEm: undefined,
          valorAtual: 0,
          pessoasSentadas: undefined
        } : t));
      }
    }
  };

  const getNextTableSession = (tableNumber: number) => {
    const table = store.state.tables.find((t: Table) => t.numero === tableNumber) as Table | undefined;
    if (!table) throw new Error('Mesa inexistente.');
    if (table.sessaoAtivaId && table.sessaoNumero) {
      return { id: table.sessaoAtivaId, numero: table.sessaoNumero };
    }
    const previousNumbers = store.state.orders
      .filter((o: Order) => o.tipo === 'mesa' && o.mesaNumero === tableNumber && Number.isFinite(Number(o.mesaSessaoNumero)))
      .map((o: Order) => Number(o.mesaSessaoNumero));
    const numero = Math.max(0, ...previousNumbers) + 1;
    const id = uid(`mesa-${tableNumber}-sess`);
    setTables(prev => prev.map(t => t.numero === tableNumber ? {
      ...t,
      status: t.status === 'conta' ? 'conta' : 'ocupada',
      sessaoAtivaId: id,
      sessaoNumero: numero,
      abertaEm: t.abertaEm || new Date().toISOString(),
    } : t));
    return { id, numero };
  };

  const getNextTableOrderSequence = (sessionId: string) => {
    const sequences = store.state.orders
      .filter((o: Order) => o.mesaSessaoId === sessionId)
      .map((o: Order) => Number(o.mesaPedidoSequencia))
      .filter(Number.isFinite);
    return Math.max(-1, ...sequences) + 1;
  };

  const createOrder = (data: Partial<Order>): Order => {
    if (data.operacaoId) {
      const existing = store.state.orders.find((o: Order) => o.operacaoId === data.operacaoId);
      if (existing) return existing;
    }
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa antes de vender.');
    if (!data.itens?.length) throw new Error('Adicione produtos ao pedido.');
    const values = totals(data.itens, data.desconto, data.taxaServico, data.taxaEntrega);
    const table = data.tipo === 'mesa' ? store.state.tables.find((t: Table) => t.numero === data.mesaNumero) as Table | undefined : undefined;
    if (data.tipo === 'mesa' && !table) throw new Error('Mesa inexistente.');
    if (data.tipo === 'mesa' && table.status === 'ocupada' && !data.mesaSessaoId && !table.sessaoAtivaId) {
      throw new Error('Mesa inexistente ou com pedido ativo. Adicione itens à conta existente.');
    }
    const items = snapshotItems(data.itens);
    let mesaSessaoId = data.mesaSessaoId || table?.sessaoAtivaId;
    let mesaSessaoNumero = data.mesaSessaoNumero || table?.sessaoNumero;
    let mesaPedidoSequencia = data.mesaPedidoSequencia;
    if (table && table.sessaoAtivaId) {
      const session = getNextTableSession(table.numero);
      mesaSessaoId = session.id;
      mesaSessaoNumero = session.numero;
      mesaPedidoSequencia = getNextTableOrderSequence(session.id);
    }
    const codigoMesa = table && mesaSessaoNumero !== undefined && mesaPedidoSequencia !== undefined
      ? `${mesaSessaoNumero}.${mesaPedidoSequencia}` : undefined;
    const order: Order = { ...data, ...values, id: uid('ord'), operacaoId: data.operacaoId || uid('op'), numero: Math.max(1000, ...store.state.orders.map((o: Order) => o.numero)) + 1,
      tipo: data.tipo || 'balcao', mesaSessaoId, mesaSessaoNumero, mesaPedidoSequencia, codigoMesa,
      garcomNome: data.garcomNome || currentUser.nome, canal: data.canal || (data.tipo === 'mesa' ? 'Salão' : data.tipo === 'delivery' ? 'Delivery' : 'Balcão'), criadoEm: new Date().toISOString(), itens: items,
      status: 'novo', statusPagamento: values.total === 0 ? 'pago' : 'pendente', pagamentos: [], valorTotalPago: 0, saldoRestante: values.total };
    setOrders(prev => [order, ...prev]);
    if (order.clienteId) setCustomers(prev => prev.map(c => c.id === order.clienteId ? { ...c, ultimoPedidoEm: order.criadoEm, totalComprado: money((c.totalComprado || 0) + order.total) } : c));
    if (table) setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'ocupada', pedidoAtivoId: order.id, sessaoAtivaId: mesaSessaoId, sessaoNumero: mesaSessaoNumero, valorAtual: money((prev.filter(x => x.sessaoAtivaId === mesaSessaoId).reduce((sum, x) => sum + x.valorAtual, 0)) + order.saldoRestante), abertaEm: t.abertaEm || order.criadoEm } : t));
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
    recordAudit('criou pedido','pedido',order.id,`${order.tipo} • ${order.codigoMesa || '#' + order.numero}`);
    // Retorna o pedido mais atualizado do store (com pagamentos aplicados).
    return store.state.orders.find((o: Order) => o.id === order.id) ?? order;
  };

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
    if (order.tipo === 'mesa' && order.mesaSessaoId) {
      const next = store.state.orders.find((o: Order) => o.mesaSessaoId === order.mesaSessaoId && o.id !== orderId && o.status !== 'cancelado' && o.saldoRestante > 0);
      setTables(prev => prev.map(t => t.numero === order.mesaNumero ? { ...t, status: next ? t.status : 'livre', pedidoAtivoId: next?.id, valorAtual: next ? t.valorAtual : 0, clienteNome: next ? t.clienteNome : undefined, abertaEm: next ? t.abertaEm : undefined, sessaoAtivaId: next ? t.sessaoAtivaId : undefined, sessaoNumero: next ? t.sessaoNumero : undefined } : t));
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
    const reopened = order.tipo === 'mesa' && order.mesaNumero;
    if (reopened) {
      setTables(prev => prev.map(t => t.numero === order.mesaNumero ? {
        ...t, status: 'ocupada', pedidoAtivoId: order.id, clienteNome: order.nomeCliente,
        abertaEm: t.abertaEm || order.criadoEm, valorAtual: order.saldoRestante
      } : t));
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

  // Tables Management
  const openTableWithOrder = useCallback((tableNumber: number, customerName?: string, pessoas: number = 2) => {
    setTables(prev => prev.map(t => {
      if (t.numero === tableNumber && t.status === 'livre') {
        const previousNumbers = store.state.orders
          .filter((o: Order) => o.tipo === 'mesa' && o.mesaNumero === tableNumber && Number.isFinite(Number(o.mesaSessaoNumero)))
          .map((o: Order) => Number(o.mesaSessaoNumero));
        const sessaoNumero = Math.max(0, ...previousNumbers) + 1;
        return {
          ...t,
          status: 'ocupada',
          clienteNome: customerName || 'Cliente Salão',
          garcomResponsavel: currentUser.nome,
          abertaEm: new Date().toISOString(),
          pessoasSentadas: pessoas,
          valorAtual: 0,
          sessaoAtivaId: uid(`mesa-${tableNumber}-sess`),
          sessaoNumero,
          pedidoAtivoId: undefined,
        };
      }
      return t;
    }));
  }, [setTables, currentUser]);

  const addItemsToTable = (number: number, items: CartItem[]) => {
    const table = store.state.tables.find((t: Table) => t.numero === number) as Table | undefined;
    if (!table || !items.length) return;
    // Cada novo lançamento na mesa vira um novo pedido da mesma sessão:
    // 1.0, 1.1, 1.2... O histórico nunca é sobrescrito.
    createOrder({ tipo: 'mesa', mesaNumero: number, mesaSessaoId: table.sessaoAtivaId, mesaSessaoNumero: table.sessaoNumero, nomeCliente: table.clienteNome, itens: items });
  };

  const requestTableBill = useCallback((tableNumber: number) => {
    setTables(prev => prev.map(t => t.numero === tableNumber ? { ...t, status: 'conta' } : t));
  }, [setTables]);

  const settleTableAccount = useCallback((tableNumber: number, method?: PaymentMethodId, amountPaid?: number, change?: number): Order | null => {
    const table = store.state.tables.find((t: Table) => t.numero === tableNumber) as Table | undefined;
    if (!table || table.status === 'livre') throw new Error('Esta mesa não possui uma sessão ativa.');
    const sessionOrders = store.state.orders
      .filter((o: Order) => o.tipo === 'mesa' && o.mesaNumero === tableNumber && (table.sessaoAtivaId ? o.mesaSessaoId === table.sessaoAtivaId : (o.id === table.pedidoAtivoId || (o.status !== 'cancelado' && o.status !== 'finalizado'))) && o.status !== 'cancelado')
      .sort((a: Order, b: Order) => (a.mesaPedidoSequencia ?? 0) - (b.mesaPedidoSequencia ?? 0));
    if (!sessionOrders.length) throw new Error('Esta mesa ainda não possui pedidos.');
    const totalDue = money(sessionOrders.reduce((sum, o) => sum + o.saldoRestante, 0));
    if (totalDue <= 0) {
      setTables(prev => prev.map(t => t.numero === tableNumber ? { ...t, status: 'livre', pedidoAtivoId: undefined, sessaoAtivaId: undefined, sessaoNumero: undefined, clienteNome: undefined, abertaEm: undefined, valorAtual: 0, pessoasSentadas: undefined } : t));
      return sessionOrders[sessionOrders.length - 1] || null;
    }
    if (!method) throw new Error('Selecione a forma de pagamento antes de fechar a conta.');
    const requested = amountPaid === undefined ? totalDue : Math.min(totalDue, amount(amountPaid, 'Pagamento', false));
    if (requested <= 0) throw new Error('Informe um valor de pagamento válido.');
    let remaining = requested;
    for (const order of sessionOrders) {
      if (remaining <= 0) break;
      const pay = Math.min(order.saldoRestante, remaining);
      if (pay <= 0) continue;
      const received = order === sessionOrders[0] && change !== undefined && method === 'dinheiro' ? Math.max(pay, pay + Math.max(0, change)) : pay;
      if (!addManualPaymentToOrder(order.id, method, pay, received, `Baixa manual da Mesa ${tableNumber} • Pedido ${order.codigoMesa || order.numero}`)) {
        throw new Error('Falha ao registrar pagamento da mesa. Verifique se o caixa está aberto.');
      }
      remaining = money(remaining - pay);
    }
    const updatedOrders = store.state.orders.filter((o: Order) => sessionOrders.some(x => x.id === o.id));
    const stillDue = money(updatedOrders.reduce((sum, o) => sum + o.saldoRestante, 0));
    const lastOrder = updatedOrders[updatedOrders.length - 1] || sessionOrders[sessionOrders.length - 1];
    if (stillDue > 0) {
      setTables(prev => prev.map(t => t.numero === tableNumber ? { ...t, status: 'conta', valorAtual: stillDue } : t));
      return lastOrder;
    }
    setOrders(prev => prev.map(o => sessionOrders.some(x => x.id === o.id) ? { ...o, status: 'finalizado' } : o));
    const finalized = updatedOrders.map(o => ({ ...o, status: 'finalizado' as const }));
    setTables(prev => prev.map(t => t.numero === tableNumber ? { ...t, status: 'livre', pedidoAtivoId: undefined, sessaoAtivaId: undefined, sessaoNumero: undefined, clienteNome: undefined, abertaEm: undefined, valorAtual: 0, pessoasSentadas: undefined } : t));
    return finalized[finalized.length - 1] || lastOrder;
  }, [setTables, setOrders, store]);

  const freeTableManually = useCallback((tableNumber: number) => {
    setTables(prev => prev.map(t => {
      if (t.numero === tableNumber) {
        return {
          ...t,
          status: 'livre',
          pedidoAtivoId: undefined,
          sessaoAtivaId: undefined,
          sessaoNumero: undefined,
          clienteNome: undefined,
          abertaEm: undefined,
          valorAtual: 0,
          pessoasSentadas: undefined
        };
      }
      return t;
    }));
  }, [setTables]);

  const transferTable = useCallback((fromTable: number, toTable: number) => {
    const origin = store.state.tables.find(t => t.numero === fromTable);
    if (!origin || origin.status === 'livre') return;
    const target = store.state.tables.find((t: Table) => t.numero === toTable);
    if (!target || target.status !== 'livre' || fromTable === toTable) throw new Error('Escolha uma mesa livre.');

    setTables(prev => prev.map(t => {
      if (t.numero === toTable) {
        return {
          ...t,
          status: 'ocupada',
          clienteNome: origin.clienteNome,
          pedidoAtivoId: origin.pedidoAtivoId,
          sessaoAtivaId: origin.sessaoAtivaId,
          sessaoNumero: origin.sessaoNumero,
          abertaEm: origin.abertaEm,
          valorAtual: origin.valorAtual,
          garcomResponsavel: origin.garcomResponsavel,
          pessoasSentadas: origin.pessoasSentadas
        };
      }
      if (t.numero === fromTable) {
        return {
          ...t,
          status: 'livre',
          clienteNome: undefined,
          pedidoAtivoId: undefined,
          abertaEm: undefined,
          valorAtual: 0,
          pessoasSentadas: undefined
        };
      }
      return t;
    }));

    // Update order table reference
    setOrders(prev => prev.map(o => 
      (origin.sessaoAtivaId && o.mesaSessaoId === origin.sessaoAtivaId) || o.id === origin.pedidoAtivoId || o.mesaNumero === fromTable
        ? { ...o, mesaNumero: toTable }
        : o
    ));
  }, [tables, setTables, setOrders]);

  const joinTables = useCallback((sourceTable: number, targetTable: number) => {
    const src = store.state.tables.find((t: Table) => t.numero === sourceTable);
    const tgt = store.state.tables.find((t: Table) => t.numero === targetTable);
    if (!src || !tgt || sourceTable === targetTable) return;
    if (tgt.status === 'livre' && src.status === 'livre') throw new Error('Não há mesas ocupadas para juntar.');
    if (tgt.status !== 'livre' && src.status !== 'livre' && src.pedidoAtivoId && tgt.pedidoAtivoId) {
      const sourceOrder = store.state.orders.find((o: Order) => o.id === src.pedidoAtivoId) as Order | undefined;
      const targetOrder = store.state.orders.find((o: Order) => o.id === tgt.pedidoAtivoId) as Order | undefined;
      if (!sourceOrder || !targetOrder) throw new Error('Não foi possível localizar as contas das mesas.');
      const items = [...targetOrder.itens, ...sourceOrder.itens];
      const values = totals(items, targetOrder.desconto + sourceOrder.desconto, targetOrder.taxaServico + sourceOrder.taxaServico, targetOrder.taxaEntrega + sourceOrder.taxaEntrega);
      const merged = reconcile({ ...targetOrder, ...values, itens: items });
      setOrders(prev => prev.map(o => o.id === targetOrder.id ? merged : o));
      setOrders(prev => prev.filter(o => o.id !== sourceOrder.id));
      syncTableTotals(merged);
      setTables(prev => prev.map(t => t.numero === targetTable ? { ...t, status: 'ocupada', valorAtual: merged.saldoRestante, clienteNome: `${tgt.clienteNome || ''}${src.clienteNome ? ` + ${src.clienteNome}` : ''}`.trim() } : t.numero === sourceTable ? { ...t, status: 'livre', valorAtual: 0, clienteNome: undefined, pedidoAtivoId: undefined, abertaEm: undefined, pessoasSentadas: undefined } : t));
      return;
    }
    const occupied = src.status !== 'livre' ? src : tgt;
    const target = tgt.status === 'livre' ? tgt : src;
    setTables(prev => prev.map(t => t.numero === target.numero ? { ...t, status: 'ocupada', clienteNome: occupied.clienteNome, pedidoAtivoId: occupied.pedidoAtivoId, abertaEm: occupied.abertaEm, valorAtual: occupied.valorAtual, garcomResponsavel: occupied.garcomResponsavel, pessoasSentadas: occupied.pessoasSentadas } : t.numero === occupied.numero ? { ...t, status: 'livre', clienteNome: undefined, pedidoAtivoId: undefined, abertaEm: undefined, valorAtual: 0, pessoasSentadas: undefined } : t));
    if (occupied.pedidoAtivoId) setOrders(prev => prev.map(o => o.id === occupied.pedidoAtivoId ? { ...o, mesaNumero: target.numero } : o));
  }, [setTables, setOrders, store]);

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