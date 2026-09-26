import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { Users, Clock } from 'lucide-react';

/**
 * MAPA DE MESAS — apenas visualização da ocupação física.
 *
 * Mostra: número, status (Livre/Ocupada/Pedindo Conta), capacidade,
 * garçom/cliente quando ocupado. Sem interação, sem detalhes, sem
 * informação financeira.
 */
export const TablesView: React.FC = () => {
  const { tables } = useRestaurant();

  const [filter, setFilter] = useState<'todas' | 'livres' | 'ocupadas' | 'conta'>('todas');

  const tableMatchesFilter = (table: Table, f: typeof filter) => {
    if (f === 'todas') return true;
    if (f === 'livres') return table.status === 'livre';
    if (f === 'ocupadas') return table.status === 'ocupada' || table.status === 'fechando';
    return table.status === 'conta';
  };
  const filteredTables = tables.filter(t => tableMatchesFilter(t, filter));
  const countOf = (f: typeof filter) => tables.filter(t => tableMatchesFilter(t, f)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Mapa de Mesas & Salão</h2>
          <p className="text-xs text-slate-500">
            Mapa operacional: a mesa é apenas a <strong>ocupação física</strong>.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
          {(['todas', 'livres', 'ocupadas', 'conta'] as const).map(value => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg ${filter === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {value === 'todas' ? `Todas (${tables.length})` : value === 'livres' ? `Livres (${countOf('livres')})` : value === 'ocupadas' ? `Ocupadas (${countOf('ocupadas')})` : `Pedindo Conta (${countOf('conta')})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map(table => {
          const isFree = table.status === 'livre';
          const isBill = table.status === 'conta';
          const statusLabel = isFree ? 'Livre' : isBill ? 'Pedindo conta' : 'Ocupada';
          return (
            <div
              key={table.numero}
              id={`table-card-${table.numero}`}
              className={`text-left rounded-2xl p-4 border h-44 flex flex-col justify-between shadow-xs ${isFree ? 'bg-white border-emerald-300/80' : isBill ? 'bg-purple-50/50 border-purple-300' : 'bg-sky-50/40 border-sky-300'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-stone-400 font-semibold block uppercase tracking-wider">Mesa</span>
                  <div className="text-2xl font-black font-serif text-stone-900">{String(table.numero).padStart(2, '0')}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isFree ? 'bg-emerald-100 text-emerald-800' : isBill ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'}`}>{statusLabel}</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-stone-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" />Capacidade: {table.capacidade} pessoas</p>
                {table.clienteNome && <p className="text-xs font-bold text-stone-800 truncate">{table.clienteNome}</p>}
                {table.garcomResponsavel && <p className="text-[10px] text-stone-500 truncate">Garçom: {table.garcomResponsavel}</p>}
                {!isFree && <p className="text-[10px] text-stone-500 flex items-center gap-1 font-mono"><Clock className="w-3 h-3" />{table.abertaEm ? formatDateTime(table.abertaEm) : 'Ocupação atual'}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};