import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  Activity, 
  Server, 
  Printer, 
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
      nome: 'Conexão com o Backend Local',
      status: health.servidor,
      detalhe: health.servidor === 'online' ? 'Backend respondeu à última verificação' : 'Sem resposta do backend local',
      icon: Server
    },
    {
      id: 'mariadb',
      nome: 'MariaDB',
      status: health.mariadb || 'unknown',
      detalhe: health.mariadb === 'online' ? 'Conexão ativa com o banco' : 'Banco indisponível ou não verificado',
      icon: DatabaseBackup
    },
    {
      id: 'impressoras',
      nome: 'Rede de Impressoras Térmicas',
      status: health.impressoras,
      detalhe: `${printers.filter(p => p.status === 'online').length} de ${printers.length} ativas (${printers.find(p => p.status === 'offline')?.nome || 'Todas ok'})`,
      icon: Printer
    },
    {
      id: 'backup',
      nome: 'Rotina de Backup dos Dados',
      status: (health.ultimoBackup === 'Não configurado' ? 'unknown' : 'online') as 'online' | 'offline' | 'atencao' | 'unknown',
      detalhe: health.ultimoBackup,
      icon: DatabaseBackup
    },
    {
      id: 'sync',
      nome: 'Última Sincronização Local',
      status: (health.ultimaSincronizacao === 'Aguardando verificação' ? 'unknown' : 'online') as 'online' | 'offline' | 'atencao' | 'unknown',
      detalhe: health.ultimaSincronizacao,
      icon: RefreshCw
    }
  ];

  const getStatusBadge = (st: 'online' | 'offline' | 'atencao' | 'unknown') => {
    if (st === 'unknown') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Não verificado
        </span>
      );
    }
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
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
          <AlertTriangle className="w-3 h-3 text-yellow-600" />
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
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
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

          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
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
