import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  X, 
  AlertTriangle, 
  AlertCircle, 
  CheckCheck, 
  ArrowRight, 
  Printer, 
  DollarSign
} from 'lucide-react';
import { AppModule } from '../../types';

export const AlertsDrawer: React.FC = () => {
  const { 
    alerts, 
    dismissAlert, 
    clearAllAlerts, 
    isAlertsDrawerOpen, 
    setIsAlertsDrawerOpen,
    setActiveModule 
  } = useRestaurant();

  if (!isAlertsDrawerOpen) return null;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'impressora_offline':
        return <Printer className="w-4 h-4 text-rose-600" />;
      case 'caixa_diferenca':
        return <DollarSign className="w-4 h-4 text-sky-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-stone-600" />;
    }
  };

  const handleAction = (mod?: string) => {
    if (mod) {
      setActiveModule(mod as AppModule);
      setIsAlertsDrawerOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-2xs animate-in fade-in">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-800">Central de Alertas & Notificações</h3>
              <p className="text-[11px] text-stone-500">{alerts.length} alertas da operação do restaurante</p>
            </div>
          </div>
          <button
            id="close-alerts-drawer-btn"
            onClick={() => setIsAlertsDrawerOpen(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <CheckCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-stone-600">Tudo em ordem!</p>
              <p className="text-xs text-stone-400">Nenhum alerta crítico ou pendência detectada no momento.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  alert.gravidade === 'alta' 
                    ? 'bg-rose-50/50 border-rose-200' 
                    : 'bg-sky-50/50 border-sky-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white shadow-2xs mt-0.5">
                      {getIcon(alert.tipo)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-800">{alert.titulo}</div>
                      <div className="text-xs text-stone-600 mt-0.5 leading-relaxed">{alert.mensagem}</div>
                      <div className="text-[10px] text-stone-400 mt-1 font-mono">{alert.horario}</div>
                    </div>
                  </div>
                  <button
                    id={`dismiss-alert-${alert.id}`}
                    onClick={() => dismissAlert(alert.id)}
                    className="text-stone-400 hover:text-stone-600 p-1"
                    title="Dispensar alerta"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {alert.linkAcao && (
                  <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex justify-end">
                    <button
                      id={`action-alert-${alert.id}`}
                      onClick={() => handleAction(alert.linkAcao)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                    >
                      <span>Ver módulo {alert.linkAcao}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="p-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <button
              id="clear-all-alerts-btn"
              onClick={clearAllAlerts}
              className="text-xs font-medium text-stone-500 hover:text-stone-800"
            >
              Limpar todos os alertas
            </button>
            <button
              id="close-drawer-bottom-btn"
              onClick={() => setIsAlertsDrawerOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
