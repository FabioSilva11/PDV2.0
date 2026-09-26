import React, { useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table, Order, PaymentMethod } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { PaymentModal } from '../pdv/PaymentModal';
import { ReceiptModal } from '../pdv/ReceiptModal';
import { Users, Clock, Receipt, PlusCircle, DollarSign, X, Divide, Utensils, MoveRight, FileText } from 'lucide-react';

const orderLabel = (order: Order) => order.codigoExibicao || order.codigoMesa || `#${order.numero}`;

export const TablesView: React.FC = () => {
  const {
    tables, orders, accounts, getAccount, getAccountOrders, getPreferredAccountForTable, openTableWithOrder, requestTableBill,
    settleTableAccount, freeTableManually, transferTable, setActiveModule,
    selectedReceiptOrder, setSelectedReceiptOrder,
  } = useRestaurant();

  const [filter, setFilter] = useState<'todas' | 'livres' | 'ocupadas' | 'conta'>('todas');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTargetAmount, setPaymentTargetAmount] = useState<number | undefined>(undefined);
  const [newTableClientName, setNewTableClientName] = useState('');
  const [transferTarget, setTransferTarget] = useState<number | ''>('');

  // A mesa é buscada ao vivo para que card e modal nunca mostrem dado antigo.
  const selectedTable = selectedTableNumber === null
    ? null
    : tables.find(t => t.numero === selectedTableNumber) || null;

  /** Conta que ocupa a mesa agora (não o histórico). */
  const currentAccountOf = (table: Table) => (table.contaAtualId ? getAccount(table.contaAtualId) : undefined);

  /**
   * Conta exibida na mesa: a mesma hierarquia do PDV (conta atual -> conta
   * aberta ligada à mesa). Mesa livre pode exibir "Conta 2 em aberto": é
   * informação secundária, a ocupação física continua LIVRE.
   */
  const accountOf = (table: Table) => {
    const resolution = getPreferredAccountForTable(table.numero);
    if (resolution.kind === 'conta') return resolution.account;
    if (resolution.kind === 'ambigua') return resolution.accounts[0];
    return currentAccountOf(table);
  };

  const accountOrders = (accountId?: string) => (accountId ? getAccountOrders(accountId).filter(o => o.status !== 'cancelado') : []);

  const selectedAccount = selectedTable ? accountOf(selectedTable) : undefined;
  const selectedAccountOrders = useMemo(
    () => accountOrders(selectedAccount?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedAccount?.id, orders]
  );

  const tableTotal = selectedAccountOrders.reduce((sum, o) => sum + o.total, 0);
  const paidTotal = selectedAccountOrders.reduce((sum, o) => sum + o.valorTotalPago, 0);
  const remainingTotal = selectedAccountOrders.reduce((sum, o) => sum + o.saldoRestante, 0);
  const splitAmount = splitCount > 0 ? remainingTotal / splitCount : remainingTotal;

  /** Histórico de contas que já ocuparam a mesa (nunca é apagado). */
  const historyOf = (tableNumber: number) => accounts
    .filter(a => a.mesaOriginalNumero === tableNumber || a.mesaAtualNumero === tableNumber)
    .sort((a, b) => a.numero - b.numero);

  const tableMatchesFilter = (table: Table, f: typeof filter) => {
    if (f === 'todas') return true;
    if (f === 'livres') return table.status === 'livre';
    if (f === 'ocupadas') return table.status === 'ocupada' || table.status === 'fechando';
    return table.status === 'conta';
  };
  const filteredTables = tables.filter(t => tableMatchesFilter(t, filter));

  const handleOpenTableClick = (tableNumber: number) => {
    openTableWithOrder(tableNumber, newTableClientName.trim() || `Mesa ${tableNumber}`);
    setNewTableClientName('');
    setSelectedTableNumber(null);
    setActiveModule('pdv');
  };

  const handleSettleConfirm = (method: PaymentMethod, amountPaid?: number, change?: number) => {
    if (!selectedTable) throw new Error('Nenhuma mesa selecionada.');
    const result = settleTableAccount(selectedTable.numero, method, paymentTargetAmount ?? amountPaid, change);
    setIsPaymentOpen(false);
    setPaymentTargetAmount(undefined);
    if (result) setSelectedReceiptOrder(result);
    setSelectedTableNumber(null);
    return result!;
  };

  const freeTables = tables.filter(t => t.numero !== selectedTable?.numero && !t.contaAtualId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Mapa de Mesas &amp; Salão</h2>
          <p className="text-xs text-slate-500">A mesa é apenas a ocupação física. O atendimento vive na <strong>conta</strong> e cada lançamento recebe um código como <strong>0.1</strong>, <strong>0.2</strong>.</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
          {(['todas', 'livres', 'ocupadas', 'conta'] as const).map(value => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg ${filter === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {value === 'todas' ? `Todas (${tables.length})` : value === 'livres' ? `Livres (${tables.filter(t => tableMatchesFilter(t, 'livres')).length})` : value === 'ocupadas' ? `Ocupadas (${tables.filter(t => tableMatchesFilter(t, 'ocupadas')).length})` : `Pedindo Conta (${tables.filter(t => tableMatchesFilter(t, 'conta')).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map(table => {
          const account = accountOf(table);
          const own = accountOrders(account?.id);
          const total = own.reduce((sum, o) => sum + o.saldoRestante, 0);
          const isFree = table.status === 'livre';
          const isBill = table.status === 'conta';
          // Mesa livre COM conta aberta e saldo: situação permitida e comum
          // após o espelho do último lançamento.
          const freeWithOpenAccount = isFree && !!account && account.status === 'aberta' && account.saldoRestante > 0;
          const last = historyOf(table.numero).slice(-1)[0];
          return (
            <div key={table.numero} id={`table-card-${table.numero}`} onClick={() => setSelectedTableNumber(table.numero)} className={`rounded-2xl p-4 border transition-all cursor-pointer h-48 flex flex-col justify-between shadow-xs hover:shadow-md ${isFree && !freeWithOpenAccount ? 'bg-white border-emerald-300/80 hover:border-emerald-500' : isFree ? 'bg-amber-50/60 border-amber-300 hover:border-amber-500' : isBill ? 'bg-purple-50/50 border-purple-300 hover:border-purple-500' : 'bg-sky-50/40 border-sky-300 hover:border-sky-500'}`}>
              <div className="flex items-start justify-between">
                <div><span className="text-xs text-stone-400 font-semibold block uppercase tracking-wider">Mesa</span><div className="text-2xl font-black font-serif text-stone-900">{String(table.numero).padStart(2, '0')}</div></div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isFree && !freeWithOpenAccount ? 'bg-emerald-100 text-emerald-800' : isFree ? 'bg-amber-100 text-amber-800' : isBill ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'}`}>{isFree ? 'Livre' : isBill ? 'Conta' : 'Ocupada'}</span>
              </div>
              {isFree ? (
                <div className="space-y-1">
                  <p className="text-xs text-stone-400 italic">Capacidade: {table.capacidade} pessoas</p>
                  {freeWithOpenAccount && account && <p className="text-[10px] text-amber-800 font-semibold">Conta {account.numero} em aberto • {formatCurrency(account.saldoRestante)}</p>}
                  {freeWithOpenAccount && account && <p className="text-[10px] text-stone-400">Selecionar no PDV continua esta conta</p>}
                  {!account && last && <p className="text-[10px] text-stone-400">Última conta: {last.numero} • {formatCurrency(last.total)}</p>}
                </div>
              ) : (
                <div className="space-y-1">
                  {table.clienteNome && <p className="text-xs font-bold text-stone-800 truncate">{table.clienteNome}</p>}
                  {account && <p className="text-[10px] text-slate-600 font-semibold">Conta {account.numero} • {account.status}</p>}
                  <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono"><Clock className="w-3 h-3" />{table.abertaEm ? formatDateTime(table.abertaEm) : 'Ocupação atual'}</div>
                  <div className="flex flex-wrap gap-1 pt-1">{own.map(o => <span key={o.id} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${o.status === 'finalizado' ? 'bg-stone-200 text-stone-600' : o.status === 'pronto' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>{orderLabel(o)}</span>)}</div>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                {isFree && !account ? <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" />Ocupar Mesa</span> : <><span className="text-[10px] text-stone-500 font-semibold">Restante</span><span className="text-sm font-bold font-mono">{formatCurrency(total)}</span></>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]" role="dialog" aria-modal="true">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-serif font-black text-xl">{selectedTable.numero}</div>
                <div>
                  <h3 className="font-bold text-base font-serif">Mesa {selectedTable.numero}{selectedTable.clienteNome ? ` • ${selectedTable.clienteNome}` : ''}</h3>
                  <div className="text-xs text-slate-400">
                    {selectedAccount ? `Conta ${selectedAccount.numero} • ${selectedAccount.status}` : 'Sem conta associada'}
                    {selectedTable.abertaEm ? ` • Aberta ${formatDateTime(selectedTable.abertaEm)}` : ''}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedTableNumber(null)} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {!selectedAccount ? (
                <div className="space-y-4">
                  {(() => {
                    const history = historyOf(selectedTable.numero);
                    return history.length ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico da mesa</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {history.map(a => <span key={a.id} className={`px-2 py-1 rounded-md text-[10px] font-bold ${a.status === 'encerrada' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>Conta {a.numero} • {a.status}</span>)}
                        </div>
                      </div>
                    ) : null;
                  })()}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                    Esta mesa está livre e sem conta em aberto. Ao ocupar, será criada uma <strong>nova conta</strong> e o próximo código de lançamento será <strong>{(accounts.filter(a => a.mesaOriginalNumero === selectedTable.numero || a.mesaAtualNumero === selectedTable.numero).reduce((max, a) => Math.max(max, a.numero), -1) + 1)}.1</strong>.
                  </div>
                  <input type="text" id="modal-open-table-name-input" value={newTableClientName} onChange={e => setNewTableClientName(e.target.value)} placeholder="Cliente / família (opcional)" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
                  <button type="button" id="modal-confirm-open-table-btn" onClick={() => handleOpenTableClick(selectedTable.numero)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2"><Utensils className="w-4 h-4" />Abrir Conta &amp; Montar Pedido no PDV</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    O espelho do último lançamento libera a mesa. Esta conta tem {selectedAccountOrders.length} lançamento(s) e {formatCurrency(selectedAccount.saldoRestante)} em aberto.
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between"><div><h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lançamentos da conta</h4><p className="text-[10px] text-slate-500">Nenhum lançamento é apagado ao encerrar a conta.</p></div><span className="text-xs font-bold text-slate-500">{selectedAccountOrders.length} lançamentos</span></div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {selectedAccountOrders.map(order => (
                        <div key={order.id} className={`p-3 ${order.status === 'finalizado' ? 'bg-slate-50' : ''}`}>
                          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${order.status === 'finalizado' ? 'bg-slate-400' : order.status === 'pronto' ? 'bg-emerald-500' : 'bg-sky-500'}`} /><strong className="text-sm font-mono">{orderLabel(order)}</strong><span className="text-[10px] text-slate-500">#{order.numero}</span></div><span className="font-mono font-bold text-sm">{formatCurrency(order.total)}</span></div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500"><span>{order.itens.reduce((s, i) => s + i.quantidade, 0)} itens • {order.status}</span><span>{order.saldoRestante > 0 ? `Restante ${formatCurrency(order.saldoRestante)}` : 'Pago'}</span></div>
                          {order.itens.length > 0 && <div className="mt-2 text-[10px] text-slate-600 truncate">{order.itens.map(i => `${i.quantidade}x ${i.nome}`).join(' • ')}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><div className="text-[10px] text-slate-500">Total</div><div className="font-mono font-black">{formatCurrency(tableTotal)}</div></div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200"><div className="text-[10px] text-emerald-700">Pago</div><div className="font-mono font-black text-emerald-800">{formatCurrency(paidTotal)}</div></div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-200"><div className="text-[10px] text-sky-700">Restante</div><div className="font-mono font-black text-blue-900">{formatCurrency(remainingTotal)}</div></div>
                  </div>

                  <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-200 space-y-2">
                    <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-800 flex items-center gap-1"><Divide className="w-3.5 h-3.5" />Divisão da conta</span><div className="flex items-center gap-2"><button type="button" onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="w-6 h-6 bg-white border border-sky-300 rounded font-bold">-</button><span className="font-bold font-mono w-4 text-center">{splitCount}</span><button type="button" onClick={() => setSplitCount(splitCount + 1)} className="w-6 h-6 bg-white border border-sky-300 rounded font-bold">+</button></div></div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-200/60"><span className="text-slate-600">Valor por pessoa:</span><span className="font-bold font-mono text-blue-900">{formatCurrency(splitAmount)}</span></div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><MoveRight className="w-3.5 h-3.5" />Transferir conta para outra mesa</div>
                    <div className="flex items-center gap-2">
                      <select value={transferTarget} onChange={e => setTransferTarget(e.target.value === '' ? '' : Number(e.target.value))} className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                        <option value="">Selecione a mesa de destino…</option>
                        {freeTables.map(t => <option key={t.numero} value={t.numero}>Mesa {t.numero}</option>)}
                      </select>
                      <button type="button" id="table-transfer-btn" disabled={transferTarget === ''} onClick={() => { transferTable(selectedTable.numero, Number(transferTarget)); setTransferTarget(''); }} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-40">Transferir</button>
                    </div>
                    <p className="text-[10px] text-slate-500">A conta e os lançamentos continuam os mesmos; apenas a ocupação física muda.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedTable.status === 'ocupada' ? <button type="button" id="table-request-bill-btn" onClick={() => requestTableBill(selectedTable.numero)} className="flex-1 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-300 flex items-center justify-center gap-1.5"><Receipt className="w-3.5 h-3.5" />Marcar como "Pedindo Conta"</button> : <div className="flex-1 py-2 bg-purple-50 text-purple-800 text-xs font-semibold rounded-xl border border-purple-200 text-center">Mesa aguardando baixa manual</div>}
                    <button type="button" id="table-free-manual-btn" onClick={() => { if (confirm(`Deseja realmente desocupar a Mesa ${selectedTable.numero} sem registrar pagamento? A Conta ${selectedAccount.numero} e seu histórico serão mantidos.`)) { freeTableManually(selectedTable.numero); setSelectedTableNumber(null); } }} className="py-2 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold">Liberar Mesa</button>
                  </div>
                </>
              )}
            </div>

            {selectedAccount && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button type="button" id="table-add-more-items-btn" onClick={() => { setSelectedTableNumber(null); setActiveModule('pdv'); }} className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"><PlusCircle className="w-3.5 h-3.5 text-blue-600" />Novo Lançamento na Conta</button>
                <button type="button" id="table-split-account-btn" disabled={remainingTotal <= 0 || splitCount < 2} onClick={() => { setPaymentTargetAmount(Math.min(splitAmount, remainingTotal)); setIsPaymentOpen(true); }} className="w-full sm:w-auto px-4 py-2.5 bg-sky-100 hover:bg-sky-200 disabled:opacity-40 text-blue-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2"><Divide className="w-4 h-4"/>Pagar 1 parte • {formatCurrency(Math.min(splitAmount, remainingTotal))}</button>
                <button type="button" id="table-settle-account-btn" disabled={remainingTotal <= 0} onClick={() => { setPaymentTargetAmount(undefined); setIsPaymentOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"><DollarSign className="w-4 h-4" />Dar Baixa • {formatCurrency(remainingTotal)}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <PaymentModal isOpen={isPaymentOpen} total={Math.min(paymentTargetAmount ?? remainingTotal, remainingTotal)} onClose={() => setIsPaymentOpen(false)} onConfirm={handleSettleConfirm} onReceiptTrigger={order => setSelectedReceiptOrder(order)} />
      <ReceiptModal order={selectedReceiptOrder} isOpen={!!selectedReceiptOrder} onClose={() => setSelectedReceiptOrder(null)} />
    </div>
  );
};
