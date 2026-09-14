import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types';
import { formatCurrency, formatFullDate, getPaymentMethodName, getOrderStatusBadge } from '../../utils/formatters';
import { paymentSummary } from '../../utils/reports';
import { ReceiptModal } from '../pdv/ReceiptModal';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Printer, 
  Search, 
  XCircle, 
  Filter,
  CheckCircle2,
  Calendar,
  Award
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, cancelOrder, selectedReceiptOrder, setSelectedReceiptOrder } = useRestaurant();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'balcao' | 'mesa' | 'delivery'>('todos');

  const validOrders = orders.filter(o => o.status !== 'cancelado');
  const { byMethod: paymentTotals, total: totalRevenue, count: totalCount } = paymentSummary(orders);
  const averageTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  // Item sales ranking
  const itemCounts: Record<string, { count: number; revenue: number }> = {};
  validOrders.forEach(o => {
    o.itens.forEach(item => {
      if (!itemCounts[item.nome]) {
        itemCounts[item.nome] = { count: 0, revenue: 0 };
      }
      itemCounts[item.nome].count += item.quantidade;
      itemCounts[item.nome].revenue += item.precoUnitario * item.quantidade;
    });
  });

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    const matchType = typeFilter === 'todos' || o.tipo === typeFilter;
    const matchSearch = 
      o.numero.toString().includes(searchTerm) ||
      (o.nomeCliente && o.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.mesaNumero && o.mesaNumero.toString().includes(searchTerm));
    return matchType && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-serif text-stone-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-600" />
          <span>Métricas de Vendas & Histórico</span>
        </h2>
        <p className="text-xs text-stone-500">
          Relatórios executivos de faturamento, canais de venda e pratos campeões
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Consolidado de todas as comandas pagas
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Pedidos</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-stone-900">
            {totalCount}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Balcão, mesas e entregas
          </p>
        </div>

        {/* Average Ticket */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-700">
            {formatCurrency(averageTicket)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Média por comanda finalizada
          </p>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cancelamentos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-700">
            {orders.filter(o => o.status === 'cancelado').length}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Pedidos estornados
          </p>
        </div>
      </div>

      {/* Middle Grid: Payment Methods & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Payment Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-bold text-sm font-serif text-stone-900">
              Vendas por Forma de Pagamento
            </h3>
            <span className="text-xs text-stone-500">Total: {formatCurrency(totalRevenue)}</span>
          </div>

          <div className="space-y-3">
            {[
              { id: 'dinheiro', name: 'Dinheiro em Espécie', color: 'bg-emerald-500' },
              { id: 'pix', name: 'PIX Instantâneo', color: 'bg-teal-500' },
              { id: 'debito', name: 'Cartão de Débito', color: 'bg-blue-500' },
              { id: 'credito', name: 'Cartão de Crédito', color: 'bg-purple-500' },
            ].map(pm => {
              const amount = paymentTotals[pm.id] || 0;
              const percent = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <div key={pm.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-stone-700">{pm.name}</span>
                    <span className="font-mono text-stone-900">
                      {formatCurrency(amount)} ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div 
                      className={`h-full ${pm.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best Sellers (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-bold text-sm font-serif text-stone-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Pratos & Lanches Mais Vendidos</span>
            </h3>
            <span className="text-xs text-stone-400">Top 5</span>
          </div>

          <div className="space-y-2.5">
            {topItems.map(([name, data], idx) => (
              <div
                key={name}
                className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-100 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                    idx === 0 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-bold text-stone-800">{name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-stone-900 font-mono">
                    {data.count} vendidos
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    {formatCurrency(data.revenue)}
                  </div>
                </div>
              </div>
            ))}

            {topItems.length === 0 && (
              <div className="py-8 text-center text-stone-400 text-xs">
                Nenhum item vendido ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders History Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden space-y-3 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm font-serif text-stone-900">
              Histórico Detalhado de Comandas & Vendas
            </h3>
            <p className="text-xs text-stone-500">
              Consulte qualquer pedido, reimprima o comprovante ou realize cancelamento
            </p>
          </div>

          {/* Search & Channel Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por Nº, Cliente, Mesa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-stone-50/50"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs bg-white font-semibold"
            >
              <option value="todos">Todos Canais</option>
              <option value="balcao">Balcão</option>
              <option value="mesa">Mesas</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-bold uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-3">Pedido</th>
                <th className="py-3 px-3">Data/Hora</th>
                <th className="py-3 px-3">Canal</th>
                <th className="py-3 px-3">Cliente / Mesa</th>
                <th className="py-3 px-3">Itens</th>
                <th className="py-3 px-3">Pagamento</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.map((order) => {
                const statusBadge = getOrderStatusBadge(order.status);
                return (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-amber-700">
                      #{order.numero}
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-500 text-[11px]">
                      {formatFullDate(order.criadoEm)}
                    </td>
                    <td className="py-3 px-3 capitalize font-semibold">
                      {order.tipo}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-stone-800">
                        {order.mesaNumero ? `Mesa ${order.mesaNumero}` : order.nomeCliente || 'Balcão'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-600 max-w-xs truncate">
                      {(order.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {order.pagamentos.some(payment => !payment.estornado) ? order.pagamentos.filter(payment => !payment.estornado).map(payment => getPaymentMethodName(payment.formaId)).join(' + ') : (
                        <span className="text-amber-700 font-semibold text-[10px]">Em aberto</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-sm text-stone-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptOrder(order)}
                          className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Ver Comprovante / Re-imprimir"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {order.status !== 'cancelado' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente cancelar o pedido #${order.numero}?`)) {
                                cancelOrder(order.id, 'Cancelado pelo gerente no histórico');
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancelar Pedido"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal for Reprinting */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
