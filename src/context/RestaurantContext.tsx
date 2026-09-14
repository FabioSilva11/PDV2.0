import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppModule,
  MenuItem, 
  CartItem, 
  Order, 
  Table, 
  Comanda,
  CashRegister, 
  OrderStatus,
  PaymentMethodId,
  PaymentRecord,
  Courier,
  PrinterDevice,
  PrinterRoutingRule,
  PrintJob,
  SystemAlert,
  ManualPaymentOption,
  CategoryType
} from '../types';
import { 
  INITIAL_MENU, 
  INITIAL_TABLES, 
  INITIAL_ORDERS, 
  INITIAL_COMANDAS, 
  INITIAL_COURIERS, 
  INITIAL_PRINTERS, 
  INITIAL_PRINTER_ROUTING, 
  INITIAL_ALERTS, 
  INITIAL_CASH_REGISTER, 
  INITIAL_MANUAL_PAYMENTS
} from '../data/seedData';
import { LocalStore, useStoreField } from '../lib/localStore';
import { uid, money, amount, subtotal as calculateSubtotal, totals, reconcile } from '../utils/business';
import { sounds } from '../utils/audio';
import {
  firebaseDatabaseEnabled,
  loadRemoteDatabase,
  saveRemoteDatabase
} from '../lib/firebaseDatabase';

interface HealthStatus {
  internet: 'online' | 'offline' | 'atencao';
  servidor: 'online' | 'offline' | 'atencao';
  sistema: 'online' | 'offline' | 'atencao';
  impressoras: 'online' | 'offline' | 'atencao';
  kds: 'online' | 'offline' | 'atencao';
  ultimoBackup: string;
  ultimaSincronizacao: string;
}

export interface CurrentUser {
  id: string;
  nome: string;
  cargo: string;
  usuario?: string;
}

const DEFAULT_ADMIN: CurrentUser = {
  id: 'usr-1',
  nome: 'Carlos Mendes',
  cargo: 'Administrador',
  usuario: 'admin'
};

interface RestaurantContextType {
  // Navigation & Active State
  activeModule: AppModule;
  setActiveModule: (mod: AppModule) => void;
  currentUser: CurrentUser;

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
  updateOrderItemProductionStatus: (orderId: string, cartItemId: string, status: 'pendente' | 'preparando' | 'pronto') => void;
  setOrderPriority: (orderId: string, prioridade: 'normal' | 'urgente') => void;
  reopenOrder: (orderId: string, motivo: string) => void;
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
  settleTableAccount: (tableNumber: number) => void;
  freeTableManually: (tableNumber: number) => void;
  transferTable: (fromTable: number, toTable: number) => void;
  joinTables: (sourceTable: number, targetTable: number) => void;
  updateTableLayout: (tableId: string, x: number, y: number, formato?: Table['formato'], setor?: Table['setor']) => void;
  addNewTable: (table: Omit<Table, 'id' | 'valorAtual'>) => void;
  configureTableCount: (count: number) => void;

  // Comandas Management
  comandas: Comanda[];
  createComanda: (numero: number, clienteNome?: string, mesaNumero?: number, limite?: number) => void;
  addItemsToComanda: (comandaId: string, items: CartItem[]) => void;
  transferComandaItems: (fromComandaId: string, toComandaId: string, itemIds: string[]) => void;
  closeComanda: (comandaId: string) => void;

  // Cash Register (Manual Flow)
  cashRegister: CashRegister;
  openCashRegister: (initialAmount: number) => void;
  closeCashRegister: (blindCloseData?: CashRegister['fechamentoCego']) => void;
  addCashMovement: (tipo: 'suprimento' | 'sangria' | 'entrada_manual' | 'saida_manual', valor: number, motivo: string) => void;

  // Delivery & Couriers
  couriers: Courier[];
  assignCourierToOrder: (orderId: string, courierName: string) => void;
  completeDeliveryOrder: (orderId: string) => void;
  updateCourierStatus: (courierId: string, status: Courier['status']) => void;

  // Printers & Print Queue
  printers: PrinterDevice[];
  routingRules: PrinterRoutingRule[];
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

const DATABASE_STORAGE_KEY = 'murupi_restaurant_database_v1';
const LEGACY_STORAGE_PREFIXES = ['rest_saas_v6_', 'rest_saas_v5_', 'rest_saas_v4_', 'rest_saas_v3_'];

interface RestaurantDatabaseSnapshot {
  operationalDemoResetApplied?: boolean;
  alerts?: SystemAlert[];
  menu?: MenuItem[];
  orders?: Order[];
  paymentOptions?: ManualPaymentOption[];
  tables?: Table[];
  comandas?: Comanda[];
  cashRegister?: CashRegister;
  couriers?: Courier[];
  printers?: PrinterDevice[];
  printQueue?: PrintJob[];
}

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
  if (savedDatabase) return savedDatabase;

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
    menu: readLegacy<MenuItem[]>('menu'),
    orders: readLegacy<Order[]>('orders'),
    paymentOptions: readLegacy<ManualPaymentOption[]>('payment_options'),
    tables: readLegacy<Table[]>('tables'),
    comandas: readLegacy<Comanda[]>('comandas'),
    cashRegister: readLegacy<CashRegister>('cash'),
    couriers: readLegacy<Courier[]>('couriers'),
    printers: readLegacy<PrinterDevice[]>('printers'),
    printQueue: readLegacy<PrintJob[]>('print_queue')
  };
};

const clearDemoTableOccupancy = (tables: Table[]): Table[] => tables.map(table => ({
  ...table,
  status: 'livre',
  garcomResponsavel: undefined,
  clienteNome: undefined,
  abertaEm: undefined,
  pedidoAtivoId: undefined,
  comandasIds: [],
  valorAtual: 0,
  pessoasSentadas: undefined
}));

const asArray = <T,>(value: T[] | Record<string, T> | undefined, fallback: T[]): T[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return fallback;
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [database] = useState<RestaurantDatabaseSnapshot>(loadRestaurantDatabase);
  const [store] = useState(() => new LocalStore(DATABASE_STORAGE_KEY));
  const [operationError, setOperationError] = useState('');
  // Navigation & User
  const [activeModule, setActiveModule] = useState<AppModule>('dashboard');
  const currentUser = DEFAULT_ADMIN;

  // Operational Health
  const [health, setHealth] = useState<HealthStatus>({
    internet: 'online',
    servidor: 'online',
    sistema: 'online',
    impressoras: 'atencao',
    kds: 'online',
    ultimoBackup: 'Hoje às 11:30',
    ultimaSincronizacao: 'Há poucos segundos'
  });
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useStoreField<SystemAlert[]>(store, 'alerts', () => {
    return database.operationalDemoResetApplied ? (database.alerts || []) : [];
  });
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);

  // Menu
  const [menu, setMenu] = useStoreField<MenuItem[]>(store, 'menu', () => {
    return database.menu || INITIAL_MENU;
  });

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

  // Comandas
  const [comandas, setComandas] = useStoreField<Comanda[]>(store, 'comandas', () => {
    return database.operationalDemoResetApplied ? (database.comandas || []) : [];
  });

  // Cash Register
  const [cashRegister, setCashRegister] = useStoreField<CashRegister>(store, 'cashRegister', () => {
    return database.cashRegister || INITIAL_CASH_REGISTER;
  });

  // Couriers
  const [couriers, setCouriers] = useStoreField<Courier[]>(store, 'couriers', () => {
    return database.couriers || INITIAL_COURIERS;
  });

  // Printers
  const [printers, setPrinters] = useStoreField<PrinterDevice[]>(store, 'printers', () => {
    return database.printers || INITIAL_PRINTERS;
  });
  const [routingRules] = useState<PrinterRoutingRule[]>(INITIAL_PRINTER_ROUTING);
  const [printQueue, setPrintQueue] = useStoreField<PrintJob[]>(store, 'printQueue', () => database.printQueue || []);

  // Sound
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Firebase é a fonte remota principal. O estado local é exibido imediatamente
  // como cache e substituído pelo documento remoto assim que a leitura termina.
  const [firebaseSyncReady, setFirebaseSyncReady] = useState(!firebaseDatabaseEnabled);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromFirebase = async () => {
      if (!firebaseDatabaseEnabled) {
        setFirebaseSyncReady(true);
        return;
      }

      const remote = await loadRemoteDatabase<RestaurantDatabaseSnapshot>();
      if (cancelled) return;

      if (remote) {
        setAlerts(remote.operationalDemoResetApplied ? asArray(remote.alerts, []) : []);
        setMenu(asArray(remote.menu, database.menu || INITIAL_MENU));
        setOrders(remote.operationalDemoResetApplied ? asArray(remote.orders, []) : []);
        setPaymentOptions(asArray(remote.paymentOptions, database.paymentOptions || INITIAL_MANUAL_PAYMENTS));
        const remoteTables = asArray(remote.tables, database.tables || INITIAL_TABLES);
        setTables(remote.operationalDemoResetApplied ? remoteTables : clearDemoTableOccupancy(remoteTables));
        setComandas(remote.operationalDemoResetApplied ? asArray(remote.comandas, []) : []);
        setCashRegister(remote.cashRegister || database.cashRegister || INITIAL_CASH_REGISTER);
        setCouriers(asArray(remote.couriers, database.couriers || INITIAL_COURIERS));
        setPrinters(asArray(remote.printers, database.printers || INITIAL_PRINTERS));
        setPrintQueue(asArray(remote.printQueue, []));
      }

      setFirebaseSyncReady(true);
    };

    void hydrateFromFirebase();
    return () => {
      cancelled = true;
    };
  }, [database]);

  store.state.operationalDemoResetApplied = true;
  useEffect(() => {
    store.onCommit = snapshot => {
      if (firebaseSyncReady) void saveRemoteDatabase(snapshot).catch(error => setOperationError(error.message));
    };
    return () => { store.onCommit = undefined; };
  }, [store, firebaseSyncReady]);

  // Refresh Health
  const refreshHealth = useCallback(() => {
    const hasOfflinePrinters = store.state.printers.some(p => p.status === 'offline');
    setHealth({
      internet: 'online',
      servidor: 'online',
      sistema: 'online',
      impressoras: hasOfflinePrinters ? 'atencao' : 'online',
      kds: 'online',
      ultimoBackup: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      ultimaSincronizacao: 'Sincronizado agora'
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
  }, [setMenu]);

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
    cartItemId: item.cartItemId || uid('item'),
    statusProducao: 'pendente'
  }));
  const syncTableTotals = (order: Order) => {
    setTables(prev => prev.map(t => t.pedidoAtivoId === order.id ? { ...t, valorAtual: order.saldoRestante } : t));
  };
  const dispatchItems = (order: Order, items: CartItem[], prefix = 'PEDIDO') => {
    for (const station of new Set(items.map(i => i.estacaoProducao))) {
      const route = routingRules.find(r => r.estacao === station);
      const printer = store.state.printers.find((p: PrinterDevice) => p.id === route?.impressoraId) as PrinterDevice | undefined;
      if (!printer) continue;
      const content = items.filter(i => i.estacaoProducao === station).map(i => i.quantidade + 'x ' + i.nome + (i.observacao ? ' [OBS: ' + i.observacao + ']' : '') + (i.adicionais || []).map(a => ' + ' + a.nome).join('')).join('\n');
      setPrintQueue(prev => [{ id: uid('job'), impressoraId: printer.id, impressoraNome: printer.nome, pedidoNumero: order.numero, titulo: prefix + ' #' + order.numero, conteudoTexto: content, status: 'pendente', dataHora: new Date().toISOString(), tentativas: 0 }, ...prev]);
    }
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
    if (data.tipo === 'mesa' && (!table || table.pedidoAtivoId)) throw new Error('Mesa inexistente ou com pedido ativo. Adicione itens à conta existente.');
    const items = snapshotItems(data.itens);
    let order: Order = { ...data, ...values, id: uid('ord'), operacaoId: data.operacaoId || uid('op'), numero: Math.max(1000, ...store.state.orders.map((o: Order) => o.numero)) + 1,
      tipo: data.tipo || 'balcao', garcomNome: data.garcomNome || currentUser.nome, canal: data.canal || (data.tipo === 'mesa' ? 'Salão' : data.tipo === 'delivery' ? 'Delivery' : 'Balcão'), criadoEm: new Date().toISOString(), itens: items,
      status: 'novo', statusPagamento: values.total === 0 ? 'pago' : 'pendente', pagamentos: [], valorTotalPago: 0, saldoRestante: values.total };
    setOrders(prev => [order, ...prev]);
    if (table) setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'ocupada', pedidoAtivoId: order.id, valorAtual: order.total, abertaEm: t.abertaEm || order.criadoEm } : t));
    if (data.pagamentos?.length) {
      for (const payment of data.pagamentos) {
        if (!addManualPaymentToOrder(order.id, payment.formaId, payment.valor, payment.valorRecebido, payment.observacao)) throw new Error('Pagamento inválido.');
      }
      order = store.state.orders.find((o: Order) => o.id === order.id);
    }
    dispatchItems(order, items);
    return order;
  };

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status };
      }
      return o;
    }));
  }, [setOrders]);

  const cancelOrder = (orderId: string, motivo: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    if (!motivo.trim()) throw new Error('Informe o motivo do cancelamento.');
    if (order.valorTotalPago > 0) throw new Error('Estorne os pagamentos antes de cancelar.');
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelado', cancelamento: { motivo, usuario: currentUser.nome, dataHora: new Date().toISOString() } } : o));
    setTables(prev => prev.map(t => t.pedidoAtivoId === orderId ? { ...t, status: 'livre', pedidoAtivoId: undefined, valorAtual: 0, clienteNome: undefined } : t));
    dispatchItems(order, order.itens, 'CANCELAMENTO');
  };

  const cancelOrderItem = (orderId: string, itemId: string, motivo: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    const removed = order.itens.find(i => i.cartItemId === itemId);
    if (!removed) return;
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    const items = order.itens.filter(i => i.cartItemId !== itemId);
    const values = totals(items, Math.min(order.desconto, calculateSubtotal(items)), order.taxaServico, order.taxaEntrega);
    if (values.total < order.valorTotalPago) throw new Error('Estorne o valor excedente antes de remover o item.');
    const next = reconcile({ ...order, ...values, itens: items });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    dispatchItems(order, [removed], 'CANCELAMENTO DE ITEM');
  };

  const addItemsToOrder = (orderId: string, newItems: CartItem[]) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado' || !newItems.length) return;
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa.');
    const added = snapshotItems(newItems);
    const items = [...order.itens, ...added];
    const values = totals(items, order.desconto, order.taxaServico, order.taxaEntrega);
    const next = reconcile({ ...order, ...values, itens: items, status: 'em_preparacao' });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    dispatchItems(order, added, 'ADICIONAL');
  };

  const applyOrderDiscount = (orderId: string, desconto: number, motivo: string) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    const values = totals(order.itens, desconto, order.taxaServico, order.taxaEntrega);
    if (values.total < order.valorTotalPago) throw new Error('Estorne o excedente antes de aplicar desconto.');
    const next = reconcile({ ...order, ...values, descontoMotivo: motivo });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
  };

  const updateOrderItemProductionStatus = useCallback((orderId: string, cartItemId: string, status: 'pendente' | 'preparando' | 'pronto') => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedItens = o.itens.map(it => it.cartItemId === cartItemId ? { ...it, statusProducao: status } : it);
        const allDone = updatedItens.every(it => it.statusProducao === 'pronto');
        return {
          ...o,
          itens: updatedItens,
          status: allDone ? 'pronto' : o.status === 'novo' ? 'em_preparacao' : o.status
        };
      }
      return o;
    }));
  }, [setOrders]);

  const setOrderPriority = useCallback((orderId: string, prioridade: 'normal' | 'urgente') => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, prioridade } : o));
  }, [setOrders]);

  const reopenOrder = (id: string, motivo: string) => {
    const order = store.state.orders.find((o: Order) => o.id === id) as Order | undefined;
    if (!order) return;
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    setOrders(prev => prev.map(o => o.id === id ? { ...reconcile(o), status: 'confirmado', cancelamento: undefined } : o));
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
    if (!order || order.status === 'cancelado' || !order.saldoRestante) return;
    throw new Error('Selecione a forma e registre o pagamento. Para cortesia, aplique desconto com motivo.');
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
        return {
          ...t,
          status: 'ocupada',
          clienteNome: customerName || 'Cliente Salão',
          garcomResponsavel: currentUser.nome,
          abertaEm: new Date().toISOString(),
          pessoasSentadas: pessoas,
          valorAtual: 0
        };
      }
      return t;
    }));
  }, [setTables, currentUser]);

  const addItemsToTable = (number: number, items: CartItem[]) => {
    const table = store.state.tables.find((t: Table) => t.numero === number) as Table | undefined;
    if (!table || !items.length) return;
    if (table.pedidoAtivoId) addItemsToOrder(table.pedidoAtivoId, items);
    else createOrder({ tipo: 'mesa', mesaNumero: number, nomeCliente: table.clienteNome, itens: items });
  };

  const requestTableBill = useCallback((tableNumber: number) => {
    setTables(prev => prev.map(t => t.numero === tableNumber ? { ...t, status: 'conta' } : t));
  }, [setTables]);

  const settleTableAccount = useCallback((tableNumber: number) => {
    setTables(prev => prev.map(t => {
      if (t.numero === tableNumber) {
        return {
          ...t,
          status: 'livre',
          pedidoAtivoId: undefined,
          clienteNome: undefined,
          abertaEm: undefined,
          valorAtual: 0,
          pessoasSentadas: undefined
        };
      }
      return t;
    }));
  }, [setTables]);

  const freeTableManually = useCallback((tableNumber: number) => {
    setTables(prev => prev.map(t => {
      if (t.numero === tableNumber) {
        return {
          ...t,
          status: 'livre',
          pedidoAtivoId: undefined,
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
    if (origin.pedidoAtivoId) {
      setOrders(prev => prev.map(o => o.id === origin.pedidoAtivoId ? { ...o, mesaNumero: toTable } : o));
    }
  }, [tables, setTables, setOrders]);

  const joinTables = useCallback((sourceTable: number, targetTable: number) => {
    const src = store.state.tables.find(t => t.numero === sourceTable);
    const tgt = store.state.tables.find(t => t.numero === targetTable);
    if (!src || !tgt) return;

    const combinedValue = src.valorAtual + tgt.valorAtual;
    setTables(prev => prev.map(t => {
      if (t.numero === targetTable) {
        return { ...t, valorAtual: combinedValue, clienteNome: `${tgt.clienteNome || ''} + ${src.clienteNome || ''}` };
      }
      if (t.numero === sourceTable) {
        return { ...t, status: 'livre', valorAtual: 0, clienteNome: undefined, pedidoAtivoId: undefined };
      }
      return t;
    }));
  }, [tables, setTables]);

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

  // Comandas
  const createComanda = useCallback((numero: number, clienteNome?: string, mesaNumero?: number, limite?: number) => {
    const newCmd: Comanda = {
      id: uid('cmd'),
      numero,
      clienteNome,
      mesaNumero,
      limiteConsumo: limite || 200.00,
      abertaEm: new Date().toISOString(),
      status: 'aberta',
      garcomNome: currentUser.nome,
      pagamentoStatus: 'pendente',
      total: 0,
      itens: []
    };
    setComandas(prev => [newCmd, ...prev]);
  }, [setComandas, currentUser]);

  const addItemsToComanda = useCallback((comandaId: string, items: CartItem[]) => {
    setComandas(prev => prev.map(c => {
      if (c.id === comandaId) {
        const updatedItens = [...c.itens, ...items];
        const newTotal = updatedItens.reduce((acc, it) => acc + it.precoUnitario * it.quantidade, 0);
        return {
          ...c,
          itens: updatedItens,
          total: newTotal
        };
      }
      return c;
    }));
  }, [setComandas]);

  const transferComandaItems = useCallback((fromComandaId: string, toComandaId: string, itemIds: string[]) => {
    const fromCmd = store.state.comandas.find(c => c.id === fromComandaId);
    if (!fromCmd) return;
    const itemsToMove = fromCmd.itens.filter(i => itemIds.includes(i.cartItemId));

    setComandas(prev => prev.map(c => {
      if (c.id === fromComandaId) {
        const remaining = c.itens.filter(i => !itemIds.includes(i.cartItemId));
        const total = remaining.reduce((acc, it) => acc + it.precoUnitario * it.quantidade, 0);
        return { ...c, itens: remaining, total };
      }
      if (c.id === toComandaId) {
        const combined = [...c.itens, ...itemsToMove];
        const total = combined.reduce((acc, it) => acc + it.precoUnitario * it.quantidade, 0);
        return { ...c, itens: combined, total };
      }
      return c;
    }));
  }, [comandas, setComandas]);

  const closeComanda = useCallback((comandaId: string) => {
    setComandas(prev => prev.map(c => {
      if (c.id === comandaId) {
        return { ...c, status: 'fechada', fechadaEm: new Date().toISOString() };
      }
      return c;
    }));
  }, [setComandas]);

  // Cash Register
  const openCashRegister = (initialAmount: number) => {
    if (store.state.cashRegister.aberto) return;
    const initial = amount(initialAmount, 'Fundo inicial');
    const previous = store.state.cashRegister as CashRegister;
    if (previous.fechadoEm) store.set('cashHistory', [...(store.state.cashHistory || []), previous]);
    setCashRegister({ id: uid('cash'), aberto: true, operadorAbertura: currentUser.nome, abertoEm: new Date().toISOString(), saldoInicial: initial, saldoAtualGaveta: initial, transacoes: [] });
  };

  const closeCashRegister = useCallback((blindCloseData?: CashRegister['fechamentoCego']) => {
    if (!store.state.cashRegister.aberto) return;
    if (!['Administrador', 'Gerente', 'Gerente Geral', 'Caixa', 'Operador de Caixa'].includes(currentUser.cargo)) throw new Error('Sem permissão para fechar caixa.');
    if (blindCloseData) { amount(blindCloseData.dinheiroInformado); amount(blindCloseData.pixInformado); amount(blindCloseData.cartaoInformado); amount(blindCloseData.outrosInformado); }
    setCashRegister(prev => ({
      ...prev,
      aberto: false,
      fechadoEm: new Date().toISOString(),
      fechamentoCego: blindCloseData
    }));
  }, [setCashRegister, currentUser]);

  const addCashMovement = (tipo: 'suprimento' | 'sangria' | 'entrada_manual' | 'saida_manual', valor: number, motivo: string) => {
    if (!store.state.cashRegister.aberto) throw new Error('Caixa fechado.');
    valor = amount(valor, 'Movimentação', false);
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    const incoming = tipo === 'suprimento' || tipo === 'entrada_manual';
    if (!incoming && valor > store.state.cashRegister.saldoAtualGaveta) throw new Error('Saldo insuficiente na gaveta.');
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta + (incoming ? valor : -valor)), transacoes: [{ id: uid('tx'), tipo, valor, motivo, horario: new Date().toISOString(), operador: currentUser.nome }, ...prev.transacoes] }));
  };

  // Delivery & Couriers
  const assignCourierToOrder = useCallback((orderId: string, courierName: string) => {
    const order = store.state.orders.find(o => o.id === orderId);
    const courier = store.state.couriers.find(c => c.nome === courierName);
    if (!order || !courier) return;
    if (courier.status !== 'disponivel' && courier.nome !== order.entregadorNome) return;

    setOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, entregadorNome: courierName, status: 'saiu_entrega' }
      : o
    ));
    setCouriers(prev => prev.map(c => c.nome === courierName ? { ...c, status: 'em_rota' } : c));
  }, [orders, couriers, setOrders, setCouriers]);

  const completeDeliveryOrder = useCallback((orderId: string) => {
    const order = store.state.orders.find(o => o.id === orderId);
    if (!order || order.status !== 'saiu_entrega') return;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'entregue' } : o));
    if (order.entregadorNome) {
      setCouriers(prev => prev.map(c => c.nome === order.entregadorNome
        ? { ...c, status: 'disponivel', entregasHoje: c.entregasHoje + 1 }
        : c
      ));
    }
  }, [orders, setOrders, setCouriers]);

  const updateCourierStatus = useCallback((courierId: string, status: Courier['status']) => {
    setCouriers(prev => prev.map(c => c.id === courierId ? { ...c, status } : c));
  }, [setCouriers]);

  // Printers
  const triggerTestPrint = useCallback((printerId: string) => {
    const prn = store.state.printers.find(p => p.id === printerId);
    if (!prn) return;
    const job: PrintJob = {
      id: uid('job-test'),
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
    setPrintQueue(prev => prev.map(j => {
      if (j.id === jobId) {
        return { ...j, status: 'sucesso', tentativas: j.tentativas + 1, dataHora: new Date().toLocaleTimeString('pt-BR') };
      }
      return j;
    }));
    if (soundEnabled) sounds.print();
  }, [soundEnabled, setPrintQueue]);

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
    setPrinters(prev => {
      const exists = prev.some(p => p.id === printer.id);
      if (exists) return prev.map(p => p.id === printer.id ? printer : p);
      return [...prev, printer];
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
        currentUser,

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
        cancelOrder,
        cancelOrderItem,
        addItemsToOrder,
        applyOrderDiscount,
        updateOrderItemProductionStatus,
        setOrderPriority,
        reopenOrder,
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

        comandas,
        createComanda,
        addItemsToComanda,
        transferComandaItems,
        closeComanda,

        cashRegister,
        openCashRegister,
        closeCashRegister,
        addCashMovement,

        couriers,
        assignCourierToOrder,
        completeDeliveryOrder,
        updateCourierStatus,

        printers,
        routingRules,
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