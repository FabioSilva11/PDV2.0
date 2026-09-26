import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { OrderStatus, OrderType } from '../../types';
import { 
  Receipt, 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  DollarSign, 
  Clock, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Layers,
  ChevronRight,
  UtensilsCrossed
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { 
    orders, 
    setSelectedOrderForModal, 
    openPaymentModal, 
    setSelectedReceiptOrder, 
    setActiveModule,
    generateOrderMirror
  } = useRestaurant();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [channelFilter, setChannelFilter] = useState<string>('todos');
  const [periodFilter, setPeriodFilter] = useState<string>('hoje');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        order.numero.toString().includes(searchLower) ||
        (order.nomeCliente && order.nomeCliente.toLowerCase().includes(searchLower)) ||
        (order.mesaNumero && order.mesaNumero.toString().includes(searchLower)) ||
        order.itens.some(it => it.nome.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;

      // Status
      if (statusFilter !== 'todos' && order.status !== statusFilter) return false;

      // Channel
      if (channelFilter !== 'todos' && order.canal.toLowerCase() !== channelFilter.toLowerCase()) return false;

      // Period (simplified for demo)
      if (periodFilter === 'hoje') {
        const today = new Date().toISOString().split('T')[0];
        if (!order.criadoEm.startsWith(today)) return false;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, channelFilter, periodFilter]);

  const getStatusBadge = (st: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; color: string }> = {
      novo: { label: 'Aguardando espelho', color: 'bg-sky-100 text-sky-800 border-sky-200' },
      pronto: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      entregue: { label: 'Entregue', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      finalizado: { label: 'Finalizado', color: 'bg-stone-100 text-stone-700 border-stone-200' },
      cancelado: { label: 'Cancelado', color: 'bg-rose-100 text-rose-800 border-rose-200' }
    };
    const b = map[st];
    return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${b.color}`}>{b.label}</span>;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Central de Pedidos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhamento em tempo real de pedidos de salão, balcão e delivery
          </p>
        </div>

        <button
          id="orders-view-new-order-btn"
          onClick={() => setActiveModule('pdv')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido (PDV)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="orders-search-input"
              type="text"
              placeholder="Buscar por número (#1001), cliente, mesa ou item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'novo', label: 'Aguardando espelho' },
              { id: 'pronto', label: 'Prontos' },
              { id: 'entregue', label: 'Entregues' },
              { id: 'finalizado', label: 'Finalizados' },
              { id: 'cancelado', label: 'Cancelados' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`status-filter-${tab.id}`}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-stone-400 font-medium">Canal:</span>
            <select
              id="select-channel-filter"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 font-medium focus:outline-none"
            >
              <option value="todos">Todos os canais</option>
              <option value="salão">Salão / Mesas</option>
              <option value="balcão">Balcão</option>
              <option value="delivery">Delivery</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            <span className="text-stone-400 font-medium ml-2">Período:</span>
            <select
              id="select-period-filter"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 font-medium focus:outline-none"
            >
              <option value="hoje">Hoje</option>
              <option value="todos">Todo o histórico</option>
            </select>
          </div>

          <div className="text-stone-500 font-semibold">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
          </div>
        </div>
      </div>

      {/* Orders Grid / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2 shadow-2xs">
          <Receipt className="w-12 h-12 mx-auto text-stone-300" />
          <h3 className="font-bold text-stone-700 text-base">Nenhum pedido localizado</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Experimente alterar os filtros acima ou registre um novo pedido pelo terminal PDV.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isPendingPayment = order.status === 'pronto' && order.saldoRestante > 0 && order.statusPagamento !== 'pago';
            return (
            <div
              key={order.id}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                order.prioridade === 'urgente'
                  ? 'border-rose-300 ring-1 ring-rose-400'
                  : isPendingPayment
                  ? 'border-rose-300 bg-rose-50/30 ring-1 ring-rose-200'
                  : order.status === 'novo'
                  ? 'border-sky-200'
                  : 'border-stone-200'
              }`}
            >
              {/* Alerta de baixa pendente */}
              {isPendingPayment && (
                <div className="px-3.5 py-1.5 bg-rose-100/90 border-b border-rose-200 flex items-center justify-between text-[11px] font-bold text-rose-800">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Pagamento pendente — realizar baixa manual
                  </span>
                  <span className="font-mono text-rose-900 font-extrabold">{formatCurrency(order.saldoRestante)}</span>
                </div>
              )}

              {/* Card Header */}
              <div className={`p-4 border-b border-stone-100 ${isPendingPayment ? 'bg-rose-50/40' : 'bg-stone-50/50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-stone-900 text-sm">
                      #{order.codigoExibicao || order.codigoMesa || order.numero}
                    </span>
                    {order.contaNumero !== undefined && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded">
                        CONTA {order.contaNumero}
                      </span>
                    )}
                    {getStatusBadge(order.status)}
                    {order.prioridade === 'urgente' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-500 text-white rounded flex items-center gap-0.5 animate-pulse">
                        <Flame className="w-2.5 h-2.5" />
                        Urgente
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {new Date(order.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs gap-2">
                  <div className="font-bold text-stone-800 truncate">
                    {order.nomeCliente || 'Cliente Balcão'}
                  </div>
                  {order.mesaNumero ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-2xs border border-blue-700 shrink-0">
                      <UtensilsCrossed className="w-3 h-3" />
                      MESA {order.mesaNumero}
                    </span>
                  ) : (
                    <div className="font-semibold text-stone-500 text-[11px] bg-stone-200/60 px-2 py-0.5 rounded-full shrink-0">
                      {order.canal}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List Preview */}
              <div className="p-4 flex-1 space-y-1.5">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Itens ({order.itens.reduce((a, b) => a + b.quantidade, 0)})
                </div>
                <div className="space-y-1">
                  {order.itens.slice(0, 3).map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-stone-700">
                      <span className="truncate pr-2">
                        <strong className="text-stone-900 font-semibold">{it.quantidade}x</strong> {it.nome}
                      </span>
                      <span className="text-stone-500 shrink-0 font-mono">
                        {formatCurrency(it.precoUnitario * it.quantidade)}
                      </span>
                    </div>
                  ))}
                  {order.itens.length > 3 && (
                    <div className="text-[11px] text-sky-700 font-semibold pt-0.5">
                      + {order.itens.length - 3} outros itens...
                    </div>
                  )}
                </div>

                {order.observacoesGerais && (
                  <div className="p-2 rounded-lg bg-sky-50 border border-sky-100 text-[11px] text-sky-900 italic mt-2">
                    Obs: {order.observacoesGerais}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total</span>
                    <span className="text-base font-extrabold text-slate-900">{formatCurrency(order.total)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Pagamento</span>
                    <span className={`text-xs font-bold ${
                      order.statusPagamento === 'pago' ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      {order.statusPagamento === 'pago' ? '✓ Pago' : `Falta ${formatCurrency(order.saldoRestante)}`}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                  <button
                    id={`open-details-${order.id}`}
                    onClick={() => setSelectedOrderForModal(order)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Ver Detalhes</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                  </button>

                  {order.status === 'novo' && order.impressoes?.length && !order.impressoes[order.impressoes.length - 1].espelhoJobId ? (
                    <button
                      id={`generate-mirror-${order.id}`}
                      onClick={() => generateOrderMirror(order.id)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-2xs"
                      title="Gerar espelho e marcar pedido como pronto"
                    >
                      Espelho
                    </button>
                  ) : null}

                  <button
                    id={`print-thermal-${order.id}`}
                    onClick={() => setSelectedReceiptOrder(order)}
                    className="p-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 shadow-2xs transition-colors"
                    title="Imprimir Comprovante Térmico"
                  >
                    <Printer className="w-4 h-4 text-stone-500" />
                  </button>

                  <button
                    id={`pay-order-${order.id}`}
                    onClick={() => openPaymentModal(order)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 ${
                      order.statusPagamento === 'pago'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{order.statusPagamento === 'pago' ? 'Pagamentos' : 'Cobrar'}</span>
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
