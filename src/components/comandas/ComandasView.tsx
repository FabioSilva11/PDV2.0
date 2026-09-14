import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Comanda } from '../../types';
import { 
  BookOpen, 
  Search, 
  Plus, 
  DollarSign, 
  Trash2, 
  Clock, 
  User, 
  CheckCircle,
  Receipt,
  Utensils
} from 'lucide-react';

export const ComandasView: React.FC = () => {
  const { 
    comandas = [], 
    createComanda, 
    closeComanda, 
    menu = [], 
    setActiveModule,
    currentUser 
  } = useRestaurant();

  const openComanda = createComanda;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [newComandaNum, setNewComandaNum] = useState('');
  const [newComandaCliente, setNewComandaCliente] = useState('');
  const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);

  const filtered = comandas.filter(c => 
    c.numero.toString().includes(searchTerm) ||
    (c.clienteNome && c.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateComanda = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newComandaNum);
    if (!num) return;
    openComanda(num, newComandaCliente.trim() || undefined);
    setIsNewComandaOpen(false);
    setNewComandaNum('');
    setNewComandaCliente('');
  };

  const handleCloseActiveComanda = (c: Comanda) => {
    closeComanda(c.id);
    setSelectedComanda(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            Comandas Individuais & Cartões de Consumo
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Controle de consumo individual por cartão numerado para balcão, eventos e consumo volante
          </p>
        </div>

        <button
          id="open-new-comanda-modal-btn"
          onClick={() => setIsNewComandaOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Abrir Nova Comanda
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número da comanda ou nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Comandas Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((c) => {
          const isOpen = c.status === 'aberta';
          return (
            <div
              key={c.id}
              onClick={() => setSelectedComanda(c)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between ${
                isOpen ? 'bg-white border-amber-300 ring-1 ring-amber-300/60' : 'bg-stone-50 border-stone-200 opacity-70'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-base text-stone-900">
                    Cartão #{c.numero}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOpen ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {isOpen ? 'ABERTA' : 'FECHADA'}
                  </span>
                </div>

                <div className="text-xs text-stone-600">
                  <div className="font-bold text-stone-800">{c.clienteNome || 'Cliente não identificado'}</div>
                  <div className="text-[11px] text-stone-400">Aberta às {c.horaAbertura} por {c.abertoPor}</div>
                </div>

                <div className="pt-2 text-xs text-stone-500">
                  {c.itens.length} {c.itens.length === 1 ? 'item lançado' : 'itens lançados'}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-4">
                <span className="text-[11px] text-stone-400 font-semibold uppercase">Total</span>
                <span className="text-base font-extrabold text-stone-900 font-mono">
                  {formatCurrency(c.total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Comanda Detail Modal */}
      {selectedComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Comanda #{selectedComanda.numero}</h3>
                <p className="text-xs text-stone-400">Cliente: {selectedComanda.clienteNome || 'Balcão'}</p>
              </div>
              <button 
                onClick={() => setSelectedComanda(null)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Itens Consumidos</span>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {selectedComanda.itens.map((it, idx) => (
                    <div key={idx} className="p-3 flex justify-between text-xs hover:bg-stone-50">
                      <div>
                        <span className="font-bold text-stone-900">{it.quantidade}x</span> {it.nome}
                      </div>
                      <span className="font-mono font-bold text-stone-800">
                        {formatCurrency(it.precoUnitario * it.quantidade)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-900">
                <span>TOTAL A PAGAR:</span>
                <span className="text-base text-amber-700">{formatCurrency(selectedComanda.total)}</span>
              </div>
            </div>

            <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-between gap-2">
              <button
                onClick={() => setSelectedComanda(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Voltar
              </button>

              <button
                onClick={() => handleCloseActiveComanda(selectedComanda)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                Fechar Comanda & Liberar Cartão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Comanda Modal */}
      {isNewComandaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Abrir Nova Comanda</h3>
              <button onClick={() => setIsNewComandaOpen(false)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateComanda} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Número do Cartão / Comanda:</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 105"
                  value={newComandaNum}
                  onChange={(e) => setNewComandaNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-base font-bold text-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nome do Cliente (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Oliveira"
                  value={newComandaCliente}
                  onChange={(e) => setNewComandaCliente(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewComandaOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                >
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
