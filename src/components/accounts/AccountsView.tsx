import React, { useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Account, AccountStatus, PaymentMethod } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { PaymentModal } from '../pdv/PaymentModal';
import { ReceiptModal } from '../pdv/ReceiptModal';
import { FileText, Search, X, MoveRight, Check, Lock, Layers, Users, PlusCircle, CircleAlert } from 'lucide-react';

const STATUS_STYLE: Record<AccountStatus, string> = {
  aberta: 'bg-sky-100 text-sky-800',
  paga: 'bg-emerald-100 text-emerald-800',
  encerrada: 'bg-slate-200 text-slate-700'
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  aberta: 'Aberta',
  paga: 'Paga',
  encerrada: 'Encerrada'
};

const orderLabel = (codigo?: string, numero?: number) => codigo || (numero !== undefined ? `#${numero}` : '—');

/**
 * Rótulo da relação conta × mesa.
 * occupied: a conta está ocupando a mesa agora.
 * liberada: o espelho liberou a mesa, mas o histórico (mesaOriginal) segue —
 *           o operador ainda pode "Continuar Conta X" nesta mesa.
 */
const accountTableLabel = (account: Account): string => {
  if (account.mesaAtualNumero !== undefined) return `Mesa ${account.mesaAtualNumero}`;
  if (account.mesaOriginalNumero !== undefined) return `Mesa ${account.mesaOriginalNumero} • liberada`;
  return 'Sem mesa';
};

export const AccountsView: React.FC = () => {
  const {
    accounts, tables, getAccount, getAccountOrders, searchAccounts, payAccount, closeAccount,
    transferAccount, mergeAccounts, setActiveModule, selectedReceiptOrder, setSelectedReceiptOrder,
  } = useRestaurant();

  const [texto, setTexto] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'todas'>('todas');
  const [somenteComSaldo, setSomenteComSaldo] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<number | ''>('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTargetAmount, setPaymentTargetAmount] = useState<number | undefined>(undefined);
  const [closeReason, setCloseReason] = useState('');
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [error, setError] = useState('');

  const results = useMemo(
    () => searchAccounts({ texto, status: statusFilter, somenteComSaldo }),
    [accounts, texto, statusFilter, somenteComSaldo, searchAccounts]
  );

  const selectedAccount = selectedAccountId ? getAccount(selectedAccountId) : undefined;
  const selectedOrders = useMemo(
    () => (selectedAccount ? getAccountOrders(selectedAccount.id) : []),
    [selectedAccountId, accounts, selectedAccount]
  );

  const totals = useMemo(() => ({
    abertas: accounts.filter(a => a.status === 'aberta').length,
    aReceber: accounts.reduce((sum, a) => sum + (a.status === 'encerrada' ? 0 : a.saldoRestante), 0)
  }), [accounts]);

  const accountMesas = useMemo(() => tables.map(t => t.numero).sort((a, b) => a - b), [tables]);

  const run = (action: () => void) => {
    try {
      setError('');
      action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a operação.');
    }
  };

  const handleSettleConfirm = (method: PaymentMethod, amountPaid?: number, change?: number) => {
    if (!selectedAccount) throw new Error('Nenhuma conta selecionada.');
    const valor = paymentTargetAmount ?? amountPaid;
    payAccount(
      selectedAccount.id,
      method,
      valor,
      method === 'dinheiro' && change !== undefined ? (valor ?? 0) + change : undefined
    );
    setIsPaymentOpen(false);
    setPaymentTargetAmount(undefined);
    const refreshed = getAccount(selectedAccount.id);
    const lastOrder = getAccountOrders(selectedAccount.id).slice(-1)[0];
    if (lastOrder) setSelectedReceiptOrder(lastOrder);
    return refreshed || selectedAccount;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600" />Contas &amp; Checks</h2>
          <p className="text-xs text-slate-500">Cada conta é um atendimento financeiro independente da mesa. Lançamentos: <strong>0.1</strong>, <strong>0.2</strong>, <strong>0.3</strong>…</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg font-semibold">{totals.abertas} conta(s) aberta(s)</span>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold">A receber {formatCurrency(totals.aReceber)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="accounts-search-input"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Buscar por nº conta, lançamento, mesa ou cliente…"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AccountStatus | 'todas')} className="px-3 py-2 border border-slate-300 rounded-xl text-sm">
          <option value="todas">Todos os status</option>
          <option value="aberta">Abertas</option>
          <option value="paga">Pagas</option>
          <option value="encerrada">Encerradas</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={somenteComSaldo} onChange={e => setSomenteComSaldo(e.target.checked)} className="accent-blue-600" />
          Somente com saldo
        </label>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold"><CircleAlert className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {results.map(account => {
          const isSelected = account.id === selectedAccountId;
          return (
            <button
              type="button"
              key={account.id}
              id={`account-card-${account.numero}`}
              onClick={() => { setSelectedAccountId(account.id); setError(''); setTransferTarget(''); setCloseReason(''); }}
              className={`text-left rounded-2xl border p-4 transition-all shadow-xs hover:shadow-md ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-black font-serif text-slate-900">Conta {account.numero}</div>
                  <div className="text-[11px] text-slate-500">
                    {account.nomeCliente || 'Sem nome'} • {accountTableLabel(account)}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLE[account.status]}`}>{STATUS_LABEL[account.status]}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg py-1.5"><div className="text-[9px] uppercase text-slate-500">Lançamentos</div><div className="font-mono font-bold text-sm">{getAccountOrders(account.id).filter(o => o.status !== 'cancelado').length}</div></div>
                <div className="bg-slate-50 rounded-lg py-1.5"><div className="text-[9px] uppercase text-slate-500">Total</div><div className="font-mono font-bold text-sm">{formatCurrency(account.total)}</div></div>
                <div className={`rounded-lg py-1.5 ${account.saldoRestante > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}><div className="text-[9px] uppercase text-slate-500">Saldo</div><div className={`font-mono font-bold text-sm ${account.saldoRestante > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{formatCurrency(account.saldoRestante)}</div></div>
              </div>
            </button>
          );
        })}
        {!results.length && <div className="col-span-full py-10 text-center text-sm text-slate-400">Nenhuma conta encontrada para os filtros informados.</div>}
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]" role="dialog" aria-modal="true">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif">Conta {selectedAccount.numero}</h3>
                <div className="text-xs text-slate-400">
                  {selectedAccount.nomeCliente || 'Sem nome'} • {accountTableLabel(selectedAccount)} • {STATUS_LABEL[selectedAccount.status]}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedAccountId(null)} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><div className="text-[10px] text-slate-500">Total</div><div className="font-mono font-black">{formatCurrency(selectedAccount.total)}</div></div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200"><div className="text-[10px] text-emerald-700">Pago</div><div className="font-mono font-black text-emerald-800">{formatCurrency(selectedAccount.valorPago)}</div></div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200"><div className="text-[10px] text-sky-700">Saldo</div><div className="font-mono font-black text-blue-900">{formatCurrency(selectedAccount.saldoRestante)}</div></div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">Lançamentos da conta</div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {selectedOrders.map(order => (
                    <div key={order.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${order.status === 'cancelado' ? 'bg-rose-50' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${order.status === 'cancelado' ? 'bg-rose-600' : order.status === 'finalizado' ? 'bg-slate-400' : order.status === 'pronto' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                        <strong className="text-sm font-mono">{orderLabel(order.codigoExibicao, order.numero)}</strong>
                        <span className="text-[10px] text-slate-500 truncate">{order.itens.reduce((s, i) => s + i.quantidade, 0)} itens</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm">{formatCurrency(order.total)}</div>
                        <div className="text-[10px] text-slate-500">{order.saldoRestante > 0 ? `Restante ${formatCurrency(order.saldoRestante)}` : 'Pago'}</div>
                      </div>
                    </div>
                  ))}
                  {!selectedOrders.length && <div className="px-4 py-6 text-center text-xs text-slate-400">Sem lançamentos nesta conta.</div>}
                </div>
              </div>

              {selectedAccount.status !== 'encerrada' && (selectedAccount.mesaAtualNumero !== undefined || selectedAccount.mesaOriginalNumero !== undefined) && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><MoveRight className="w-3.5 h-3.5" />Transferir conta</div>
                  <div className="flex items-center gap-2">
                    <select value={transferTarget} onChange={e => setTransferTarget(e.target.value === '' ? '' : Number(e.target.value))} className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                      <option value="">Selecione a mesa de destino…</option>
                      {accountMesas.filter(n => n !== selectedAccount.mesaAtualNumero).map(n => <option key={n} value={n}>Mesa {n}</option>)}
                    </select>
                    <button type="button" id="account-transfer-btn" disabled={transferTarget === ''} onClick={() => run(() => { transferAccount(selectedAccount.id, Number(transferTarget)); setTransferTarget(''); })} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-40">Transferir</button>
                  </div>
                </div>
              )}

              {selectedAccount.status === 'aberta' && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Unificar com outra conta aberta</div>
                  <div className="flex items-center gap-2">
                    <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                      <option value="">Selecione a conta de destino…</option>
                      {accounts.filter(a => a.id !== selectedAccount.id && a.status === 'aberta').map(a => <option key={a.id} value={a.id}>Conta {a.numero} • {a.nomeCliente || 'sem nome'}</option>)}
                    </select>
                    <button type="button" id="account-merge-btn" disabled={mergeTarget === ''} onClick={() => run(() => { mergeAccounts(selectedAccount.id, mergeTarget); setMergeTarget(''); })} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-40">Unificar</button>
                  </div>
                  <p className="text-[10px] text-slate-500">A conta de origem é encerrada com registro e nenhum lançamento é apagado.</p>
                </div>
              )}

              {selectedAccount.status !== 'encerrada' && selectedAccount.saldoRestante <= 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-emerald-900">Conta quitada. O encerramento é uma etapa separada.</div>
                  <input type="text" value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="Motivo do encerramento (opcional)" className="w-full px-2 py-1.5 border border-emerald-300 rounded-lg text-xs" />
                  <button type="button" id="account-close-btn" onClick={() => run(() => { closeAccount(selectedAccount.id, closeReason); setCloseReason(''); })} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"><Lock className="w-3.5 h-3.5" />Encerrar Conta {selectedAccount.numero}</button>
                </div>
              )}

              {selectedAccount.status === 'encerrada' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Conta encerrada por {selectedAccount.encerramento?.usuario || 'sistema'} em {selectedAccount.encerradaEm ? formatDateTime(selectedAccount.encerradaEm) : '—'}. Não aceita novos lançamentos.
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button type="button" id="account-open-pdv-btn" onClick={() => { setSelectedAccountId(null); setActiveModule('pdv'); }} className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"><PlusCircle className="w-3.5 h-3.5 text-blue-600" />Novo Lançamento</button>
              <button type="button" id="account-view-tables-btn" onClick={() => { setSelectedAccountId(null); setActiveModule('mesas'); }} className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-600" />Ver Mesas</button>
              <button
                type="button"
                id="account-settle-btn"
                disabled={selectedAccount.saldoRestante <= 0 || selectedAccount.status === 'encerrada'}
                onClick={() => { setPaymentTargetAmount(undefined); setIsPaymentOpen(true); }}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />Baixar Conta • {formatCurrency(selectedAccount.saldoRestante)}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAccount && (
        <PaymentModal
          isOpen={isPaymentOpen}
          total={Math.min(paymentTargetAmount ?? selectedAccount.saldoRestante, selectedAccount.saldoRestante)}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handleSettleConfirm}
          onReceiptTrigger={order => setSelectedReceiptOrder(order)}
        />
      )}
      <ReceiptModal order={selectedReceiptOrder} isOpen={!!selectedReceiptOrder} onClose={() => setSelectedReceiptOrder(null)} />
    </div>
  );
};
