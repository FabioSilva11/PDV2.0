import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Supplier } from '../../types';
import { Truck, Search, Plus, Phone, Mail, Clock, CreditCard, Building2 } from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { suppliers = [] } = useRestaurant();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = suppliers.filter(s => 
    (s.nome && s.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.cnpj && s.cnpj.includes(searchTerm)) ||
    (s.empresa && s.empresa.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.categoria && s.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-600" />
            Fornecedores Cadastrados
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Controle de contatos, prazos médios de entrega e insumos fornecidos
          </p>
        </div>

        <button
          id="new-supplier-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Fornecedor
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por razão social, CNPJ ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{s.nome}</h3>
                  <p className="text-[11px] font-mono text-stone-400">CNPJ: {s.cnpj}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize">
                  {s.categoria || s.empresa || 'Fornecedor'}
                </span>
              </div>

              <div className="space-y-1 text-xs text-stone-600 pt-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{s.telefone} {s.contato ? `(Contato: ${s.contato})` : (s.whatsapp ? `• WA: ${s.whatsapp}` : '')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{s.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Prazo médio de entrega: <strong>{s.prazoMedioEntregaDias ? `${s.prazoMedioEntregaDias} dias` : '2 a 4 dias'}</strong></span>
                </div>
                {s.produtosFornecidos && s.produtosFornecidos.length > 0 && (
                  <div className="text-[11px] text-stone-500 pt-1">
                    <span className="font-semibold text-stone-600">Insumos: </span>
                    {s.produtosFornecidos?.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <div className="text-[11px] text-stone-500">
                Pagtos: {s.condicoesPagamento && s.condicoesPagamento.length > 0 ? s.condicoesPagamento.join(', ') : 'Boleto 28d / Pix'}
              </div>
              <button 
                id={`supplier-order-btn-${s.id}`}
                className="text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                Cotar Insumos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
