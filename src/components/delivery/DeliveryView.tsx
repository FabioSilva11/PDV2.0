import React, { useMemo, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Order, OrderStatus } from '../../types';
import {
  Bike,
  Search,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Plus,
  Send,
  PackageCheck,
  UserRoundCheck
} from 'lucide-react';

type DeliveryFilter = 'todos' | 'fila' | 'pronto' | 'em_entrega' | 'entregues';

const FILTERS: Array<{ id: DeliveryFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'fila', label: 'Na fila' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'em_entrega', label: 'Em entrega' },
  { id: 'entregues', label: 'Entregues' }
];

const getStatusMeta = (status: OrderStatus) => {
  const meta: Partial<Record<OrderStatus, { label: string; className: string }>> = {
    novo: { label: 'Novo', className: 'bg-sky-100 text-sky-800 border-sky-200' },
    confirmado: { label: 'Confirmado', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    pendente: { label: 'Aguardando preparo', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    em_preparacao: { label: 'Em preparo', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    preparando: { label: 'Em preparo', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    pronto: { label: 'Pronto para despacho', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    saiu_entrega: { label: 'Em entrega', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    entregue: { label: 'Entregue', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    finalizado: { label: 'Finalizado', className: 'bg-stone-100 text-stone-700 border-stone-200' },
    cancelado: { label: 'Cancelado', className: 'bg-rose-100 text-rose-800 border-rose-200' }
  };
  return meta[status] || { label: status, className: 'bg-stone-100 text-stone-700 border-stone-200' };
};

const matchesFilter = (order: Order, filter: DeliveryFilter) => {
  if (filter === 'todos') return true;
  if (filter === 'fila') return ['novo', 'confirmado', 'pendente', 'em_preparacao', 'preparando'].includes(order.status);
  if (filter === 'pronto') return order.status === 'pronto';
  if (filter === 'em_entrega') return order.status === 'saiu_entrega';
  return order.status === 'entregue' || order.status === 'finalizado';
};

export const DeliveryView: React.FC = () => {
  const {
    orders,
    couriers,
    setSelectedOrderForModal,
    openPaymentModal,
    setActiveModule,
    assignCourierToOrder,
    completeDeliveryOrder
  } = useRestaurant();
  const [activeStatus, setActiveStatus] = useState<DeliveryFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourierByOrder, setSelectedCourierByOrder] = useState<Record<string, string>>({});

  const deliveryOrders = useMemo(
    () => orders.filter(order => order.tipo === 'delivery' && order.status !== 'cancelado'),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return deliveryOrders.filter(order => {
      if (!matchesFilter(order, activeStatus)) return false;
      if (!normalizedSearch) return true;

      const address = order.enderecoEntrega
        ? `${order.enderecoEntrega.logradouro} ${order.enderecoEntrega.numero} ${order.enderecoEntrega.bairro}`
        : '';
      const searchableText = [
        String(order.numero),
        order.nomeCliente,
        order.telefoneCliente,
        order.entregadorNome,
        address,
        ...order.itens.map(item => item.nome)
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [activeStatus, deliveryOrders, searchTerm]);

  const getFilterCount = (filter: DeliveryFilter) => deliveryOrders.filter(order => matchesFilter(order, filter)).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Bike className="w-6 h-6 text-amber-600" />
            Expedição de Delivery & Entregadores
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Acompanhe o pedido desde a cozinha até a confirmação da entrega
          </p>
        </div>

        <button
          id="new-delivery-order-btn"
          onClick={() => setActiveModule('pdv')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Delivery (PDV)
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Na fila', count: getFilterCount('fila'), color: 'text-amber-700', icon: Clock },
          { label: 'Prontos', count: getFilterCount('pronto'), color: 'text-emerald-700', icon: PackageCheck },
          { label: 'Em entrega', count: getFilterCount('em_entrega'), color: 'text-purple-700', icon: Bike },
          { label: 'Entregues', count: getFilterCount('entregues'), color: 'text-blue-700', icon: CheckCircle2 }
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-stone-200 p-3 shadow-2xs">
            <div className={`flex items-center gap-2 text-xs font-bold ${color}`}>
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <div className="text-2xl font-black text-stone-900 mt-1">{count}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="delivery-search-input"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por pedido, cliente, telefone, endereço ou entregador..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              id={`delivery-filter-${filter.id}`}
              type="button"
              onClick={() => setActiveStatus(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeStatus === filter.id ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {filter.label} ({getFilterCount(filter.id)})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
          <span>Entregadores cadastrados ({couriers.length})</span>
          <span className="text-emerald-700">{couriers.filter(c => c.status === 'disponivel').length} disponíveis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {couriers.map(courier => (
            <div key={courier.id} className="p-3 rounded-xl border border-stone-100 bg-stone-50/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                  {courier.nome.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-800 truncate">{courier.nome}</div>
                  <div className="text-[11px] text-stone-500 truncate">{courier.placaMoto || 'Moto'} • {courier.telefone}</div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                courier.status === 'disponivel'
                  ? 'bg-emerald-100 text-emerald-800'
                  : courier.status === 'em_rota'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-200 text-stone-600'
              }`}>
                {courier.status === 'disponivel' ? 'Disponível' : courier.status === 'em_rota' ? 'Em rota' : 'Indisponível'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
          <Bike className="w-10 h-10 mx-auto text-stone-300 mb-2" />
          <div className="text-sm font-bold text-stone-700">Nenhum pedido encontrado</div>
          <p className="text-xs text-stone-400">Crie um pedido selecionando Entrega no PDV ou altere o filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const meta = getStatusMeta(order.status);
            const availableCouriers = couriers.filter(courier => courier.status === 'disponivel' || courier.nome === order.entregadorNome);
            const selectedCourier = selectedCourierByOrder[order.id] || order.entregadorNome || '';
            const isPaid = order.statusPagamento === 'pago' || order.saldoRestante <= 0.01;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-stone-900">#{order.numero}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.className}`}>{meta.label}</span>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {new Date(order.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900 truncate">{order.nomeCliente || 'Cliente Delivery'}</div>
                      {order.telefoneCliente && (
                        <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {order.telefoneCliente}
                        </div>
                      )}
                    </div>
                    {order.entregadorNome && (
                      <span className="shrink-0 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-2 py-1">
                        {order.entregadorNome}
                      </span>
                    )}
                  </div>

                  {order.enderecoEntrega && (
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-700 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div>{order.enderecoEntrega.logradouro}, {order.enderecoEntrega.numero}</div>
                        <div className="text-[11px] text-stone-500">
                          {order.enderecoEntrega.bairro}{order.enderecoEntrega.complemento ? ` • ${order.enderecoEntrega.complemento}` : ''}
                        </div>
                        {order.enderecoEntrega.pontoReferencia && (
                          <div className="text-[11px] text-stone-400">Ref.: {order.enderecoEntrega.pontoReferencia}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-stone-700">
                    {order.itens.map(item => (
                      <div key={item.cartItemId} className="flex items-start gap-2">
                        <span className="font-bold text-amber-700 shrink-0">{item.quantidade}x</span>
                        <span className="min-w-0">{item.nome}{item.variacaoNome ? ` (${item.variacaoNome})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-stone-100">
                  {order.status === 'pronto' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600">
                        <UserRoundCheck className="w-3.5 h-3.5 text-purple-600" />
                        Escolha o entregador para despachar
                      </div>
                      <div className="flex gap-2">
                        <select
                          aria-label={`Entregador do pedido ${order.numero}`}
                          value={selectedCourier}
                          onChange={event => setSelectedCourierByOrder(prev => ({ ...prev, [order.id]: event.target.value }))}
                          className="min-w-0 flex-1 px-2.5 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="">Selecionar entregador</option>
                          {availableCouriers.map(courier => <option key={courier.id} value={courier.nome}>{courier.nome}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedCourier || availableCouriers.length === 0}
                          onClick={() => assignCourierToOrder(order.id, selectedCourier)}
                          className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Despachar
                        </button>
                      </div>
                      {availableCouriers.length === 0 && <p className="text-[11px] text-rose-600">Nenhum entregador disponível no momento.</p>}
                    </div>
                  )}

                  {order.status === 'saiu_entrega' && (
                    <button
                      type="button"
                      onClick={() => completeDeliveryOrder(order.id)}
                      className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirmar entrega realizada
                    </button>
                  )}

                  {order.status === 'entregue' && (
                    <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Entrega confirmada. Aguardando fechamento financeiro.
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-semibold">Total + entrega</span>
                      <strong className="text-sm font-extrabold text-stone-900">{formatCurrency(order.total)}</strong>
                      {order.taxaEntrega > 0 && <span className="text-[10px] text-stone-400 block">Taxa: {formatCurrency(order.taxaEntrega)}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setSelectedOrderForModal(order)} className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1">
                        Detalhes <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={isPaid}
                        onClick={() => openPaymentModal(order)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isPaid ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                      >
                        <DollarSign className="w-3 h-3" /> {isPaid ? 'Pago' : 'Cobrar'}
                      </button>
                    </div>
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
