import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order, OrderStatus } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { 
  ChefHat, 
  Clock, 
  Flame, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  Bike, 
  Store, 
  Users, 
  Receipt,
  Printer,
  RotateCcw
} from 'lucide-react';

export const KDSView: React.FC = () => {
  const { orders, updateOrderStatus, cancelOrder, setSelectedReceiptOrder } = useRestaurant();
  const [now, setNow] = useState<number>(Date.now());

  // Update timer every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter orders relevant for kitchen (pendente/novo, preparando/em_preparacao, pronto)
  const pendingOrders = orders.filter(o => o.status === 'pendente' || o.status === 'novo' || o.status === 'confirmado');
  const preparingOrders = orders.filter(o => o.status === 'preparando' || o.status === 'em_preparacao');
  const readyOrders = orders.filter(o => o.status === 'pronto');

  // Elapsed time helper
  const getElapsedMinutes = (isoString: string) => {
    const diffMs = now - new Date(isoString).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const getTimerBadge = (minutes: number) => {
    if (minutes >= 25) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500 text-white font-mono font-bold text-xs animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          {minutes} min (Atrasado)
        </span>
      );
    }
    if (minutes >= 15) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-stone-900 font-mono font-bold text-xs">
          <Clock className="w-3 h-3" />
          {minutes} min
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-700 text-stone-200 font-mono font-bold text-xs">
        <Clock className="w-3 h-3" />
        {minutes} min
      </span>
    );
  };

  const renderOrderCard = (order: Order, nextStatus?: OrderStatus, nextLabel?: string) => {
    const minutes = getElapsedMinutes(order.criadoEm);

    return (
      <div
        key={order.id}
        id={`kds-card-${order.id}`}
        className="bg-stone-900 text-stone-100 rounded-2xl p-4 border border-stone-800 shadow-md flex flex-col justify-between space-y-3"
      >
        {/* Top bar: Order number, type, timer */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono text-amber-400">
                #{order.numero}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-stone-300 flex items-center gap-1">
                {order.tipo === 'mesa' && <Users className="w-3 h-3 text-sky-400" />}
                {order.tipo === 'balcao' && <Store className="w-3 h-3 text-amber-400" />}
                {order.tipo === 'delivery' && <Bike className="w-3 h-3 text-emerald-400" />}
                <span>
                  {order.tipo === 'mesa' ? `Mesa ${order.mesaNumero}` : order.tipo}
                </span>
              </span>
            </div>
            {getTimerBadge(minutes)}
          </div>

          {/* Client note */}
          {order.nomeCliente && (
            <div className="text-xs text-stone-400 pt-1.5 font-medium truncate">
              Cliente: <span className="text-stone-200 font-semibold">{order.nomeCliente}</span>
            </div>
          )}

          {order.observacoesGerais && (
            <div className="mt-1 p-1.5 bg-amber-950/40 border border-amber-800/40 rounded text-[11px] text-amber-300">
              {order.observacoesGerais}
            </div>
          )}

          {/* Itemized List with accompaniments and notes */}
          <div className="mt-3 space-y-2">
            {order.itens.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-stone-800/60 border border-stone-700 text-xs"
              >
                <div className="flex items-start justify-between font-bold text-white">
                  <span className="text-amber-400 font-mono mr-1.5 text-sm">
                    {item.quantidade}x
                  </span>
                  <span className="flex-1 text-stone-100">{item.nome}</span>
                </div>

                {/* Accompaniments */}
                {item.acompanhamentosEscolhidos && item.acompanhamentosEscolhidos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pl-4">
                    {item.acompanhamentosEscolhidos.map((acc, aIdx) => (
                      <span
                        key={aIdx}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-stone-700/80 text-stone-200 border border-stone-600"
                      >
                        {acc}
                      </span>
                    ))}
                  </div>
                )}

                {item.remocoes && item.remocoes.length > 0 && (
                  <div className="mt-1.5 pl-4 text-[11px] text-rose-300 font-bold italic">
                    Sem: {item.remocoes.join(', ')}
                  </div>
                )}

                {/* Special preparation note */}
                {item.observacao && (
                  <div className="mt-1 pl-4 text-[11px] text-amber-300 font-medium italic flex items-center gap-1">
                    <span>⚠️ {item.observacao}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedReceiptOrder(order)}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
            title="Ver / Imprimir Comanda"
          >
            <Receipt className="w-4 h-4" />
          </button>

          {nextStatus && (
            <button
              type="button"
              onClick={() => updateOrderStatus(order.id, nextStatus)}
              className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>{nextLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {order.status === 'pronto' && (
            <>
              <button
                type="button"
                onClick={() => setSelectedReceiptOrder(order)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                title="Imprimir a comanda para grampear no envelope do pedido"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comanda</span>
              </button>
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'entregue')}
                className="py-2 px-3 bg-stone-700 hover:bg-stone-600 text-stone-100 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                title="Marcar como concluído (não usa app de entrega)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Concluir</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-amber-600" />
            <span>KDS - Painel da Cozinha & Chapa</span>
          </h2>
          <p className="text-xs text-stone-500">
            Controle em tempo real de preparação e expedição dos pratos e lanches
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1 text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            {pendingOrders.length + preparingOrders.length} em andamento
          </span>
          <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {readyOrders.length} prontos para sair
          </span>
        </div>
      </div>

      {/* KDS Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Col 1: Pendentes */}
        <div className="bg-stone-100 rounded-2xl p-4 border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="font-bold text-sm text-stone-800 font-serif">
                A Fazer / Pendentes
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold text-xs rounded-full font-mono">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {pendingOrders.map(o => renderOrderCard(o, 'preparando', 'Iniciar Preparo'))}
            {pendingOrders.length === 0 && (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Nenhum pedido novo pendente.
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Em Preparo */}
        <div className="bg-stone-100 rounded-2xl p-4 border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="font-bold text-sm text-stone-800 font-serif">
                Em Preparo / Na Chapa
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-900 font-bold text-xs rounded-full font-mono">
              {preparingOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {preparingOrders.map(o => renderOrderCard(o, 'pronto', 'Pronto'))}
            {preparingOrders.length === 0 && (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Nenhum prato sendo preparado agora.
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Pronto / Expedição */}
        <div className="bg-stone-100 rounded-2xl p-4 border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-sm text-stone-800 font-serif">
                Pronto / Expedição
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold text-xs rounded-full font-mono">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {readyOrders.map(o => renderOrderCard(o))}
            {readyOrders.length === 0 && (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Nenhum prato aguardando expedição.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
