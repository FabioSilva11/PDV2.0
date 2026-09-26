/**
 * Migração e regras puras de CONTA (CHECK) x LANÇAMENTO x MESA.
 *
 * Este módulo NÃO toca em estado global: recebe pedidos/mesas/contas e devolve
 * a estrutura normalizada. Isso torna a migração determinística, testável e
 * idempotente — executá-la N vezes produz exatamente o mesmo resultado.
 *
 * Mapeamento legado -> novo (sem apagar dado histórico):
 *   mesaSessaoId       -> contaId
 *   mesaSessaoNumero    -> contaNumero
 *   mesaPedidoSequencia -> sequencia
 *   codigoMesa          -> codigoExibicao
 *   table.sessaoAtivaId -> table.contaAtualId
 */

import type { Account, AccountStatus, AccountSearchFilters, Order, Table } from '../types';
import { money, normalizeSearch } from '../utils/business';

/** Primeiro número de conta do sistema. A regra comercial deste projeto usa 0. */
export const FIRST_ACCOUNT_NUMBER = 0;

/** Primeiro lançamento de uma conta: 1 (0.1, 0.2, 0.3...). */
export const FIRST_ORDER_SEQUENCE = 1;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const timeOf = (value?: string): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** `0.1` — número da conta + sequência do lançamento (legado, mantido para migração). */
export const buildDisplayCode = (contaNumero: number, sequencia: number): string =>
  `${contaNumero}.${sequencia}`;

/**
 * Gera o código de exibição a partir da SEQUÊNCIA GLOBAL.
 * Fórmula: parteInteira = floor(N / 10), parteDecimal = N % 10.
 * Exemplos: N=1 → 0.1, N=9 → 0.9, N=10 → 1.0, N=11 → 1.1, N=20 → 2.0
 */
export const buildLaunchDisplayCode = (sequenciaGlobal: number): string => {
  const parteInteira = Math.floor(sequenciaGlobal / 10);
  const parteDecimal = sequenciaGlobal % 10;
  return `${parteInteira}.${parteDecimal}`;
};

/**
 * Próxima sequência GLOBAL de lançamento: max(sequenciaGlobal) + 1.
 * Independente da conta — sequência única para todo o sistema.
 */
export const nextGlobalLaunchSequence = (orders: Order[]): number => {
  const sequences = orders
    .map(o => Number(o.sequenciaGlobal))
    .filter(isFiniteNumber);
  if (!sequences.length) return FIRST_ORDER_SEQUENCE;
  return Math.max(...sequences) + 1;
};

/**
 * Próximo número de conta. A sequência é global e nunca reutilizada, mesmo
 * quando todas as contas antigas já foram encerradas.
 */
export const nextAccountNumber = (accounts: Account[]): number => {
  const numbers = accounts
    .map(a => Number(a.numero))
    .filter(isFiniteNumber);
  if (!numbers.length) return FIRST_ACCOUNT_NUMBER;
  return Math.max(...numbers) + 1;
};

/**
 * Próxima sequência de lançamento de uma conta: `max(sequencia) + 1`.
 * Nunca reinicia em 1 por causa de mesa liberada — apenas quando a conta
 * realmente não tem lançamentos.
 */
export const nextOrderSequence = (orders: Order[], contaId: string): number => {
  const sequences = orders
    .filter(o => o.contaId === contaId)
    .map(o => Number(o.sequencia))
    .filter(isFiniteNumber);
  if (!sequences.length) return FIRST_ORDER_SEQUENCE;
  return Math.max(...sequences) + 1;
};

/** Soma dos lançamentos válidos (cancelled não entra). */
export const computeAccountTotals = (orders: Order[], contaId: string) => {
  const own = orders.filter(o => o.contaId === contaId && o.status !== 'cancelado');
  const total = money(own.reduce((sum, o) => sum + (Number(o.total) || 0), 0));
  const valorPago = money(own.reduce((sum, o) => sum + (Number(o.valorTotalPago) || 0), 0));
  const saldoRestante = money(own.reduce((sum, o) => sum + (Number(o.saldoRestante) || 0), 0));
  return { total, valorPago, saldoRestante };
};

/**
 * `paga` só é alcançada por pagamento (saldo zerado). `encerrada` é uma etapa
 * posterior e explícita. Nunca derivar status de conta da mesa.
 */
export const deriveAccountStatus = (
  current: AccountStatus,
  saldoRestante: number,
  total: number
): AccountStatus => {
  if (current === 'encerrada') return 'encerrada';
  if (money(saldoRestante) <= 0 && money(total) > 0) return 'paga';
  if (current === 'paga' && money(saldoRestante) > 0) return 'aberta';
  return current;
};

/** Lançamentos da conta em ordem de sequência. */
export const accountOrders = (orders: Order[], contaId: string): Order[] =>
  orders
    .filter(o => o.contaId === contaId)
    .sort((a, b) => (Number(a.sequencia) || 0) - (Number(b.sequencia) || 0));

/** Lançamentos que ainda aguardam espelho (preparo operacional). */
export const ordersAwaitingMirror = (orders: Order[], contaId: string): Order[] =>
  accountOrders(orders, contaId).filter(o => o.status === 'novo');

/**
 * Verdadeiro quando o espelho daquele lançamento é o ÚLTIMO lançamento
 * operacional da conta — é exatamente este o caso que libera a mesa.
 * "Pronto" = preparo concluído; "entregue"/"finalizado" já saíram do preparo.
 */
export const isLastOperationalOrder = (orders: Order[], contaId: string, orderId: string): boolean => {
  const pending = ordersAwaitingMirror(orders, contaId);
  if (!pending.length) return true;
  return pending.every(o => o.id === orderId);
};

/** Contas abertas (aceitam novos lançamentos). */
export const isAccountOpen = (account: Account | undefined): account is Account =>
  !!account && account.status === 'aberta';

/**
 * Conta que pode receber um novo LANÇAMENTO.
 * `encerrada` e `paga` ficam fora: a conta quitada tem saldo zerado e a
 * encerrada é histórico.
 */
export const canAcceptNewOrder = (account: Account | undefined): account is Account =>
  isAccountOpen(account);

/**
 * Contas abertas ligadas a uma mesa, da mais para a menos relevante.
 *
 * Relevância = ocupa a mesa agora (mesaAtual) > historicamente ligada
 * (mesaOriginal) > maior número. A ordem serve para EXIBIÇÃO; nunca para
 * escolher sozinho quando há mais de uma (ver `resolveTableAccount`).
 */
export const openAccountsForTable = (accounts: Account[], tableNumber?: number): Account[] => {
  if (tableNumber === undefined) return [];
  return accounts
    .filter(a => canAcceptNewOrder(a) && (a.mesaAtualNumero === tableNumber || a.mesaOriginalNumero === tableNumber))
    .sort((a, b) => {
      const aAtual = a.mesaAtualNumero === tableNumber ? 1 : 0;
      const bAtual = b.mesaAtualNumero === tableNumber ? 1 : 0;
      if (aAtual !== bAtual) return bAtual - aAtual;
      return b.numero - a.numero;
    });
};

/** Resultado da escolha CENTRAL da conta de um lançamento de mesa. */
export type TableAccountResolution =
  /** Há uma conta válida e inequívoca: continuar nela. */
  | { kind: 'conta'; account: Account }
  /** Mais de uma conta aberta: o operador TEM de escolher (nunca por sorteio). */
  | { kind: 'ambigua'; accounts: Account[]; tableNumber: number }
  /** Nenhuma conta aberta: abrir novo atendimento. */
  | { kind: 'nova'; tableNumber?: number };

/**
 * HIERARQUIA ÚNICA de escolha da conta (regra definitiva):
 *   1. conta explicitamente escolhida pelo operador (tratado antes, no chamador);
 *   2. havendo MAIS DE UMA conta aberta ligada à mesa, NADA é escolhido
 *      automaticamente: o operador TEM de escolher;
 *   3. conta atualmente associada à mesa (`contaAtualId`);
 *   4. conta ABERTA ligada àquela mesa (inclusive liberada pelo espelho, via
 *      `mesaOriginalNumero`) — escolhida sozinha apenas se for ÚNICA;
 *   5. somente então: nova conta.
 *
 * A ambiguidade vem ANTES da conta atual de propósito: ocupar a mesa não dá
 * direito preferencial silencioso quando existe outro atendimento aberto no
 * mesmo histórico de mesa.
 *
 * `table.status` NUNCA decide: uma mesa pode estar `livre` e ainda assim ter
 * conta aberta com saldo.
 */
export const resolveTableAccount = (accounts: Account[], table: Table | undefined): TableAccountResolution => {
  if (!table) return { kind: 'nova' };
  const related = openAccountsForTable(accounts, table.numero);
  const current = table.contaAtualId ? accounts.find(a => a.id === table.contaAtualId) : undefined;
  if (related.length > 1) return { kind: 'ambigua', accounts: related, tableNumber: table.numero };
  if (canAcceptNewOrder(current)) return { kind: 'conta', account: current };
  if (related.length === 1) return { kind: 'conta', account: related[0] };
  return { kind: 'nova', tableNumber: table.numero };
};

export const accountStatusLabel: Record<AccountStatus, string> = {
  aberta: 'Aberta',
  paga: 'Paga',
  encerrada: 'Encerrada'
};

export const orderStatusLabel: Record<string, string> = {
  novo: 'Aguardando espelho',
  pronto: 'Pronto',
  entregue: 'Entregue',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado'
};

export const paymentStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  pago_parcial: 'Parcial',
  pago: 'Pago',
  estornado: 'Estornado'
};

/** Texto exibido do lançamento: `0.2` quando existe, senão `#numero`. */
export const orderDisplayCode = (order: Order): string =>
  order.codigoExibicao || order.codigoMesa || (order.contaNumero !== undefined && order.sequencia !== undefined
    ? buildDisplayCode(order.contaNumero, order.sequencia)
    : `#${order.numero}`);

/** Textos searched na Central: número do pedido, da conta, mesa e cliente. */
export const orderSearchText = (order: Order): string =>
  normalizeSearch([
    orderDisplayCode(order),
    `#${order.numero}`,
    order.contaNumero !== undefined ? `conta ${order.contaNumero}` : '',
    order.mesaNumero !== undefined ? `mesa ${order.mesaNumero}` : '',
    order.nomeCliente || '',
    ...order.itens.map(i => i.nome)
  ].filter(Boolean).join(' '));

interface MigrationResult {
  accounts: Account[];
  orders: Order[];
}

/**
 * Agrupa os pedidos em contas. Determinístico:
 *  - pedido de MESA  -> uma conta por mesaSessaoId (a "conta" do atendimento);
 *  - pedido de BALCÃO/DELIVERY -> uma conta por pedido (cada venda é um check).
 */
export const groupOrdersIntoAccounts = (orders: Order[]): { orders: Order[]; groups: { key: string; orders: Order[] }[] } => {
  const sorted = [...orders].sort((a, b) => timeOf(a.criadoEm) - timeOf(b.criadoEm) || a.numero - b.numero);
  const groups = new Map<string, Order[]>();
  for (const order of sorted) {
    const key = order.tipo === 'mesa' && order.mesaSessaoId
      ? `sess:${order.mesaSessaoId}`
      : `ord:${order.id}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(order);
    else groups.set(key, [order]);
  }
  return {
    orders: sorted,
    groups: Array.from(groups.entries()).map(([key, list]) => ({ key, orders: list }))
  };
};

/** Número de conta estável para um grupo migrado (mantém contagem legada). */
const legacyAccountId = (key: string, order: Order): string =>
  key.startsWith('sess:') ? key.slice(5) : `acc-ord-${order.id}`;

/**
 * Normaliza pedidos + mesas em contas. Idempotente: rodar duas vezes com a
 * mesma entrada devolve exatamente a mesma saída.
 */
export const migrateOrdersToAccounts = (
  rawOrders: Order[],
  rawTables: Table[] = [],
  rawAccounts: Account[] = []
): MigrationResult => {
  const { groups } = groupOrdersIntoAccounts(rawOrders.filter(Boolean));

  // Contas já existentes (modelo novo) são preservadas e apenas completadas.
  const byId = new Map<string, Account>();
  for (const account of rawAccounts.filter(Boolean)) byId.set(account.id, { ...account });

  const usedNumbers = new Set<number>();
  for (const account of byId.values()) {
    if (isFiniteNumber(account.numero)) usedNumbers.add(account.numero);
  }

  // Números legados preservados primeiro (determinismo: menor grupo primeiro).
  const pendingGroups = groups.filter(g => !byId.has(legacyAccountId(g.key, g.orders[0])));
  pendingGroups.sort((a, b) => {
    const an = a.orders[0];
    const bn = b.orders[0];
    const legacy = (Number(an.mesaSessaoNumero) || 0) - (Number(bn.mesaSessaoNumero) || 0);
    if (legacy !== 0) return legacy;
    return timeOf(an.criadoEm) - timeOf(bn.criadoEm) || an.numero - bn.numero;
  });

  const allocated: Account[] = [];
  let fallbackNumber = FIRST_ACCOUNT_NUMBER;
  const takeNumber = (preferred?: number): number => {
    if (isFiniteNumber(preferred) && preferred >= 0 && !usedNumbers.has(preferred)) {
      usedNumbers.add(preferred);
      return preferred;
    }
    while (usedNumbers.has(fallbackNumber)) fallbackNumber += 1;
    usedNumbers.add(fallbackNumber);
    return fallbackNumber;
  };

  for (const group of pendingGroups) {
    const first = group.orders[0];
    const id = legacyAccountId(group.key, first);
    const numero = takeNumber(first.tipo === 'mesa' ? Number(first.mesaSessaoNumero) : undefined);
    const originTable = first.tipo === 'mesa' && first.mesaNumero !== undefined
      ? rawTables.find(t => t.numero === first.mesaNumero)
      : undefined;
    allocated.push({
      id,
      numero,
      tipo: first.tipo,
      nomeCliente: first.nomeCliente,
      telefoneCliente: first.telefoneCliente,
      mesaOriginalId: originTable?.id,
      mesaOriginalNumero: first.mesaNumero,
      // A conta migrada nasce ocupando a mesa de origem; a reconciliação
      // decide se ela ainda ocupa (conta aberta) ou só consta no histórico.
      mesaAtualId: originTable?.id,
      mesaAtualNumero: first.mesaNumero,
      status: 'aberta',
      abertaEm: first.criadoEm,
      total: 0,
      valorPago: 0,
      saldoRestante: 0,
      origem: first.tipo === 'mesa' ? 'mesa' : first.tipo === 'delivery' ? 'delivery' : 'balcao',
      criadaPor: 'migração',
      mesaSessaoId: first.tipo === 'mesa' ? id : undefined,
      mesaSessaoNumero: first.tipo === 'mesa' ? numero : undefined
    });
  }

  const allAccounts = Array.from(byId.values()).concat(allocated);
  const orders = attachAccountsToOrders(rawOrders, allAccounts);
  const accounts = recalculateAccounts(allAccounts, orders);
  return { accounts, orders };
};

/**
 * Preenche `contaId`, `contaNumero`, `sequencia`, `sequenciaGlobal` e `codigoExibicao` de cada
 * pedido, mantendo espelhados os campos legados.
 */
export const attachAccountsToOrders = (rawOrders: Order[], accounts: Account[]): Order[] => {
  const accountById = new Map(accounts.map(a => [a.id, a]));
  const { groups } = groupOrdersIntoAccounts(rawOrders.filter(Boolean));

  const byId = new Map<string, Order>();
  for (const order of groups.flatMap(g => g.orders)) byId.set(order.id, order);

  // Para backfill de sequenciaGlobal: ordenar todos os pedidos por data de criação
  // e atribuir números globais sequenciais.
  const allOrdersSorted = groups
    .flatMap(g => g.orders)
    .sort((a, b) => timeOf(a.criadoEm) - timeOf(b.criadoEm) || a.numero - b.numero);
  const globalSeqMap = new Map<string, number>();
  allOrdersSorted.forEach((order, index) => {
    globalSeqMap.set(order.id, index + FIRST_ORDER_SEQUENCE);
  });

  return groups.flatMap(group => {
    const first = group.orders[0];
    const account = accountById.get(legacyAccountId(group.key, first));
    if (!account) return group.orders;
    const legacySequences = group.orders.map(o => Number(o.mesaPedidoSequencia));
    const hasLegacySequences = legacySequences.every(isFiniteNumber)
      && new Set(legacySequences).size === legacySequences.length;
    return group.orders.map((order, index) => {
      const sequencia = hasLegacySequences ? legacySequences[index] : index + FIRST_ORDER_SEQUENCE;
      const sequenciaGlobal = globalSeqMap.get(order.id) ?? (index + FIRST_ORDER_SEQUENCE);
      return {
        ...order,
        contaId: account.id,
        contaNumero: account.numero,
        sequencia,
        sequenciaGlobal,
        codigoExibicao: buildLaunchDisplayCode(sequenciaGlobal),
        // espelho legado (modo de compatibilidade)
        mesaSessaoId: order.tipo === 'mesa' ? account.id : order.mesaSessaoId,
        mesaSessaoNumero: order.tipo === 'mesa' ? account.numero : order.mesaSessaoNumero,
        mesaPedidoSequencia: sequencia,
        codigoMesa: buildDisplayCode(account.numero, sequencia),
        mesaOriginalNumero: order.mesaOriginalNumero ?? order.mesaNumero
      };
    });
  });
};

/** Recalcula total/pago/saldo/status de cada conta a partir dos lançamentos. */
export const recalculateAccounts = (accounts: Account[], orders: Order[]): Account[] =>
  accounts.map(account => {
    const { total, valorPago, saldoRestante } = computeAccountTotals(orders, account.id);
    return {
      ...account,
      total,
      valorPago,
      saldoRestante,
      status: deriveAccountStatus(account.status, saldoRestante, total)
    };
  });

/**
 * Reconstroi a ocupação atual das mesas a partir das contas.
 *
 * Idempotente e NÃO destrutiva: uma mesa que já está livre com conta em
 * aberto (situação criada pelo espelho do último lançamento) continua livre —
 * apenas o histórico `ultimaConta*` é mantido. Reocupar a mesa aqui
 * reverteria a regra do espelho a cada recarga.
 */
export const reconcileTableOccupancy = (tables: Table[], accounts: Account[], orders: Order[]): Table[] => {
  const accountById = new Map(accounts.map(a => [a.id, a]));
  return tables.map(table => {
    // Toda conta que já passou pela mesa serve para o histórico.
    const touched = accounts
      .filter(a => a.mesaOriginalNumero === table.numero || a.mesaAtualNumero === table.numero)
      .sort((a, b) => Number(b.numero) - Number(a.numero));
    const lastAccount = touched[0];

    // Ocupação atual: a conta registrada na mesa (nova ou legada) precisa
    // continuar aberta para ocupar. Uma conta paga/encerrada libera a mesa.
    const currentRef = table.contaAtualId || table.sessaoAtivaId;
    const current = currentRef ? accountById.get(currentRef) : undefined;
    const occupies = !!current && current.status === 'aberta';

    if (!occupies) {
      const pending = table.status === 'reservada' || table.status === 'fechando';
      return {
        ...table,
        ...(pending ? {} : {
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
        }),
        ultimaContaId: lastAccount?.id,
        ultimaContaNumero: lastAccount?.numero
      };
    }
    const open = current as Account;
    const own = accountOrders(orders, open.id).filter(o => o.status !== 'cancelado');
    return {
      ...table,
      status: (table.status === 'conta' || table.status === 'fechando') ? table.status : 'ocupada',
      contaAtualId: open.id,
      contaAtualNumero: open.numero,
      sessaoAtivaId: open.id,
      sessaoNumero: open.numero,
      pedidoAtivoId: own[own.length - 1]?.id,
      clienteNome: open.nomeCliente || table.clienteNome,
      abertaEm: table.abertaEm || open.abertaEm,
      valorAtual: money(open.saldoRestante),
      ultimaContaId: (lastAccount?.id === open.id) ? open.id : lastAccount?.id,
      ultimaContaNumero: (lastAccount?.id === open.id) ? open.numero : lastAccount?.numero
    };
  });
};

/** Busca de contas/checks: número, lançamento, mesa, cliente, valor e status. */
export const searchAccounts = (
  accounts: Account[],
  orders: Order[],
  filters: AccountSearchFilters
): Account[] => {
  const text = filters.texto ? normalizeSearch(filters.texto.trim()) : '';
  const hasSequence = isFiniteNumber(filters.sequencia);
  return accounts
    .filter(account => {
      if (filters.status && filters.status !== 'todas' && account.status !== filters.status) return false;
      if (isFiniteNumber(filters.contaNumero) && account.numero !== filters.contaNumero) return false;
      if (isFiniteNumber(filters.mesaNumero)) {
        const onTable = account.mesaAtualNumero === filters.mesaNumero || account.mesaOriginalNumero === filters.mesaNumero;
        if (!onTable) return false;
      }
      if (filters.somenteComSaldo && account.saldoRestante <= 0) return false;
      if (isFiniteNumber(filters.valorMin) && account.saldoRestante < filters.valorMin) return false;
      if (isFiniteNumber(filters.valorMax) && account.saldoRestante > filters.valorMax) return false;
      if (text) {
        const own = accountOrders(orders, account.id);
        const haystack = normalizeSearch([
          `${account.numero}`,
          `conta ${account.numero}`,
          account.nomeCliente || '',
          account.mesaAtualNumero !== undefined ? `mesa ${account.mesaAtualNumero}` : '',
          account.mesaOriginalNumero !== undefined ? `mesa ${account.mesaOriginalNumero}` : '',
          accountStatusLabel[account.status],
          ...own.map(o => orderDisplayCode(o))
        ].join(' '));
        if (!haystack.includes(text)) return false;
      }
      if (hasSequence && !accountOrders(orders, account.id).some(o => o.sequencia === filters.sequencia)) return false;
      return true;
    })
    .sort((a, b) => b.numero - a.numero);
};
