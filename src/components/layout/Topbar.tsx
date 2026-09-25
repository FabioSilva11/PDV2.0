import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { 
  Activity, 
  Bell, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Wallet, 
  Clock, 
  Building2, 
  Search,
  Maximize2,
  Database
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const { 
    cashRegister, 
    health, 
    alerts, 
    setIsAlertsDrawerOpen, 
    setIsHealthModalOpen, 
    setActiveModule,
    soundEnabled, 
    setSoundEnabled
  } = useRestaurant();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadAlertsCount = alerts.filter(a => !a.lida).length;

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="h-13 bg-white border-b border-slate-200/90 px-3 sm:px-4 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-2xs select-none">
      {/* Left side: Branch & Fast search */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Restaurante Murupi</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded font-bold">Produção</span>
        </div>

        {/* Global Quick Search */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="global-topbar-search"
            type="text"
            placeholder="Buscar pedido ou mesa..."
            className="w-52 pl-8 pr-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setActiveModule('pedidos');
              }
            }}
          />
        </div>

        {/* MariaDB Localhost Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-sky-50/80 border border-sky-200 text-[11px] font-medium text-sky-800" title="Banco de Dados Principal: MariaDB Localhost (Porta 3306)">
          <Database className="w-3 h-3 text-sky-600" />
          <span>MariaDB:</span>
          <span className="font-semibold">localhost:3306</span>
          <span className={`w-1.5 h-1.5 rounded-full ${health.mariadb === 'offline' ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} />
        </div>
      </div>

      {/* Right side: Actions, Cash Status, Health, Alerts */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick New Order / PDV button */}
        <button
          id="topbar-new-order-btn"
          onClick={() => setActiveModule('pdv')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo Pedido</span>
          <span className="sm:hidden">PDV</span>
          <span className="hidden lg:inline text-[10px] bg-blue-700 px-1 py-0.2 rounded text-blue-100 font-mono">F1</span>
        </button>

        {/* Cash Status Indicator */}
        <button
          id="topbar-cash-status-btn"
          onClick={() => setActiveModule('caixa')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
            cashRegister.aberto 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' 
              : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
          }`}
          title={cashRegister.aberto ? "Caixa aberto. Clique para gerenciar." : "Caixa fechado. Clique para abrir."}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {cashRegister.aberto ? `Caixa: ${formatCurrency(cashRegister.saldoAtualGaveta)}` : 'Caixa Fechado'}
          </span>
          <span className="sm:hidden font-bold">
            {cashRegister.aberto ? 'Aberto' : 'Fechado'}
          </span>
        </button>

        {/* Operational Health Trigger */}
        <button
          id="topbar-health-btn"
          onClick={() => setIsHealthModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
          title="Ver Saúde da Operação (Internet, Servidor, Impressoras)"
        >
          <div className="relative">
            <Activity className="w-3.5 h-3.5 text-slate-600" />
            <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              health.impressoras === 'online' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'
            }`} />
          </div>
          <span className="hidden xl:inline">Saúde</span>
        </button>

        {/* Alerts Bell */}
        <button
          id="topbar-alerts-btn"
          onClick={() => setIsAlertsDrawerOpen(true)}
          className="relative p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Central de Alertas e Notificações"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Audio Toggle */}
        <button
          id="topbar-sound-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors hidden sm:flex"
          title={soundEnabled ? "Desativar sons do sistema" : "Ativar sons do sistema"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          id="topbar-fullscreen-btn"
          onClick={toggleFullScreen}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors hidden md:flex"
          title="Alternar Tela Cheia"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono pl-2 border-l border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime}</span>
        </div>
      </div>
    </header>
  );
};
