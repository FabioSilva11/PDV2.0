import React, { useEffect, useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Account, Order, PaymentMethod, Table } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { FIRST_ORDER_SEQUENCE, buildDisplayCode, nextAccountNumber, nextOrderSequence } from '../../lib/accountMigration';
import { PaymentModal } from '../pdv/PaymentModal';
import { ReceiptModal } from '../pdv/ReceiptModal';
import {
  X, Clock, Receipt, PlusCircle, DollarSign, Divide, Utensils, MoveRight,
  FileText, AlertTriangle, ArrowRight
} from 'lucide-react';

const orderLabel = (order: Order) => order.codigoExibicao || order.codigoMesa || `#${order.numero}`;

/** Rótulo operacional do lançamento (espelho/preparo), sem valores financeiros. */
const operationalStatusLabel = (order: Order): string => {
  if (order.status === 'finalizado') return 'Finalizado';
  if (order.status === 'pronto') return 'Pronto';
  if (order.status === 'cancelado') return 'Cancelado';
  return 'Aguardando espelho';
};

interface TableDetailsModalProps {
  table: Table;
  onClose: () => void;
}

/**
 * "Detalhes da Mesa" — a tela operacional do mapa.
 *
 * O CARD do mapa é estritamente físico (número, status, capacidade). Aqui, e
 * somente aqui, aparecem contas, lançamentos e valores.
 *
 * Regras de escolha da conta (fonte única: getOpenTableAccounts /
 * getPreferredAccountForTable):
 *  - 1 conta aberta  -> selecionada automaticamente;
 *  - 0 contas abertas-> "Nenhuma conta aberta" e só "+ Novo atendimento";
 *  - >1 contas       -> NENHUMA é escolhida: o operador escolhe.
 */
export const TableDetailsModal: React.FC<TableDetailsModalProps> = ({ table, onClose }) => {
  const {
    accounts, orders, tables, getAccount, getAccountOrders, getOpenTableAccounts, getPreferredAccountForTable,
    openTableWithOrder, requestTableBill, settleTableAccount, payAccount, freeTableManually, transferTable,
    setActiveModule, setPosHandoff, setSelectedOrderForModal,
    selectedReceiptOrder, setSelectedReceiptOrder
  } = useRestaurant();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [splitCount, setSplitCount] = useState(2);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTargetAmount, setPaymentTargetAmount] = useState<number | undefined>(undefined);
  const [newTableClientName, setNewTableClientName] = useState('');
  const [transferTarget, setTransferTarget] = useState<number | ''>('');
  const [actionError, setActionError] = useState('');

  // Contas ABERTAS ligadas a esta mesa (nunca `paga` nem `encerrada`).
  const openAccounts = getOpenTableAccounts(table.numero);
  const resolution = getPreferredAccountForTable(table.numero);
  const currentAccount = table.contaAtualId ? getAccount(table.contaAtualId) : undefined;
  const openAccountsKey = openAccounts.map(a => a.id).join(',');

  // Seleção da conta: automática apenas quando há UMA conta aberta. Havendo
  // mais de uma, nada é escolhido — o operador precisa decidir.
  useEffect(() => {
    setSelectedAccountId(prev => {
      if (prev && openAccounts.some(a => a.id === prev)) return prev;
      return resolution.kind === 'conta' ? resolution.account.id : '';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAccountsKey, resolution.kind, table.numero]);

  const selectedAccount: Account | undefined = selectedAccountId ? getAccount(selectedAccountId) : undefined;
  const ambiguous = resolution.kind === 'ambigua' && !selectedAccount;

  // Sem conta escolhida (ambiguidade), mostramos os lançamentos de TODAS as
  // contas abertas ligadas à mesa — nunca de uma conta escolhida por sorteio.
  const visibleOrders = useMemo(() => {
    const source = selectedAccount ? [selectedAccount] : openAccounts;
    return source
      .flatMap(a => getAccountOrders(a.id))
      .filter(o => o.status !== 'cancelado')
      .sort((a, b) => (a.contaNumero ?? 0) - (b.contaNumero ?? 0) || (a.sequencia ?? 0) - (b.sequencia ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, openAccountsKey, orders]);

  const accountOrders = selectedAccount ? getAccountOrders(selectedAccount.id).filter(o => o.status !== 'cancelado') : [];
  const tableTotal = accountOrders.reduce((sum, o) => sum + o.total, 0);
  const paidTotal = accountOrders.reduce((sum, o) => sum + o.valorTotalPago, 0);
  const remainingTotal = accountOrders.reduce((sum, o) => sum + o.saldoRestante, 0);
  const splitAmount = splitCount > 0 ? remainingTotal / splitCount : remainingTotal;

  // Próximo código: usa as funções centrais, nunca `length + 1`.
  const nextSequence = selectedAccount ? nextOrderSequence(orders, selectedAccount.id) : FIRST_ORDER_SEQUENCE;
  const nextCode = selectedAccount
    ? buildDisplayCode(selectedAccount.numero, nextSequence)
    : buildDisplayCode(nextAccountNumber(accounts), FIRST_ORDER_SEQUENCE);
  const newAccountNumber = nextAccountNumber(accounts);
  const newAccountCode = buildDisplayCode(newAccountNumber, FIRST_ORDER_SEQUENCE);

  /** Histórico da mesa: contas que já ocuparam o lugar (nunca é apagado). */
  const historyOf = (tableNumber: number) => accounts
    .filter(a => a.mesaOriginalNumero === tableNumber || a.mesaAtualNumero === tableNumber)
    .sort((a, b) => a.numero - b.numero);

  const isFree = table.status === 'livre';
  const isBill = table.status === 'conta';
  const statusLabel = isFree ? 'Livre' : isBill ? 'Pedindo conta' : 'Ocupada';

  const freeTables = tables.filter(t => t.numero !== table.numero && !t.contaAtualId).map(t => t.numero);

  /** "Novo lançamento": CONTINUA uma conta existente. Nunca cria conta. */
  const handleNewOrder = () => {
    if (!selectedAccount) return;
    setPosHandoff({ tableNumber: table.numero, contaId: selectedAccount.id, motivo: 'lancamento' });
    setActiveModule('pdv');
  };

  /** "Novo atendimento": cria uma NOVA conta. Escolha sempre explícita. */
  const handleNewAccount = (customerName?: string) => {
    setActionError('');
    try {
      openTableWithOrder(table.numero, customerName || newTableClientName.trim() || `Mesa ${table.numero}`);
      setNewTableClientName('');
      setPosHandoff({ tableNumber: table.numero, motivo: 'atendimento' });
      setActiveModule('pdv');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível abrir um novo atendimento.');
    }
  };

  const handleSettleConfirm = (method: PaymentMethod, amountPaid?: number, change?: number) => {
    setActionError('');
    try {
      // Com conta escolhida, cobramos AQUELA conta (pode estar liberada).
      const result = selectedAccount
        ? (() => {
          payAccount(selectedAccount.id, method, paymentTargetAmount ?? amountPaid, change);
          const own = getAccountOrders(selectedAccount.id);
          return own[own.length - 1] || null;
        })()
        : settleTableAccount(table.numero, method, paymentTargetAmount ?? amountPaid, change);
      setIsPaymentOpen(false);
      setPaymentTargetAmount(undefined);
      if (result) setSelectedReceiptOrder(result);
      return result!;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível registrar o pagamento.');
      setIsPaymentOpen(false);
      throw e;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div id="table-details-modal" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]" role="dialog" aria-modal="true">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-serif font-black text-xl">{String(table.numero).padStart(2, '0')}</div>
            <div>
              <h3 className="font-bold text-base font-serif" id="table-details-title">MESA {String(table.numero).padStart(2, '0')}</h3>
              <div className="text-xs text-slate-400">
                Status: <span id="table-details-status">{statusLabel}</span>
                {table.abertaEm ? ` • ocupada desde ${formatDateTime(table.abertaEm)}` : ''}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {actionError && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" /><span id="table-details-error">{actionError}</span>
            </div>
          )}

          {/* ---------- CONTAS RELACIONADAS ---------- */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Contas relacionadas</h4>
              <span className="text-[10px] font-semibold text-slate-500" id="table-details-open-count">
                {openAccounts.length === 0 ? 'nenhuma em aberto' : `${openAccounts.length} em aberto${openAccounts.length > 1 ? ' • escolha obrigatória' : ''}`}
              </span>
            </div>
            <div className="p-3 space-y-2" id="table-details-accounts">
              {openAccounts.length === 0 && (
                <p className="text-xs text-slate-500" id="table-details-no-open-account">
                  Nenhuma conta aberta nesta mesa. Use <strong>+ Novo atendimento</strong> para criar a próxima conta.
                </p>
              )}
              {openAccounts.map(account => {
                const active = account.id === selectedAccountId;
                return (
                  <button
                    key={account.id}
                    type="button"
                    id={`table-details-account-${account.numero}`}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <span className="font-bold text-slate-800">
                      Conta {account.numero}
                      <span className="ml-1 font-normal text-slate-500">
                        {account.mesaAtualNumero === table.numero ? '• ocupa a mesa' : '• liberada pelo espelho'}
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-slate-700">{formatCurrency(account.saldoRestante)}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600" id="table-details-account-hint">
              {ambiguous
                ? `Há mais de uma conta aberta nesta mesa (${openAccounts.map(a => `Conta ${a.numero}`).join(' e ')}). Escolha qual conta continua — nada é escolhido automaticamente.`
                : selectedAccount
                  ? `Conta ${selectedAccount.numero} em uso. Próximo lançamento: ${nextCode}.`
                  : 'Nenhuma conta escolhida.'}
            </div>
          </div>

          {/* ---------- LANÇAMENTOS ---------- */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lançamentos</h4>
                <p className="text-[10px] text-slate-500">Liberar a mesa nunca apaga lançamento, espelho ou histórico.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{visibleOrders.length}</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto" id="table-details-orders">
              {visibleOrders.length === 0 && (
                <p className="p-4 text-xs text-slate-500" id="table-details-no-orders">Nenhum lançamento nesta mesa.</p>
              )}
              {visibleOrders.map(order => (
                <button
                  key={order.id}
                  type="button"
                  id={`table-details-order-${order.id}`}
                  onClick={() => setSelectedOrderForModal(order)}
                  className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${order.status === 'finalizado' ? 'bg-stone-400' : order.status === 'pronto' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                    <strong className="text-sm font-mono">{orderLabel(order)}</strong>
                    {!selectedAccount && <span className="text-[10px] text-slate-500">Conta {order.contaNumero}</span>}
                    <span className="text-[10px] text-slate-500">#{order.numero}</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-600">{operationalStatusLabel(order)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ---------- AÇÕES ---------- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              id="table-details-new-order-btn"
              onClick={handleNewOrder}
              disabled={!selectedAccount}
              title={selectedAccount ? `Continuar a Conta ${selectedAccount.numero} com o lançamento ${nextCode}` : 'Selecione uma conta aberta'}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />+ Novo lançamento{selectedAccount ? ` (${nextCode})` : ''}
            </button>
            <button
              type="button"
              id="table-details-new-account-btn"
              onClick={() => handleNewAccount()}
              title={`Abrir um novo atendimento: Conta ${newAccountNumber} com o lançamento ${newAccountCode}`}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
            >
              <Utensils className="w-4 h-4" />+ Novo atendimento ({newAccountCode})
            </button>
            <button
              type="button"
              id="table-details-close-btn"
              onClick={onClose}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />Fechar
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            &quot;Novo lançamento&quot; <strong>continua</strong> a conta escolhida (nunca cria conta). &quot;Novo atendimento&quot; cria uma conta nova e independente.
          </p>

          {/* ---------- GESTÃO DA CONTA (financeiro fica AQUI, não no mapa) ---------- */}
          {selectedAccount && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><div className="text-[10px] text-slate-500">Total</div><div className="font-mono font-black">{formatCurrency(tableTotal)}</div></div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200"><div className="text-[10px] text-emerald-700">Pago</div><div className="font-mono font-black text-emerald-800">{formatCurrency(paidTotal)}</div></div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200"><div className="text-[10px] text-sky-700">Saldo</div><div className="font-mono font-black text-blue-900">{formatCurrency(remainingTotal)}</div></div>
              </div>

              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1"><Divide className="w-3.5 h-3.5" />Divisão da conta</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="w-6 h-6 bg-white border border-sky-300 rounded font-bold">-</button>
                    <span className="font-bold font-mono w-4 text-center">{splitCount}</span>
                    <button type="button" onClick={() => setSplitCount(splitCount + 1)} className="w-6 h-6 bg-white border border-sky-300 rounded font-bold">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-200/60">
                  <span className="text-slate-600">Valor por pessoa:</span><span className="font-bold font-mono text-blue-900">{formatCurrency(splitAmount)}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><MoveRight className="w-3.5 h-3.5" />Transferir conta para outra mesa</div>
                <div className="flex items-center gap-2">
                  <select value={transferTarget} onChange={e => setTransferTarget(e.target.value === '' ? '' : Number(e.target.value))} className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                    <option value="">Selecione a mesa de destino…</option>
                    {freeTables.map(t => <option key={t} value={t}>Mesa {t}</option>)}
                  </select>
                  <button type="button" id="table-transfer-btn" disabled={transferTarget === ''} onClick={() => { transferTable(table.numero, Number(transferTarget)); setTransferTarget(''); }} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-40">Transferir</button>
                </div>
                <p className="text-[10px] text-slate-500">A conta e os lançamentos continuam os mesmos; apenas a ocupação física muda.</p>
              </div>

              <div className="flex items-center gap-2">
                {table.status === 'ocupada' ? (
                  <button type="button" id="table-request-bill-btn" onClick={() => requestTableBill(table.numero)} className="flex-1 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-300 flex items-center justify-center gap-1.5"><Receipt className="w-3.5 h-3.5" />Marcar como &quot;Pedindo Conta&quot;</button>
                ) : (
                  <div className="flex-1 py-2 bg-purple-50 text-purple-800 text-xs font-semibold rounded-xl border border-purple-200 text-center">Mesa aguardando baixa manual</div>
                )}
                <button
                  type="button"
                  id="table-free-manual-btn"
                  onClick={() => {
                    if (confirm(`Deseja realmente desocupar a Mesa ${table.numero} sem registrar pagamento? A Conta ${selectedAccount.numero} e seu histórico serão mantidos.`)) {
                      freeTableManually(table.numero);
                    }
                  }}
                  className="py-2 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                >Liberar Mesa</button>
              </div>
            </>
          )}

          {/* ---------- HISTÓRICO E MESA SEM CONTA ABERTA ---------- */}
          {openAccounts.length === 0 && (
            <div className="space-y-3">
              {(() => {
                const history = historyOf(table.numero);
                return history.length ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico da mesa</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {history.map(a => <span key={a.id} className={`px-2 py-1 rounded-md text-[10px] font-bold ${a.status === 'encerrada' || a.status === 'paga' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>Conta {a.numero} • {a.status}</span>)}
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                Esta mesa está livre e sem conta em aberto. &quot;+ Novo atendimento&quot; cria a <strong>Conta {newAccountNumber}</strong> e o primeiro lançamento <strong>{newAccountCode}</strong>.
              </div>
              <div className="flex items-center gap-2">
                <input type="text" id="modal-open-table-name-input" value={newTableClientName} onChange={e => setNewTableClientName(e.target.value)} placeholder="Cliente / família (opcional)" className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm" />
                <button type="button" id="modal-confirm-open-table-btn" onClick={() => handleNewAccount()} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"><FileText className="w-4 h-4" />Abrir Conta ({newAccountCode})</button>
              </div>
            </div>
          )}

          {currentAccount && currentAccount.status !== 'aberta' && openAccounts.length === 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5" />Esta mesa já teve a Conta {currentAccount.numero} ({currentAccount.status}).
            </div>
          )}
        </div>

        {selectedAccount && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button type="button" id="table-add-more-items-btn" onClick={handleNewOrder} className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"><PlusCircle className="w-3.5 h-3.5 text-blue-600" />Novo Lançamento na Conta {selectedAccount.numero}</button>
            <button type="button" id="table-split-account-btn" disabled={remainingTotal <= 0 || splitCount < 2} onClick={() => { setPaymentTargetAmount(Math.min(splitAmount, remainingTotal)); setIsPaymentOpen(true); }} className="w-full sm:w-auto px-4 py-2.5 bg-sky-100 hover:bg-sky-200 disabled:opacity-40 text-blue-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2"><Divide className="w-4 h-4" />Pagar 1 parte • {formatCurrency(Math.min(splitAmount, remainingTotal))}</button>
            <button type="button" id="table-settle-account-btn" disabled={remainingTotal <= 0} onClick={() => { setPaymentTargetAmount(undefined); setIsPaymentOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"><DollarSign className="w-4 h-4" />Dar Baixa • {formatCurrency(remainingTotal)}</button>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        total={Math.min(paymentTargetAmount ?? remainingTotal, remainingTotal)}
        onClose={() => setIsPaymentOpen(false)}
        onConfirm={handleSettleConfirm}
        onReceiptTrigger={order => setSelectedReceiptOrder(order)}
      />
      <ReceiptModal order={selectedReceiptOrder} isOpen={!!selectedReceiptOrder} onClose={() => setSelectedReceiptOrder(null)} />
    </div>
  );
};
