import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { getPendingFinancialOrders } from '../../lib/turno';
import { Order, OrderStatus } from '../../types';
import { KitchenTicketPreviewModal } from './KitchenTicketPreviewModal';
import {
  Receipt,
  Search,
  Plus,
  DollarSign,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronRight,
  UtensilsCrossed,
  AlertTriangle,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const {
    orders,
    setSelectedOrderForModal,
    openPaymentModal,
    setActiveModule,
    generateOrderMirror,
    canStartPayment,
    turnoAtualId,
    cashRegister,
  } = useRestaurant();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [channelFilter, setChannelFilter] = useState<string>('todos');
  const [periodFilter, setPeriodFilter] = useState<string>('hoje');
  const [kitchenPreviewOrder, setKitchenPreviewOrder] = useState<Order | null>(null);

  // -----------------------------------------------------------------------
  // FILA OPERACIONAL DO TURNO ATUAL
  // -----------------------------------------------------------------------
  const caixaAberto = !!cashRegister?.aberto;
  const pendingOrders = useMemo(() => getPendingFinancialOrders(orders), [orders]);
  const operationalOrders = useMemo(() => {
    if (!caixaAberto) return [];
    return pendingOrders.filter(o => o.turnoId !== undefined && o.turnoId === turnoAtualId);
  }, [pendingOrders, caixaAberto, turnoAtualId]);

  const filteredOrders = useMemo(() => {
    const base = periodFilter === 'hoje' ? operationalOrders : orders;
    return base.filter(order => {
      const s = searchTerm.toLowerCase();
      const matchSearch =
        order.numero.toString().includes(s) ||
        (order.nomeCliente && order.nomeCliente.toLowerCase().includes(s)) ||
        (order.mesaNumero && order.mesaNumero.toString().includes(s)) ||
        order.itens.some(it => it.nome.toLowerCase().includes(s));
      if (!matchSearch) return false;
      if (statusFilter !== 'todos' && order.status !== statusFilter) return false;
      if (channelFilter !== 'todos' && order.canal.toLowerCase() !== channelFilter.toLowerCase()) return false;
      if (periodFilter === 'hoje') {
        const today = new Date().toISOString().split('T')[0];
        if (!order.criadoEm.startsWith(today)) return false;
      }
      return true;
    });
  }, [operationalOrders, orders, searchTerm, statusFilter, channelFilter, periodFilter]);

  const getStatusBadge = (st: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; color: string }> = {
      novo:       { label: 'Aguardando espelho', color: 'bg-sky-100 text-sky-800 border-sky-200' },
      pronto:     { label: 'Pronto',             color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      entregue:   { label: 'Entregue',           color: 'bg-blue-100 text-blue-800 border-blue-200' },
      finalizado: { label: 'Finalizado',         color: 'bg-stone-100 text-stone-700 border-stone-200' },
      cancelado:  { label: 'Cancelado',          color: 'bg-rose-100 text-rose-800 border-rose-200' },
    };
    const b = map[st];
    return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${b.color}`}>{b.label}</span>;
  };

  /**
   * Lida com o clique em "Cobrar".
   * Verifica canStartPayment antes de abrir o modal; exibe aviso amigável se
   * o espelho ainda não foi confirmado em vez de deixar o domínio lançar.
   */
  const handlePayClick = (order: Parameters<typeof openPaymentModal>[0]) => {
    const block = canStartPayment(order);
    if (block) {
      // Aviso sem alert() nativo — usa o próprio banner de erro do card
      // via estado local (ver renderização abaixo).
      setPayError({ orderId: order.id, msg: block });
      return;
    }
    setPayError(null);
    try {
      openPaymentModal(order);
    } catch (e: unknown) {
      setPayError({ orderId: order.id, msg: e instanceof Error ? e.message : 'Erro ao abrir pagamento.' });
    }
  };

  const [payError, setPayError] = useState<{ orderId: string; msg: string } | null>(null);

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

      {/* Caixa fechado */}
      {!caixaAberto && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="font-bold">Abra o caixa antes de vender.</span>
          <span className="font-normal">
            A fila operacional está suspensa até a abertura do caixa; o histórico permanece consultável em "Todo o histórico".
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="orders-search-input"
              type="text"
              placeholder="Buscar por número (#1001), cliente, mesa ou item..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            {[
              { id: 'todos',      label: 'Todos' },
              { id: 'novo',       label: 'Aguardando espelho' },
              { id: 'pronto',     label: 'Prontos' },
              { id: 'entregue',   label: 'Entregues' },
              { id: 'finalizado', label: 'Finalizados' },
              { id: 'cancelado',  label: 'Cancelados' },
            ].map(tab => (
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

        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-stone-400 font-medium">Canal:</span>
            <select
              id="select-channel-filter"
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
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
              onChange={e => setPeriodFilter(e.target.value)}
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

      {/* Grid de pedidos */}
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
          {filteredOrders.map(order => {
            const isPendingPayment =
              order.status === 'pronto' &&
              order.saldoRestante > 0 &&
              order.statusPagamento !== 'pago';

            // Espelho: mostra botão quando status='novo', tem lote e o último lote não foi confirmado
            const lastBatch = order.impressoes?.[order.impressoes.length - 1];
            const needsMirror =
              order.status === 'novo' &&
              !!lastBatch &&
              !lastBatch.mirrorConfirmed;

            // Bloqueio de pagamento (para avisar na UI antes do domínio lançar erro)
            const payBlock = canStartPayment(order);
            const hasPayError = payError?.orderId === order.id;

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
                {/* Alerta pagamento pendente */}
                {isPendingPayment && (
                  <div className="px-3.5 py-1.5 bg-rose-100/90 border-b border-rose-200 flex items-center justify-between text-[11px] font-bold text-rose-800">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Pagamento pendente — realizar baixa manual
                    </span>
                    <span className="font-mono text-rose-900 font-extrabold">{formatCurrency(order.saldoRestante)}</span>
                  </div>
                )}

                {/* Aviso espelho obrigatório para pagamento */}
                {hasPayError && payBlock && (
                  <div
                    id={`pay-block-warning-${order.id}`}
                    role="alert"
                    className="px-3.5 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center gap-1.5 text-[11px] font-semibold text-amber-900"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    {payBlock}
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

                {/* Itens */}
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

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total</span>
                      <span className="text-base font-extrabold text-slate-900">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Pagamento</span>
                      <span className={`text-xs font-bold ${order.statusPagamento === 'pago' ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {order.statusPagamento === 'pago' ? '✓ Pago' : `Falta ${formatCurrency(order.saldoRestante)}`}
                      </span>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                    <button
                      id={`open-details-${order.id}`}
                      onClick={() => setSelectedOrderForModal(order)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Ver Detalhes</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    </button>

                    <button
                      id={`preview-kitchen-${order.id}`}
                      onClick={() => setKitchenPreviewOrder(order)}
                      className="py-1.5 px-3 rounded-lg bg-orange-100 text-orange-900 border border-orange-300 hover:bg-orange-200 text-xs font-bold shadow-2xs"
                      title="Abrir a prévia da via da cozinha"
                    >
                      Cozinha
                    </button>

                    {/* BOTÃO ESPELHO — abre o diálogo de prévia/confirmação */}
                    {needsMirror && (
                      <button
                        id={`generate-mirror-${order.id}`}
                        onClick={() => {
                          try {
                            generateOrderMirror(order.id);
                          } catch (e: unknown) {
                            setPayError({
                              orderId: order.id,
                              msg: e instanceof Error ? e.message : 'Erro ao gerar espelho.',
                            });
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-2xs"
                        title="Abrir prévia do espelho e confirmar impressão"
                      >
                        Espelho
                      </button>
                    )}

                    {/* BOTÃO COBRAR — bloqueado se espelho pendente */}
                    <button
                      id={`pay-order-${order.id}`}
                      onClick={() => handlePayClick(order)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 ${
                        payBlock && order.saldoRestante > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                          : order.statusPagamento === 'pago'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                      title={payBlock && order.saldoRestante > 0 ? payBlock : undefined}
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

      <KitchenTicketPreviewModal
        order={kitchenPreviewOrder}
        onClose={() => setKitchenPreviewOrder(null)}
      />
    </div>
  );
};
