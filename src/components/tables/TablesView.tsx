import React, { useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table, Order, PaymentMethod } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { PaymentModal } from '../pdv/PaymentModal';
import { ReceiptModal } from '../pdv/ReceiptModal';
import { Users, Clock, Receipt, PlusCircle, DollarSign, X, Divide, Utensils, CheckCircle, CircleAlert } from 'lucide-react';

const orderLabel = (order: Order) => order.codigoMesa || (order.mesaSessaoNumero !== undefined && order.mesaPedidoSequencia !== undefined ? `${order.mesaSessaoNumero}.${order.mesaPedidoSequencia}` : `#${order.numero}`);

export const TablesView: React.FC = () => {
  const {
    tables, orders, openTableWithOrder, requestTableBill, settleTableAccount,
    freeTableManually, setActiveModule, selectedReceiptOrder, setSelectedReceiptOrder,
  } = useRestaurant();

  const [filter, setFilter] = useState<'todas' | 'livres' | 'ocupadas' | 'conta'>('todas');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTargetAmount, setPaymentTargetAmount] = useState<number | undefined>(undefined);
  const [newTableClientName, setNewTableClientName] = useState('');

  const selectedSessionOrders = useMemo(() => {
    if (!selectedTable?.sessaoAtivaId) return [];
    return orders
      .filter(o => o.tipo === 'mesa' && o.mesaSessaoId === selectedTable.sessaoAtivaId)
      .sort((a, b) => (a.mesaPedidoSequencia ?? 0) - (b.mesaPedidoSequencia ?? 0));
  }, [orders, selectedTable]);

  const activeSessionOrders = (table: Table) => table.sessaoAtivaId
    ? orders.filter(o => o.tipo === 'mesa' && o.mesaSessaoId === table.sessaoAtivaId)
      .sort((a, b) => (a.mesaPedidoSequencia ?? 0) - (b.mesaPedidoSequencia ?? 0))
    : [];

  const tableTotal = selectedSessionOrders.reduce((sum, o) => sum + (o.status === 'cancelado' ? 0 : o.total), 0);
  const paidTotal = selectedSessionOrders.reduce((sum, o) => sum + (o.status === 'cancelado' ? 0 : o.valorTotalPago), 0);
  const remainingTotal = selectedSessionOrders.reduce((sum, o) => sum + (o.status === 'cancelado' ? 0 : o.saldoRestante), 0);
  const splitAmount = splitCount > 0 ? remainingTotal / splitCount : remainingTotal;

  const filteredTables = tables.filter(t => filter === 'todas' || t.status === filter || (filter === 'ocupadas' && t.status === 'fechando'));

  const handleOpenTableClick = (tableNumber: number) => {
    openTableWithOrder(tableNumber, newTableClientName.trim() || `Mesa ${tableNumber}`);
    setNewTableClientName('');
    setSelectedTable(null);
    setActiveModule('pdv');
  };

  const handleSettleConfirm = (method: PaymentMethod, amountPaid?: number, change?: number) => {
    if (!selectedTable) throw new Error('Nenhuma mesa selecionada.');
    const result = settleTableAccount(selectedTable.numero, method, paymentTargetAmount ?? amountPaid, change);
    setIsPaymentOpen(false);
    setPaymentTargetAmount(undefined);
    if (result) setSelectedReceiptOrder(result);
    setSelectedTable(null);
    return result!;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Mapa de Mesas & Salão</h2>
          <p className="text-xs text-slate-500">Cada mesa mantém uma sessão e vários pedidos sequenciais. Ex.: 1.0, 1.1, 1.2.</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
          {(['todas', 'livres', 'ocupadas', 'conta'] as const).map(value => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg ${filter === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {value === 'todas' ? `Todas (${tables.length})` : value === 'livres' ? `Livres (${tables.filter(t => t.status === 'livre').length})` : value === 'ocupadas' ? `Ocupadas (${tables.filter(t => t.status === 'ocupada').length})` : `Pedindo Conta (${tables.filter(t => t.status === 'conta').length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map(table => {
          const sessionOrders = activeSessionOrders(table);
          const activeOrders = sessionOrders.filter(o => o.status !== 'cancelado' && o.saldoRestante > 0);
          const total = activeOrders.reduce((sum, o) => sum + o.saldoRestante, 0);
          const isFree = table.status === 'livre';
          const isBill = table.status === 'conta';
          return (
            <div key={table.numero} id={`table-card-${table.numero}`} onClick={() => setSelectedTable(table)} className={`rounded-2xl p-4 border transition-all cursor-pointer h-48 flex flex-col justify-between shadow-xs hover:shadow-md ${isFree ? 'bg-white border-emerald-300/80 hover:border-emerald-500' : isBill ? 'bg-purple-50/50 border-purple-300 hover:border-purple-500' : 'bg-sky-50/40 border-sky-300 hover:border-sky-500'}`}>
              <div className="flex items-start justify-between">
                <div><span className="text-xs text-stone-400 font-semibold block uppercase tracking-wider">Mesa</span><div className="text-2xl font-black font-serif text-stone-900">{String(table.numero).padStart(2, '0')}</div></div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isFree ? 'bg-emerald-100 text-emerald-800' : isBill ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'}`}>{isFree ? 'Livre' : isBill ? 'Conta' : 'Ocupada'}</span>
              </div>
              {isFree ? <div className="space-y-1"><p className="text-xs text-stone-400 italic">Capacidade: {table.capacidade} pessoas</p>{(() => { const last = orders.filter(o => o.tipo === 'mesa' && o.mesaNumero === table.numero && o.mesaSessaoNumero !== undefined).sort((a,b) => (Number(b.mesaSessaoNumero) - Number(a.mesaSessaoNumero)) || ((b.mesaPedidoSequencia ?? 0) - (a.mesaPedidoSequencia ?? 0)))[0]; return last ? <p className="text-[10px] text-stone-400">Última sessão: {last.mesaSessaoNumero} • {last.codigoMesa || last.numero}</p> : null; })()}</div> : <div className="space-y-1">
                {table.clienteNome && <p className="text-xs font-bold text-stone-800 truncate">{table.clienteNome}</p>}
                <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono"><Clock className="w-3 h-3" />{table.abertaEm ? formatDateTime(table.abertaEm) : 'Sessão aberta'}</div>
                <div className="flex flex-wrap gap-1 pt-1">{sessionOrders.map(o => <span key={o.id} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${o.status === 'cancelado' ? 'bg-rose-100 text-rose-700' : o.status === 'finalizado' ? 'bg-stone-200 text-stone-600' : o.status === 'pronto' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>{orderLabel(o)}</span>)}</div>
              </div>}
              <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                {isFree ? <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" />Ocupar Mesa</span> : <><span className="text-[10px] text-stone-500 font-semibold">Restante</span><span className="text-sm font-bold font-mono">{formatCurrency(total)}</span></>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]" role="dialog" aria-modal="true">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-serif font-black text-xl">{selectedTable.numero}</div><div><h3 className="font-bold text-base font-serif">Mesa {selectedTable.numero}{selectedTable.clienteNome ? ` • ${selectedTable.clienteNome}` : ''}</h3><div className="text-xs text-slate-400">{selectedTable.sessaoNumero ? `Sessão ${selectedTable.sessaoNumero}` : 'Sem sessão ativa'}{selectedTable.abertaEm ? ` • Aberta ${formatDateTime(selectedTable.abertaEm)}` : ''}</div></div></div>
              <button type="button" onClick={() => setSelectedTable(null)} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {selectedTable.status === 'livre' ? (
                <div className="space-y-4">
                  {(() => { const historical = orders.filter(o => o.tipo === 'mesa' && o.mesaNumero === selectedTable.numero && o.mesaSessaoNumero !== undefined).sort((a,b) => (Number(a.mesaSessaoNumero) - Number(b.mesaSessaoNumero)) || ((a.mesaPedidoSequencia ?? 0) - (b.mesaPedidoSequencia ?? 0))); return historical.length ? <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl"><div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico da mesa</div><div className="mt-2 flex flex-wrap gap-1.5">{historical.map(o => <span key={o.id} className={`px-2 py-1 rounded-md text-[10px] font-bold ${o.status === 'cancelado' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{o.codigoMesa || o.numero}</span>)}</div></div> : null; })()}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">Esta mesa está livre. Ao abrir, a próxima sessão receberá um novo número e o primeiro pedido será <strong>{Math.max(0, ...orders.filter(o => o.tipo === 'mesa' && o.mesaNumero === selectedTable.numero && o.mesaSessaoNumero !== undefined).map(o => Number(o.mesaSessaoNumero))) + 1}.0</strong>.</div>
                  <input type="text" id="modal-open-table-name-input" value={newTableClientName} onChange={e => setNewTableClientName(e.target.value)} placeholder="Cliente / família (opcional)" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm" />
                  <button type="button" id="modal-confirm-open-table-btn" onClick={() => handleOpenTableClick(selectedTable.numero)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2"><Utensils className="w-4 h-4" />Abrir Mesa & Montar Pedido no PDV</button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between"><div><h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Histórico da sessão</h4><p className="text-[10px] text-slate-500">Os pedidos anteriores continuam aqui até a sessão ser encerrada.</p></div><span className="text-xs font-bold text-slate-500">{selectedSessionOrders.length} pedidos</span></div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {selectedSessionOrders.map(order => (
                        <div key={order.id} className={`p-3 ${order.status === 'cancelado' ? 'bg-rose-50' : order.status === 'finalizado' ? 'bg-slate-50' : ''}`}>
                          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${order.status === 'cancelado' ? 'bg-rose-600' : order.status === 'finalizado' ? 'bg-slate-400' : order.status === 'pronto' ? 'bg-emerald-500' : 'bg-sky-500'}`} /><strong className="text-sm font-mono">{orderLabel(order)}</strong><span className="text-[10px] text-slate-500">#{order.numero}</span></div><span className="font-mono font-bold text-sm">{formatCurrency(order.total)}</span></div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500"><span>{order.itens.reduce((s, i) => s + i.quantidade, 0)} itens • {order.status}</span><span>{order.saldoRestante > 0 ? `Restante ${formatCurrency(order.saldoRestante)}` : 'Pago'}</span></div>
                          {order.status !== 'cancelado' && order.itens.length > 0 && <div className="mt-2 text-[10px] text-slate-600 truncate">{order.itens.map(i => `${i.quantidade}x ${i.nome}`).join(' • ')}</div>}
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

                  <div className="flex items-center gap-2">
                    {selectedTable.status === 'ocupada' ? <button type="button" id="table-request-bill-btn" onClick={() => { requestTableBill(selectedTable.numero); setSelectedTable({ ...selectedTable, status: 'conta' }); }} className="flex-1 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-300 flex items-center justify-center gap-1.5"><Receipt className="w-3.5 h-3.5" />Marcar como "Pedindo Conta"</button> : <div className="flex-1 py-2 bg-purple-50 text-purple-800 text-xs font-semibold rounded-xl border border-purple-200 text-center">Mesa aguardando baixa manual</div>}
                    <button type="button" id="table-free-manual-btn" onClick={() => { if (confirm(`Deseja realmente desocupar a Mesa ${selectedTable.numero} sem registrar pagamento?`)) { freeTableManually(selectedTable.numero); setSelectedTable(null); } }} className="py-2 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold">Liberar Mesa</button>
                  </div>
                </>
              )}
            </div>

            {selectedTable.status !== 'livre' && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button type="button" id="table-add-more-items-btn" onClick={() => { setSelectedTable(null); setActiveModule('pdv'); }} className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"><PlusCircle className="w-3.5 h-3.5 text-blue-600" />Novo Pedido na Mesa</button>
                <button type="button" id="table-split-account-btn" disabled={remainingTotal <= 0 || splitCount < 2} onClick={() => { setPaymentTargetAmount(Math.min(splitAmount, remainingTotal)); setIsPaymentOpen(true); }} className="w-full sm:w-auto px-4 py-2.5 bg-sky-100 hover:bg-sky-200 disabled:opacity-40 text-blue-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2"><Divide className="w-4 h-4"/>Pagar 1 parte • {formatCurrency(Math.min(splitAmount, remainingTotal))}</button>
                <button type="button" id="table-settle-account-btn" disabled={remainingTotal <= 0} onClick={() => { setPaymentTargetAmount(undefined); setIsPaymentOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"><DollarSign className="w-4 h-4" />Dar Baixa Manual • {formatCurrency(remainingTotal)}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <PaymentModal isOpen={isPaymentOpen} total={remainingTotal} onClose={() => setIsPaymentOpen(false)} onConfirm={handleSettleConfirm} onReceiptTrigger={order => setSelectedReceiptOrder(order)} />
      <ReceiptModal order={selectedReceiptOrder} isOpen={!!selectedReceiptOrder} onClose={() => setSelectedReceiptOrder(null)} />
    </div>
  );
};
