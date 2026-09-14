import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  Utensils, 
  ChefHat, 
  AlertTriangle, 
  TrendingUp, 
  Flame, 
  CheckCircle2, 
  Activity, 
  Bike, 
  Receipt,
  Percent,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    orders, 
    tables, 
    health, 
    setActiveModule, 
    setIsHealthModalOpen, 
    setIsAlertsDrawerOpen, 
    alerts,
    cashRegister,
    menu
  } = useRestaurant();

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.criadoEm.startsWith(todayStr));
  
  const faturamentoHoje = todayOrders
    .filter(o => o.status !== 'cancelado')
    .reduce((acc, o) => acc + o.total, 0);

  const totalPedidos = todayOrders.length;
  const pedidosAbertos = todayOrders.filter(o => o.status !== 'finalizado' && o.status !== 'cancelado').length;
  const pedidosFinalizados = todayOrders.filter(o => o.status === 'finalizado').length;
  const pedidosCancelados = todayOrders.filter(o => o.status === 'cancelado').length;

  const ticketMedio = todayOrders.filter(o => o.status !== 'cancelado').length > 0
    ? faturamentoHoje / todayOrders.filter(o => o.status !== 'cancelado').length
    : 0;

  const mesasOcupadas = tables.filter(t => t.status === 'ocupada' || t.status === 'conta').length;
  const emProducao = orders.filter(o => o.status === 'novo' || o.status === 'em_preparacao').length;
  
  // Atrasados: pedidos criados há mais de 25 min que ainda não estão prontos
  const agora = Date.now();
  const pedidosAtrasados = orders.filter(o => {
    if (o.status === 'novo' || o.status === 'em_preparacao') {
      const diffMin = (agora - new Date(o.criadoEm).getTime()) / (1000 * 60);
      return diffMin > 25;
    }
    return false;
  }).length;

  const totalDescontosHoje = todayOrders.reduce((acc, o) => acc + (o.desconto || 0), 0);

  // Channels Breakdown
  const channelStats = {
    salao: todayOrders.filter(o => o.canal.toLowerCase().includes('salão') || o.tipo === 'mesa').reduce((a, b) => a + b.total, 0),
    balcao: todayOrders.filter(o => o.canal.toLowerCase().includes('balcão') || o.tipo === 'balcao').reduce((a, b) => a + b.total, 0),
    delivery: todayOrders.filter(o => o.canal.toLowerCase().includes('delivery') || o.tipo === 'delivery').reduce((a, b) => a + b.total, 0),
    whatsapp: todayOrders.filter(o => o.canal.toLowerCase().includes('whatsapp')).reduce((a, b) => a + b.total, 0),
  };

  // Best Sellers (computed from items)
  const productCountMap: Record<string, { nome: string; count: number; total: number }> = {};
  const activeMenuIds = new Set(menu.map(item => item.id));
  orders.filter(o => o.status !== 'cancelado').forEach(o => {
    o.itens.forEach(it => {
      if (!activeMenuIds.has(it.menuItemId)) return;
      if (!productCountMap[it.nome]) {
        productCountMap[it.nome] = { nome: it.nome, count: 0, total: 0 };
      }
      productCountMap[it.nome].count += it.quantidade;
      productCountMap[it.nome].total += it.precoUnitario * it.quantidade;
    });
  });

  const bestSellers = Object.values(productCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Hourly distribution bars
  const hourlyData = [11, 12, 13, 14, 18, 19, 20, 21].map(hour => ({
    hora: `${hour}h`,
    valor: todayOrders.filter(order => new Date(order.criadoEm).getHours() === hour && order.status !== 'cancelado').reduce((sum, order) => sum + order.total, 0)
  }));
  const maxHourly = Math.max(...hourlyData.map(h => h.valor));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Health Alert Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Painel Operacional do Restaurante</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operação Aberta
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Visão consolidada em tempo real • Turno atual operador: <strong>{cashRegister.operadorAbertura || 'Caixa'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="dash-check-health-btn"
            onClick={() => setIsHealthModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Saúde da Operação: {health.impressoras === 'online' ? '100% OK' : '1 Impressora Offline'}</span>
          </button>

          {alerts.length > 0 && (
            <button
              id="dash-view-alerts-btn"
              onClick={() => setIsAlertsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{alerts.length} Alertas</span>
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Faturamento Hoje */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Faturamento Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900">{formatCurrency(faturamentoHoje)}</div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>{pedidosFinalizados} pedidos finalizados</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Ticket Médio</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900">{formatCurrency(ticketMedio)}</div>
          <div className="text-[11px] text-stone-500">
            Baseado em {todayOrders.length} pedidos hoje
          </div>
        </div>

        {/* Mesas Ocupadas */}
        <div 
          onClick={() => setActiveModule('mesas')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-2 cursor-pointer hover:border-sky-300 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Mesas Ocupadas</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900">
            {mesasOcupadas} <span className="text-sm font-normal text-stone-400">/ {tables.length}</span>
          </div>
          <div className="text-[11px] text-sky-700 font-semibold flex items-center gap-1">
            <span>Ver mapa do salão</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Em Produção / KDS */}
        <div 
          onClick={() => setActiveModule('kds')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-2 cursor-pointer hover:border-amber-300 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Na Cozinha / KDS</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900">
            {emProducao}
            {pedidosAtrasados > 0 && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                {pedidosAtrasados} atrasado{pedidosAtrasados > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
            <span>Acompanhar KDS</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendas por Horário (Histogram bar chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Volume de Vendas por Horário</h3>
              <p className="text-xs text-stone-500">Picos de demanda no almoço e no jantar</p>
            </div>
            <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg">
              Hoje ({new Date().toLocaleDateString('pt-BR')})
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-stone-100">
            {hourlyData.map((bar, i) => {
              const heightPct = Math.round((bar.valor / maxHourly) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-bold text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    R$ {bar.valor}
                  </span>
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] bg-amber-500 hover:bg-amber-600 rounded-t-lg transition-all shadow-2xs"
                  />
                  <span className="text-[11px] font-mono text-stone-500 mt-1">{bar.hora}</span>
                </div>
              );
            })}
          </div>

          {/* Quick summary stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
              <span className="text-stone-400 block text-[10px]">Total de Pedidos</span>
              <strong className="text-stone-800 text-sm font-bold">{totalPedidos}</strong>
            </div>
            <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
              <span className="text-stone-400 block text-[10px]">Descontos Concedidos</span>
              <strong className="text-stone-800 text-sm font-bold">{formatCurrency(totalDescontosHoje)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
              <span className="text-stone-400 block text-[10px]">Cancelamentos</span>
              <strong className="text-stone-800 text-sm font-bold">{pedidosCancelados}</strong>
            </div>
          </div>
        </div>

        {/* Vendas por Canal */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Vendas por Canal</h3>
            <p className="text-xs text-stone-500">Distribuição entre mesas, balcão e delivery</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-stone-700">
                  <Utensils className="w-3.5 h-3.5 text-sky-600" />
                  Salão (Mesas)
                </span>
                <span className="font-bold text-stone-900">{formatCurrency(channelStats.salao)}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${faturamentoHoje > 0 ? (channelStats.salao / faturamentoHoje) * 100 : 0}%` }}
                  className="h-full bg-sky-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-stone-700">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                  Balcão & Retirada
                </span>
                <span className="font-bold text-stone-900">{formatCurrency(channelStats.balcao)}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${faturamentoHoje > 0 ? (channelStats.balcao / faturamentoHoje) * 100 : 0}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-stone-700">
                  <Bike className="w-3.5 h-3.5 text-purple-600" />
                  Delivery & WhatsApp
                </span>
                <span className="font-bold text-stone-900">{formatCurrency(channelStats.delivery + channelStats.whatsapp)}</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${faturamentoHoje > 0 ? ((channelStats.delivery + channelStats.whatsapp) / faturamentoHoje) * 100 : 0}%` }}
                  className="h-full bg-purple-500 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-600">
            <span className="font-semibold text-stone-800">Dica Operacional:</span> Salão representa o maior faturamento hoje. Garanta equipes atentas na reposição das mesas.
          </div>
        </div>
      </div>

      {/* Third Row: Top Sellers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Produtos Mais Vendidos */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">Produtos Mais Vendidos</h3>
          </div>

          <div className="divide-y divide-stone-100">
            {bestSellers.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">Nenhuma venda registrada para o cardápio atual.</div>
            ) : bestSellers.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-stone-800">{item.nome}</div>
                    <div className="text-[11px] text-stone-500">{item.count} saídas registradas</div>
                  </div>
                </div>
                <span className="font-bold text-xs text-stone-900 font-mono">
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
