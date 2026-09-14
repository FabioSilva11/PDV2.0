import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  Activity, 
  Wifi, 
  Server, 
  Cpu, 
  Printer, 
  ChefHat, 
  DatabaseBackup, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  ShieldCheck
} from 'lucide-react';

export const OperationHealthModal: React.FC = () => {
  const { 
    isHealthModalOpen, 
    setIsHealthModalOpen, 
    health, 
    refreshHealth, 
    printers 
  } = useRestaurant();

  if (!isHealthModalOpen) return null;

  const items = [
    {
      id: 'internet',
      nome: 'Conexão com a Internet',
      status: health.internet,
      detalhe: 'Latência média 16ms • Conexão estável fibra',
      icon: Wifi
    },
    {
      id: 'servidor',
      nome: 'Servidor SaaS Cloud',
      status: health.servidor,
      detalhe: 'Google Cloud Run • Taxa de erro 0.00% • 12% uso',
      icon: Server
    },
    {
      id: 'sistema',
      nome: 'Sistema Operacional Local',
      status: health.sistema,
      detalhe: 'v3.4.0 SaaS Pro • Sem travamentos detectados',
      icon: Cpu
    },
    {
      id: 'impressoras',
      nome: 'Rede de Impressoras Térmicas',
      status: health.impressoras,
      detalhe: `${printers.filter(p => p.status === 'online').length} de ${printers.length} ativas (${printers.find(p => p.status === 'offline')?.nome || 'Todas ok'})`,
      icon: Printer
    },
    {
      id: 'kds',
      nome: 'Monitores de Cozinha (KDS)',
      status: health.kds,
      detalhe: '3 telas ativas (Chapa, Cozinha e Bar) sincronizadas',
      icon: ChefHat
    },
    {
      id: 'backup',
      nome: 'Rotina de Backup dos Dados',
      status: 'online' as const,
      detalhe: health.ultimoBackup + ' (Nuvem redundante criptografada)',
      icon: DatabaseBackup
    },
    {
      id: 'sync',
      nome: 'Última Sincronização Local',
      status: 'online' as const,
      detalhe: health.ultimaSincronizacao,
      icon: RefreshCw
    }
  ];

  const getStatusBadge = (st: 'online' | 'offline' | 'atencao') => {
    if (st === 'online') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Operacional
        </span>
      );
    }
    if (st === 'atencao') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Atenção
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
        <X className="w-3 h-3 text-rose-600" />
        Offline
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Saúde da Operação</h3>
              <p className="text-xs text-stone-400">Diagnóstico dos serviços e periféricos em tempo real</p>
            </div>
          </div>
          <button
            id="close-health-modal-btn"
            onClick={() => setIsHealthModalOpen(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-100 bg-stone-50/70 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-800">{item.nome}</div>
                    <div className="text-[11px] text-stone-500">{item.detalhe}</div>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            );
          })}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Operação em modo seguro. Caso a internet oscile, o sistema retém os pedidos no banco local e sincroniza assim que a conectividade for restabelecida.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <button
            id="refresh-health-btn"
            onClick={refreshHealth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Testar Conexões Agora
          </button>

          <button
            id="ok-health-modal-btn"
            onClick={() => setIsHealthModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
