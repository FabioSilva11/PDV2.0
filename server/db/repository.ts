import type { DatabaseSync } from 'node:sqlite';
import { getDb, setMeta, transaction, getBootstrapStatus } from './sqlite';

type Row = Record<string, any>;

const json = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
};

const parse = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    const parsed = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const text = (value: unknown): string | null => (value === null || value === undefined || value === '' ? null : String(value));

const int = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Math.trunc(num(value)));

const bool = (value: unknown): number => (value ? 1 : 0);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * Reconstrói a entidade a partir das colunas estruturadas. O `raw_data` guarda o
 * documento completo; as colunas ensure que consultas, validações e migrações
 * não dependam de deserializar JSON.
 */
const hydrate = <T extends Row>(row: Row, fallback: T): T => {
  const raw = parse<Partial<T> | null>(row.raw_data, null);
  return { ...(raw ?? {}), ...fallback } as T;
};

/* ------------------------------------------------------------------ */
/* Gravação                                                            */
/* ------------------------------------------------------------------ */

const upsert = (db: DatabaseSync, table: string, id: string, columns: Row): void => {
  const keys = Object.keys(columns);
  const placeholders = keys.map(() => '?').join(', ');
  const quoted = keys.map(key => `"${key}"`).join(', ');
  db.prepare(
    `INSERT INTO ${table} (${keys.map(key => `"${key}"`).join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${keys.filter(key => key !== 'id').map(key => `"${key}" = excluded."${key}"`).join(', ')}`
  ).run(...keys.map(key => columns[key] as any));
};

/** Remove as linhas da tabela que não existem mais no snapshot enviado. */
const prune = (db: DatabaseSync, table: string, keepIds: string[]): void => {
  if (keepIds.length === 0) {
    db.prepare(`DELETE FROM ${table}`).run();
    return;
  }
  const placeholders = keepIds.map(() => '?').join(', ');
  db.prepare(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`).run(...keepIds);
};

/**
 * Grava o snapshot assumindo uma transação JÁ ABERTA.
 * A migração precisa validar antes do COMMIT para poder reverter tudo se algo
 * divergir, por isso a escrita ficou separada de `saveSnapshot`.
 */
const writeSnapshot = (db: DatabaseSync, snapshot: Row): void => {
  {
    /* Settings ------------------------------------------------------- */
    const settings = snapshot.settings;
    if (settings) {
      upsert(db, 'restaurant_settings', String(settings.id ?? 'singleton'), {
        id: String(settings.id ?? 'singleton'),
        nome_fantasia: text(settings.nomeFantasia),
        razao_social: text(settings.razaoSocial),
        nome_curto: text(settings.nomeCurto),
        cnpj: text(settings.cnpj),
        telefone: text(settings.telefone),
        cidade: text(settings.cidade),
        estado: text(settings.estado),
        setup_complete: bool(settings.setupComplete),
        raw_data: json(settings)
      });
    }

    /* Usuários ------------------------------------------------------- */
    const users = asArray<Row>(snapshot.users);
    for (const user of users) {
      if (!user?.id) continue;
      upsert(db, 'users', String(user.id), {
        id: String(user.id),
        nome: String(user.nome ?? ''),
        usuario: text(user.usuario),
        senha_hash: text(user.senhaHash),
        cargo: text(user.cargo),
        perfil: text(user.perfil),
        ativo: user.ativo === false ? 0 : 1,
        is_primary_admin: bool(user.isPrimaryAdmin),
        permissoes: json(user.permissoes),
        raw_data: json(user)
      });
    }
    prune(db, 'users', users.map(u => String(u.id)));

    /* Cardápio e categorias ------------------------------------------ */
    const menu = asArray<Row>(snapshot.menu);
    for (const item of menu) {
      if (!item?.id) continue;
      upsert(db, 'menu_items', String(item.id), {
        id: String(item.id),
        nome: String(item.nome ?? ''),
        categoria: text(item.categoria),
        catalogos: json(Array.isArray(item.catalogos) ? item.catalogos : [item.catalogo ?? 'restaurante']) ?? '["restaurante"]',
        preco: num(item.preco),
        descricao: text(item.descricao),
        disponivel: item.disponivel === false ? 0 : 1,
        raw_data: json(item)
      });
    }
    prune(db, 'menu_items', menu.map(i => String(i.id)));

    const categories = asArray<Row>(snapshot.menuCategories);
    for (const category of categories) {
      if (!category?.id) continue;
      upsert(db, 'menu_categories', String(category.id), {
        id: String(category.id),
        nome: String(category.nome ?? ''),
        catalogos: json(category.catalogos),
        ordem: num(category.ordem ?? category.posicao),
        ativo: category.ativo === false ? 0 : 1,
        raw_data: json(category)
      });
    }
    prune(db, 'menu_categories', categories.map(c => String(c.id)));

    /* Contas ---------------------------------------------------------- */
    const accounts = asArray<Row>(snapshot.accounts);
    for (const account of accounts) {
      if (!account?.id) continue;
      upsert(db, 'accounts', String(account.id), {
        id: String(account.id),
        numero: num(account.numero),
        tipo: String(account.tipo ?? 'balcao'),
        status: String(account.status ?? 'aberta'),
        origem: String(account.origem ?? 'balcao'),
        nome_cliente: text(account.nomeCliente),
        telefone_cliente: text(account.telefoneCliente),
        mesa_original_id: text(account.mesaOriginalId),
        mesa_original_numero: int(account.mesaOriginalNumero),
        mesa_atual_id: text(account.mesaAtualId),
        mesa_atual_numero: int(account.mesaAtualNumero),
        conta_pai_id: text(account.contaPaiId),
        conta_filha_id: text(account.contaFilhaId),
        total: num(account.total),
        valor_pago: num(account.valorPago),
        saldo_restante: num(account.saldoRestante),
        aberta_em: text(account.abertaEm),
        paga_em: text(account.pagaEm),
        encerrada_em: text(account.encerradaEm),
        criada_por: text(account.criadaPor),
        raw_data: json(account)
      });
    }
    prune(db, 'accounts', accounts.map(a => String(a.id)));

    /* Pedidos e itens -------------------------------------------------- */
    const orders = asArray<Row>(snapshot.orders);
    const itemIds: string[] = [];
    for (const order of orders) {
      if (!order?.id) continue;
      upsert(db, 'orders', String(order.id), {
        id: String(order.id),
        numero: num(order.numero),
        tipo: String(order.tipo ?? 'balcao'),
        status: String(order.status ?? 'novo'),
        status_pagamento: String(order.statusPagamento ?? 'pendente'),
        conta_id: text(order.contaId),
        conta_numero: int(order.contaNumero),
        sequencia: int(order.sequencia),
        sequencia_global: int(order.sequenciaGlobal),
        codigo_exibicao: text(order.codigoExibicao),
        mesa_numero: int(order.mesaNumero),
        mesa_original_numero: int(order.mesaOriginalNumero),
        codigo_mesa: text(order.codigoMesa),
        turno_id: text(order.turnoId),
        cliente_nome: text(order.nomeCliente),
        cliente_telefone: text(order.telefoneCliente),
        total: num(order.total),
        desconto: num(order.desconto),
        taxa_entrega: num(order.taxaEntrega),
        valor_total_pago: num(order.valorTotalPago),
        saldo_restante: num(order.saldoRestante),
        criado_em: text(order.criadoEm),
        raw_data: json(order)
      });

      // Itens: o vínculo menuItemId precisa continuar resolvível (§12).
      // `itens` é o campo do app; `items` aparece em dumps antigos.
      for (const item of asArray<Row>(order.itens ?? order.items)) {
        const itemId = text(item.cartItemId ?? item.id);
        if (!itemId) continue;
        itemIds.push(itemId);
        upsert(db, 'order_items', itemId, {
          id: itemId,
          order_id: String(order.id),
          menu_item_id: text(item.menuItemId),
          nome: text(item.nome ?? item.name),
          quantidade: num(item.quantidade ?? item.quantity),
          preco: num(item.precoUnitario ?? item.precoUnit ?? item.preco ?? item.price),
          raw_data: json({ ...item, orderId: order.id })
        });
      }
    }
    prune(db, 'orders', orders.map(o => String(o.id)));
    prune(db, 'order_items', itemIds);

    /* Pagamentos -------------------------------------------------------- */
    const payments: Row[] = [];
    const paymentsFromOrders: Row[] = orders.flatMap(order => asArray<Row>(order.pagamentos ?? order.payments).map(payment => ({
      ...payment,
      contaId: payment.contaId ?? order.contaId,
      contaNumero: payment.contaNumero ?? order.contaNumero,
      orderId: payment.orderId ?? order.id
    })));
    const standalonePayments = asArray<Row>(snapshot.payments);
    for (const payment of [...paymentsFromOrders, ...standalonePayments]) {
      if (!payment?.id) continue;
      if (payments.some(existing => existing.id === payment.id)) continue;
      payments.push(payment);
      upsert(db, 'payments', String(payment.id), {
        id: String(payment.id),
        conta_id: text(payment.contaId ?? payment.accountId),
        conta_numero: int(payment.contaNumero ?? payment.accountNumero),
        order_id: text(payment.orderId),
        forma_id: text(payment.formaId ?? payment.method),
        forma_nome: text(payment.formaNome),
        valor: num(payment.valor ?? payment.amount),
        valor_recebido: num(payment.valorRecebido ?? payment.amountReceived),
        troco: num(payment.troco ?? payment.change),
        estornado: bool(payment.estornado ?? payment.refunded),
        observacao: text(payment.observacao ?? payment.note),
        registrado_por: text(payment.registradoPor ?? payment.registeredBy),
        data_hora: text(payment.dataHora ?? payment.createdAt),
        raw_data: json(payment)
      });
    }
    prune(db, 'payments', payments.map(p => String(p.id)));

    /* Mesas ------------------------------------------------------------- */
    const tables = asArray<Row>(snapshot.tables);
    for (const table of tables) {
      // `numero` é obrigatório no app, mas um dump antigo pode trazê-lo
      // ausente: nesse caso o id evita descartar a mesa inteira.
      const tableId = String(table.id ?? `mesa-${table.numero}`);
      if (!table?.id && (table?.numero === undefined || table?.numero === null)) continue;
      upsert(db, 'tables', tableId, {
        id: tableId,
        numero: num(table.numero),
        status: String(table.status ?? 'livre'),
        capacidade: int(table.capacidade ?? table.lugares),
        raw_data: json(table)
      });
    }
    prune(db, 'tables', tables.map(t => String(t.id ?? `mesa-${t.numero}`)));

    /* Formas de pagamento ------------------------------------------------ */
    const paymentOptions = asArray<Row>(snapshot.paymentOptions);
    for (const option of paymentOptions) {
      if (!option?.id) continue;
      upsert(db, 'payment_options', String(option.id), {
        id: String(option.id),
        nome: String(option.nome ?? ''),
        ativo: option.ativo === false ? 0 : 1,
        ordem: num(option.ordem),
        raw_data: json(option)
      });
    }
    prune(db, 'payment_options', paymentOptions.map(o => String(o.id)));

    /* Clientes e reservas ------------------------------------------------ */
    const customers = asArray<Row>(snapshot.customers);
    for (const customer of customers) {
      if (!customer?.id) continue;
      upsert(db, 'customers', String(customer.id), {
        id: String(customer.id),
        nome: String(customer.nome ?? ''),
        telefone: text(customer.telefone),
        endereco: text(customer.endereco),
        total_comprado: num(customer.totalComprado),
        ultimo_pedido_em: text(customer.ultimoPedidoEm),
        raw_data: json(customer)
      });
    }
    prune(db, 'customers', customers.map(c => String(c.id)));

    const reservations = asArray<Row>(snapshot.reservations);
    for (const reservation of reservations) {
      if (!reservation?.id) continue;
      upsert(db, 'reservations', String(reservation.id), {
        id: String(reservation.id),
        nome: text(reservation.nomeCliente ?? reservation.nome),
        telefone: text(reservation.telefoneCliente ?? reservation.telefone),
        data_hora: text(reservation.dataHora),
        mesa_numero: int(reservation.mesaNumero),
        pessoas: int(reservation.pessoas),
        status: text(reservation.status),
        raw_data: json(reservation)
      });
    }
    prune(db, 'reservations', reservations.map(r => String(r.id)));

    /* Impressoras e fila -------------------------------------------------- */
    const printers = asArray<Row>(snapshot.printers);
    for (const printer of printers) {
      if (!printer?.id) continue;
      upsert(db, 'printers', String(printer.id), {
        id: String(printer.id),
        nome: String(printer.nome ?? ''),
        tipo: text(printer.tipo),
        ip: text(printer.ip),
        porta: int(printer.porta),
        usb_vendor_id: int(printer.usbVendorId),
        usb_product_id: int(printer.usbProductId),
        finalidade: text(printer.finalidade),
        status: text(printer.status),
        ativa: printer.ativa === false ? 0 : 1,
        prioridade: int(printer.prioridade),
        raw_data: json(printer)
      });
    }
    prune(db, 'printers', printers.map(p => String(p.id)));

    const printQueue = asArray<Row>(snapshot.printQueue);
    for (const job of printQueue) {
      if (!job?.id) continue;
      upsert(db, 'print_jobs', String(job.id), {
        id: String(job.id),
        printer_id: text(job.impressoraId),
        pedido_id: text(job.pedidoId),
        tipo: text(job.tipo),
        status: text(job.status),
        tentativas: num(job.tentativas),
        data_hora: text(job.dataHora),
        raw_data: json(job)
      });
    }
    prune(db, 'print_jobs', printQueue.map(j => String(j.id)));

    /* Auditoria ----------------------------------------------------------- */
    const auditLogs = asArray<Row>(snapshot.auditLogs);
    for (const log of auditLogs) {
      if (!log?.id) continue;
      upsert(db, 'audit_logs', String(log.id), {
        id: String(log.id),
        acao: text(log.acao),
        entidade: text(log.entidade),
        entidade_id: text(log.entidadeId),
        usuario: text(log.usuario),
        horario: text(log.horario),
        raw_data: json(log)
      });
    }
    prune(db, 'audit_logs', auditLogs.map(l => String(l.id)));

    /* Alertas -------------------------------------------------------------- */
    const alerts = asArray<Row>(snapshot.alerts);
    for (const alert of alerts) {
      if (!alert?.id) continue;
      upsert(db, 'system_alerts', String(alert.id), {
        id: String(alert.id),
        tipo: text(alert.tipo),
        resolvido: bool(alert.resolvido),
        raw_data: json(alert)
      });
    }
    prune(db, 'system_alerts', alerts.map(a => String(a.id)));

    /* Caixa: estado corrente + turnos + transações -------------------------- */
    const cash = snapshot.cashRegister;
    if (cash) {
      upsert(db, 'cash_register', String(cash.id ?? 'caixa-principal'), {
        id: String(cash.id ?? 'caixa-principal'),
        saldo_atual: num(cash.saldoAtualGaveta),
        turno_atual_id: text(cash.turnoAtual?.id),
        raw_data: json(cash)
      });

      const turnos = [
        ...(cash.turnoAtual && !Array.isArray(cash.turnoAtual) ? [cash.turnoAtual] : []),
        ...asArray<Row>(cash.turnosHistorico)
      ];
      for (const turno of turnos) {
        if (!turno?.id) continue;
        upsert(db, 'turnos_operacionais', String(turno.id), {
          id: String(turno.id),
          caixa_id: text(turno.caixaId ?? cash.id),
          status: String(turno.status ?? 'aberto'),
          operador_abertura: text(turno.operadorAbertura),
          aberto_em: text(turno.abertoEm),
          operador_fechamento: text(turno.operadorFechamento),
          fechado_em: text(turno.fechadoEm),
          saldo_inicial: num(turno.saldoInicial),
          saldo_final: turno.saldoFinal === null || turno.saldoFinal === undefined ? null : num(turno.saldoFinal),
          raw_data: json(turno)
        });
      }

      for (const tx of asArray<Row>(cash.transacoes)) {
        if (!tx?.id) continue;
        upsert(db, 'cash_transactions', String(tx.id), {
          id: String(tx.id),
          caixa_id: text(cash.id),
          turno_id: text(tx.turnoId),
          tipo: String(tx.tipo ?? 'venda_manual'),
          valor: num(tx.valor),
          motivo: text(tx.motivo),
          forma_pagamento: text(tx.formaPagamento),
          operador: text(tx.operador),
          pedido_id: text(tx.pedidoId),
          horario: text(tx.horario),
          raw_data: json(tx)
        });
      }
    }

    /* Snapshot de compatibilidade (backup, nunca fonte única) ---------------- */
    db.prepare(
      `INSERT INTO app_state (id, data, version, updated_at) VALUES ('restaurant_snapshot', ?, 1, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, version = version + 1, updated_at = excluded.updated_at`
    ).run(JSON.stringify(snapshot));

    setMeta('last_write_at', new Date().toISOString(), db);
  }
};

/** Gravação normal da aplicação: abre transação e faz COMMIT/ROLLBACK. */
export const saveSnapshot = (snapshot: Row): void => {
  transaction((db) => writeSnapshot(db, snapshot));
};

/**
 * Gravação que valida antes de confirmar. Se `validate` lançar (ou devolver
 * texto de divergência), tudo é revertido e o banco fica como estava.
 */
export const saveSnapshotValidated = (
  snapshot: Row,
  validate: (db: DatabaseSync) => string[] | void
): void => {
  transaction((db) => {
    writeSnapshot(db, snapshot);
    const mismatches = validate(db);
    if (Array.isArray(mismatches) && mismatches.length) {
      throw new MigrationValidationError(mismatches);
    }
  });
};

/** Erro de validação pós-migração: dispara ROLLBACK. */
export class MigrationValidationError extends Error {
  constructor(public readonly mismatches: string[]) {
    super(`Validação da migração falhou: ${mismatches.join('; ')}`);
    this.name = 'MigrationValidationError';
  }
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

const selectAll = <T extends Row = Row>(db: DatabaseSync, table: string): T[] =>
  db.prepare(`SELECT * FROM ${table}`).all() as T[];

export const loadSnapshot = (): Row | null => {
  const db = getDb();

  const settingsRow = db.prepare('SELECT * FROM restaurant_settings LIMIT 1').get() as Row | undefined;
  if (!settingsRow) return null;

  const cashRow = db.prepare('SELECT * FROM cash_register LIMIT 1').get() as Row | undefined;
  const cash = parse<Row | null>(cashRow?.raw_data, null);
  if (cash) {
    cash.turnoAtual = parse<Row | null>(cash.turnoAtual, null) ?? null;
    cash.turnosHistorico = selectAll(db, 'turnos_operacionais')
      .map(row => parse<Row>(row.raw_data, { id: row.id, status: row.status }))
      .filter(Boolean);
    cash.transacoes = selectAll(db, 'cash_transactions')
      .map(row => parse<Row>(row.raw_data, { id: row.id, tipo: row.tipo, valor: row.valor }));
  }

  const itemsByOrder = new Map<string, Row[]>();
  for (const row of selectAll(db, 'order_items')) {
    const list = itemsByOrder.get(String(row.order_id)) ?? [];
    list.push(parse<Row>(row.raw_data, { id: row.id, nome: row.nome, quantidade: row.quantidade }));
    itemsByOrder.set(String(row.order_id), list);
  }

  const paymentsByOrder = new Map<string, Row[]>();
  for (const row of selectAll(db, 'payments')) {
    const orderId = String(row.order_id ?? '');
    const list = paymentsByOrder.get(orderId) ?? [];
    list.push(parse<Row>(row.raw_data, { id: row.id, valor: row.valor }));
    paymentsByOrder.set(orderId, list);
  }

  return {
    operationalDemoResetApplied: true,
    settings: parse<Row>(settingsRow.raw_data, {
      id: settingsRow.id,
      setupComplete: Boolean(settingsRow.setup_complete)
    }),
    menu: selectAll(db, 'menu_items').map(row => hydrate<Row>(row, { id: row.id, nome: row.nome, preco: row.preco, disponivel: Boolean(row.disponivel) })),
    menuCategories: selectAll(db, 'menu_categories').map(row => hydrate<Row>(row, { id: row.id, nome: row.nome, catalogos: parse<string[]>(row.catalogos, []) })),
    users: selectAll(db, 'users').map(row => hydrate<Row>(row, { id: row.id, nome: row.nome, usuario: row.usuario, ativo: Boolean(row.ativo) })),
    customers: selectAll(db, 'customers').map(row => hydrate<Row>(row, { id: row.id, nome: row.nome, telefone: row.telefone })),
    reservations: selectAll(db, 'reservations').map(row => hydrate<Row>(row, { id: row.id })),
    paymentOptions: selectAll(db, 'payment_options').map(row => hydrate<Row>(row, { id: row.id, nome: row.nome })),
    tables: selectAll(db, 'tables').map(row => hydrate<Row>(row, { id: row.id, numero: row.numero, status: row.status })),
    accounts: selectAll(db, 'accounts').map(row => hydrate<Row>(row, { id: row.id, numero: row.numero, status: row.status, total: row.total, saldo_restante: row.saldo_restante })),
    orders: selectAll(db, 'orders').map(row => {
      const order = hydrate<Row>(row, { id: row.id, numero: row.numero, status: row.status, total: row.total });
      order.itens = itemsByOrder.get(String(row.id)) ?? [];
      order.pagamentos = paymentsByOrder.get(String(row.id)) ?? [];
      return order;
    }),
    cashRegister: cash,
    printers: selectAll(db, 'printers').map(row => hydrate<Row>(row, { id: row.id, nome: row.nome, status: row.status, ativa: Boolean(row.ativa) })),
    printQueue: selectAll(db, 'print_jobs').map(row => hydrate<Row>(row, { id: row.id, status: row.status, tentativas: row.tentativas })),
    auditLogs: selectAll(db, 'audit_logs').map(row => hydrate<Row>(row, { id: row.id, acao: row.acao, entidade: row.entidade, usuario: row.usuario }))
  };
};

/* ------------------------------------------------------------------ */
/* Validação e contagens                                               */
/* ------------------------------------------------------------------ */

const COUNT_TABLES: Record<string, string> = {
  usuarios: 'users',
  produtos: 'menu_items',
  categorias: 'menu_categories',
  clientes: 'customers',
  reservas: 'reservations',
  pedidos: 'orders',
  itens_pedido: 'order_items',
  contas: 'accounts',
  pagamentos: 'payments',
  turnos: 'turnos_operacionais',
  transacoes_caixa: 'cash_transactions',
  impressoras: 'printers',
  trabalhos_impressao: 'print_jobs',
  logs: 'audit_logs',
  mesas: 'tables',
  formas_pagamento: 'payment_options'
};

export const countEntities = (db: DatabaseSync = getDb()): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const [label, table] of Object.entries(COUNT_TABLES)) {
    const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number };
    result[label] = Number(row?.total ?? 0);
  }
  return result;
};

export const isEmptyDatabase = (): boolean => getBootstrapStatus() === 'empty';
