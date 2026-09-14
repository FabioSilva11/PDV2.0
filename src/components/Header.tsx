import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { formatCurrency } from '../utils/formatters';
import { 
  Store, 
  Wallet, 
  Clock, 
  Volume2, 
  VolumeX, 
  ChefHat, 
  Users, 
  TrendingUp, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    cashRegister, 
    orders, 
    tables, 
    soundEnabled, 
    setSoundEnabled, 
    setActiveTab 
  } = useRestaurant();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Today's total sales
  const salesToday = orders
    .filter(o => o.status !== 'cancelado' && (o.finalizadoEm || o.formaPagamento))
    .reduce((acc, o) => acc + o.total, 0);

  // Active kitchen orders
  const activeKitchenCount = orders.filter(o => o.status === 'pendente' || o.status === 'preparando').length;

  // Occupied tables
  const occupiedTablesCount = tables.filter(t => t.status === 'ocupada' || t.status === 'conta').length;

  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-inner font-bold text-xl tracking-wider">
                M
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-serif">
                    Murupi Restaurante
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PDV & Lanches
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Sistema de Gestão & Frente de Caixa
                </p>
              </div>
            </div>

            {/* Mobile Sound + Clock */}
            <div className="flex md:hidden items-center gap-2">
              <button
                id="header-sound-btn-mobile"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white"
                title={soundEnabled ? "Desativar Sons" : "Ativar Sons"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto justify-center md:justify-end text-xs">
            {/* Cash Status */}
            <button
              id="header-cashier-status-btn"
              onClick={() => setActiveTab('caixa')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                cashRegister.aberto 
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50' 
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <div className="text-left">
                <div className="font-semibold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cashRegister.aberto ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {cashRegister.aberto ? 'Caixa Aberto' : 'Caixa Fechado'}
                </div>
                {cashRegister.aberto && (
                  <div className="text-[10px] text-emerald-400/90 font-mono">
                    Gaveta: {formatCurrency(cashRegister.saldoAtualGaveta)}
                  </div>
                )}
              </div>
            </button>

            {/* Kitchen Status pill */}
            <button
              id="header-kds-shortcut-btn"
              onClick={() => setActiveTab('kds')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700 text-stone-200 hover:bg-stone-750 hover:border-amber-500/50 transition-colors"
              title="Ir para a Cozinha (KDS)"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-stone-400">Cozinha KDS</div>
                <div className="font-bold flex items-center gap-1">
                  <span>{activeKitchenCount} pedidos</span>
                  {activeKitchenCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
              </div>
            </button>

            {/* Tables Status pill */}
            <button
              id="header-tables-shortcut-btn"
              onClick={() => setActiveTab('mesas')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700 text-stone-200 hover:bg-stone-750 hover:border-amber-500/50 transition-colors"
              title="Ir para o Mapa de Mesas"
            >
              <Users className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[10px] text-stone-400">Salão / Mesas</div>
                <div className="font-bold">
                  {occupiedTablesCount}/{tables.length} ocupadas
                </div>
              </div>
            </button>

            {/* Total Vendas Hoje */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700 text-stone-200">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-stone-400">Vendas Hoje</div>
                <div className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(salesToday)}
                </div>
              </div>
            </div>

            {/* Clock & Sound button */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-stone-800 text-stone-400">
              <div className="flex items-center gap-1 font-mono text-xs">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{currentTime}</span>
              </div>
              <button
                id="header-sound-btn-desktop"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                title={soundEnabled ? "Desativar Efeitos Sonoros" : "Ativar Efeitos Sonoros"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
