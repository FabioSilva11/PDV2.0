import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { TableDetailsModal } from './TableDetailsModal';
import { Users, Clock, UtensilsCrossed } from 'lucide-react';

/**
 * MAPA DE MESAS — estritamente OPERACIONAL.
 *
 * O card mostra apenas a ocupação FÍSICA: número, status, capacidade e quem
 * está na mesa. Preço, saldo, total, valor da conta, número da conta e
 * quantidade de pedidos NÃO aparecem aqui: isso vive em "Detalhes da Mesa",
 * Contas & Checks, Central de Pedidos e no Pagamento.
 *
 * A Mesa é apenas a ocupação física. O atendimento financeiro é a CONTA e cada
 * pedido sequencial daquela conta é um LANÇAMENTO (0.1, 0.2, 0.3...).
 */
export const TablesView: React.FC = () => {
  const { tables, setActiveModule } = useRestaurant();

  const [filter, setFilter] = useState<'todas' | 'livres' | 'ocupadas' | 'conta'>('todas');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);

  // A mesa é buscada ao vivo: card e detalhes nunca mostram dado antigo.
  const selectedTable = selectedTableNumber === null
    ? null
    : tables.find(t => t.numero === selectedTableNumber) || null;

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
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Mapa de Mesas &amp; Salão</h2>
          <p className="text-xs text-slate-500">
            Mapa operacional: a mesa é apenas a <strong>ocupação física</strong>. Contas, lançamentos e valores ficam em
            <strong> Contas &amp; Checks</strong>, na <strong>Central de Pedidos</strong> e nos <strong>Detalhes da Mesa</strong>.
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
            <button
              key={table.numero}
              type="button"
              id={`table-card-${table.numero}`}
              onClick={() => setSelectedTableNumber(table.numero)}
              className={`text-left rounded-2xl p-4 border transition-all cursor-pointer h-44 flex flex-col justify-between shadow-xs hover:shadow-md ${isFree ? 'bg-white border-emerald-300/80 hover:border-emerald-500' : isBill ? 'bg-purple-50/50 border-purple-300 hover:border-purple-500' : 'bg-sky-50/40 border-sky-300 hover:border-sky-500'}`}
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

              <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Detalhes</span>
                <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      {selectedTable && (
        <TableDetailsModal table={selectedTable} onClose={() => setSelectedTableNumber(null)} />
      )}

      <p className="text-[10px] text-slate-400">
        Dica: clique na mesa para ver <strong>Contas relacionadas</strong>, <strong>Lançamentos</strong> e as ações
        &quot;Novo lançamento&quot; (continua a conta) e &quot;Novo atendimento&quot; (conta nova).
        <button type="button" onClick={() => setActiveModule('pdv')} className="ml-1 underline hover:text-slate-600">Ir para o PDV</button>
      </p>
    </div>
  );
};
