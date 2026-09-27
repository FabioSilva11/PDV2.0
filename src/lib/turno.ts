/**
 * DOMÍNIO DO TURNO OPERACIONAL (CAIXA = CONTROLE DO TURNO)
 *
 * Regra central do projeto:
 *   HISTÓRICO = PRESERVADO
 *   OPERAÇÃO DO TURNO = ISOLADA
 *   NOVO TURNO = NOVO ESTADO OPERACIONAL
 *
 * Este módulo é PURO (sem React, sem estado global): recebe pedidos, contas,
 * mesas e transações e devolve decisões. Assim a Central de Pedidos, o
 * fechamento do caixa e os testes usam EXATAMENTE o mesmo conceito de
 * pendência — nunca uma regra duplicada por tela.
 *
 * Critérios (imutáveis):
 *   - Pedido pendente  => existe saldo financeiro real (saldoRestante > 0) e o
 *     pedido não está cancelado.
 *   - Conta pendente   => status === 'aberta' && saldoRestante > 0.
 *   - Pagamento parcial => pendente (saldoRestante > 0 com algum pagamento).
 *   - Pedido cancelado corretamente (sem saldo, sem pagamento pendente) NÃO
 *     bloqueia o fechamento.
 *   - statusPagamento = 'pago' com saldoRestante > 0 é INCONSISTÊNCIA
 *     financeira: nunca é ignorada, nunca fecha silenciosamente.
 *   - Mesa livre NUNCA prova quitação: a pendência é lida da CONTA, não da
 *     ocupação física.
 */

import type {
  Account,
  CashTransaction,
  Order,
  PendenciaFechamento,
  Table,
  TurnoId,
  TurnoOperacional
} from '../types';
import { money } from '../utils/business';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Arredonda para comparação financeira segura (evita 0.009999999). */
const round = (value: unknown): number => {
  const n = Number(value);
  return isFiniteNumber(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
};

/**
 * Formata o identificador único do turno.
 * Ex.: formatTurnoId(new Date(), 3) => 'turno-20260926-003'
 */
export const formatTurnoId = (date: Date, sequencial: number): TurnoId => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const seq = String(Math.max(1, Math.floor(sequencial))).padStart(3, '0');
  return `turno-${ano}${mes}${dia}-${seq}`;
};

/**
 * Próximo turnoId determinístico: mesmo dia = sequencial crescente com base
 * nos turnos já registrados (histórico + atual). Nunca reutiliza um turnoId.
 */
export const nextTurnoId = (historico: TurnoOperacional[], agora = new Date()): TurnoId => {
  const prefixo = `turno-${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, '0')}${String(agora.getDate()).padStart(2, '0')}-`;
  let maxSeq = 0;
  for (const turno of [...historico]) {
    if (typeof turno?.id === 'string' && turno.id.startsWith(prefixo)) {
      const seq = Number(turno.id.slice(prefixo.length));
      if (isFiniteNumber(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return formatTurnoId(agora, maxSeq + 1);
};

/**
 * Pedido financeiramente PENDENTE: tem saldo real a receber e não está
 * cancelado. Pagamentos parciais caem aqui (saldoRestante > 0). Pedido
 * totalmente pago (saldo 0) NÃO é pendente. Cancelado com saldo residual por
 * erro de dados é inconsistência — tratada em validarPendenciasFechamento.
 */
export const isOrderFinanciallyPending = (order: Order): boolean => {
  if (!order || order.status === 'cancelado') return false;
  return round(order.saldoRestante) > 0;
};

/**
 * FUNÇÃO CENTRAL de pedidos pendentes (usada pela Central de Pedidos, pelo
 * fechamento do caixa e pelos testes — sempre a mesma definição).
 */
export const getPendingFinancialOrders = (orders: Order[]): Order[] =>
  (orders || []).filter(isOrderFinanciallyPending);

/**
 * FUNÇÃO CENTRAL de contas pendentes: status 'aberta' com saldo restante.
 * Conta paga/encerrada nunca é pendente. Mesa livre não influencia nada.
 */
export const getPendingFinancialAccounts = (accounts: Account[]): Account[] =>
  (accounts || []).filter(account =>
    !!account && account.status === 'aberta' && round(account.saldoRestante) > 0
  );

/** Texto exibido do lançamento (0.7, #42, ...). */
export const orderLabel = (order: Order): string =>
  order.codigoExibicao || order.codigoMesa || `#${order.numero}`;

/** Contas abertas ligadas a um lançamento (para exibição na conferência). */
const contaLabelOf = (order: Order, accounts: Account[]): string => {
  if (order.contaNumero !== undefined) return `Conta ${order.contaNumero}`;
  const conta = accounts.find(a => a.id === order.contaId);
  return conta ? `Conta ${conta.numero}` : 'conta —';
};

/** Mesa relacionada ao lançamento, quando existir (informação física). */
const mesaLabelOf = (order: Order): string =>
  order.mesaNumero !== undefined ? `Mesa ${order.mesaNumero}` : '';

export interface ConferenciaFechamento {
  pedidosPendentes: Order[];
  contasPendentes: Account[];
  /** Inconsistências: 'pago' com saldo, cancelado com saldo, cancelado com recebimento vivo. */
  inconsistencias: PendenciaFechamento[];
  /** Pendências válidas (não são inconsistências). */
  pendencias: PendenciaFechamento[];
  /** Pendências + inconsistências: o que aparece no modal de fechamento. */
  itens: PendenciaFechamento[];
  totalPendente: number;
  /** Somente inconsistências impedem fechar por divergência de dados. */
  temInconsistencia: boolean;
  /** Verdadeiro quando NÃO há nada a conferir. */
  limpo: boolean;
}

/**
 * CONFERÊNCIA OBRIGATÓRIA DE FECHAMENTO (somente leitura — nada é alterado).
 *
 * Verifica:
 *   A) pedidos com saldo pendente;
 *   B) contas abertas com saldo;
 *   C) pagamentos parciais (decorrência de saldoRestante > 0 com pagamento);
 *   D) lançamentos não baixados (mesma lista A);
 *   E) inconsistências financeiras entre pedido x conta x pagamentos.
 *
 * Regra 21: a mesa entra apenas como INFORMAÇÃO (labels); o status físico da
 * mesa nunca quita nem oculta uma pendência.
 */
export const validarPendenciasFechamento = (
  orders: Order[],
  accounts: Account[],
  _tables: Table[] = []
): ConferenciaFechamento => {
  const pedidosPendentes = getPendingFinancialOrders(orders);
  const contasPendentes = getPendingFinancialAccounts(accounts);

  const pendencias: PendenciaFechamento[] = [];

  for (const order of pedidosPendentes) {
    const parcial = (order.pagamentos || []).some(p => !p.estornado);
    pendencias.push({
      tipo: parcial ? 'pagamento_parcial' : 'pedido_saldo',
      descricao: `${orderLabel(order)} — ${contaLabelOf(order, accounts)}${mesaLabelOf(order) ? ` — ${mesaLabelOf(order)}` : ''} — saldo ${money(order.saldoRestante).toFixed(2)}`,
      valor: money(order.saldoRestante),
      entidadesIds: [order.id, ...(order.contaId ? [order.contaId] : [])],
      severidade: 'aviso'
    });
  }

  for (const account of contasPendentes) {
    // Só repete aviso de conta quando NENHUM lançamento dela já cobre o saldo
    // (evita duplicar a mesma pendência pedido+conta no relatório).
    const lancamentos = orders.filter(o => o.contaId === account.id);
    const jaCoberto = lancamentos.some(o => pedidosPendentes.includes(o));
    if (jaCoberto) continue;
    pendencias.push({
      tipo: 'conta_saldo',
      descricao: `Conta ${account.numero}${account.nomeCliente ? ` — ${account.nomeCliente}` : ''}${account.mesaAtualNumero !== undefined ? ` — Mesa ${account.mesaAtualNumero}` : ''} — saldo ${money(account.saldoRestante).toFixed(2)}`,
      valor: money(account.saldoRestante),
      entidadesIds: [account.id, ...lancamentos.map(o => o.id)],
      severidade: 'aviso'
    });
  }

  // E) INCONSISTÊNCIAS FINANCEIRAS (regra 17/37): sempre bloqueiam.
  const inconsistencias: PendenciaFechamento[] = [];

  for (const order of orders || []) {
    // 17. statusPagamento 'pago' mas existe saldo: dado corrompido/parcial.
    if (order.statusPagamento === 'pago' && round(order.saldoRestante) > 0 && order.status !== 'cancelado') {
      inconsistencias.push({
        tipo: 'inconsistencia_financeira',
        descricao: `${orderLabel(order)} marcado como PAGO mas com saldo de ${money(order.saldoRestante).toFixed(2)}`,
        valor: money(order.saldoRestante),
        entidadesIds: [order.id],
        severidade: 'bloqueio'
      });
    }
    // Cancelado com recebimento vivo é inconsistência (dinheiro entrou e a
    // venda saiu: ou estorna ou é dado corrompido). O cancelamento normal já
    // é bloqueado com pagamento ativo, então isso só pega dados corrompidos.
    // O saldoRestante residual de um pedido cancelado NÃO é dinheiro devido:
    // não gera pendência nem inconsistência (regra 18).
    if (order.status === 'cancelado') {
      const recebimentoVivo = (order.pagamentos || []).some(p => !p.estornado);
      if (recebimentoVivo) {
        inconsistencias.push({
          tipo: 'inconsistencia_financeira',
          descricao: `${orderLabel(order)} CANCELADO mas possui pagamento não estornado`,
          valor: money(order.valorTotalPago),
          entidadesIds: [order.id],
          severidade: 'bloqueio'
        });
      }
    }
  }

  const itens = [...pendencias, ...inconsistencias];
  const totalPendente = money(pendencias.reduce((sum, p) => sum + p.valor, 0));
  return {
    pedidosPendentes,
    contasPendentes,
    inconsistencias,
    pendencias,
    itens,
    totalPendente,
    temInconsistencia: inconsistencias.length > 0,
    limpo: itens.length === 0
  };
};

/**
 * LIMPEZA OPERACIONAL DAS MESAS AO ABRIR NOVO TURNO (regras 6/13).
 *
 * Zera APENAS os campos operacionais do turno anterior e preserva o físico/
 * histórico (id, numero, capacidade, posição, formato, setor, ultimaConta*,
 * reservas). Mesas reservadas continuam reservadas — reserva não é ocupação
 * do turno.
 */
export const liberarOcupacaoOperacional = (tables: Table[]): Table[] =>
  (tables || []).map(table => {
    const base = {
      ...table,
      status: table.status === 'reservada' ? table.status : ('livre' as const),
      garcomResponsavel: undefined,
      clienteNome: undefined,
      abertaEm: undefined,
      pedidoAtivoId: undefined,
      contaAtualId: undefined,
      contaAtualNumero: undefined,
      sessaoAtivaId: undefined,
      sessaoNumero: undefined,
      turnoId: undefined,
      valorAtual: 0,
      pessoasSentadas: undefined
    };
    return base;
  });

/**
 * Fila operacional de impressão do turno atual: somente jobs pendentes do
 * turno atual (histórico de impressão nunca é apagado).
 */
export const printQueueDoTurno = (queue: { status?: string; turnoId?: TurnoId }[], turnoId?: TurnoId) =>
  (queue || []).filter(job => job.status === 'pendente' && (!turnoId || job.turnoId === turnoId));

/** Transações de um turno específico (histórico completo fica no caixa). */
export const transacoesDoTurno = (transacoes: CashTransaction[], turnoId?: TurnoId): CashTransaction[] =>
  (transacoes || []).filter(tx => !turnoId || tx.turnoId === turnoId);
