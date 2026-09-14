import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { PurchaseOrder } from '../../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Truck, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Tag
} from 'lucide-react';

const DEFAULT_PRICE_HISTORIES = [
  { id: 'ph-1', ingredienteNome: 'Queijo Muçarela', fornecedorNome: 'Laticínios da Serra', variacaoPercentual: 22.2, precoAnterior: 36.00, precoAtual: 44.00, data: '2026-09-08' },
  { id: 'ph-2', ingredienteNome: 'Picanha Bovina', fornecedorNome: 'Sul Carnes Nobres', variacaoPercentual: 8.9, precoAnterior: 67.00, precoAtual: 73.00, data: '2026-09-05' },
  { id: 'ph-3', ingredienteNome: 'Óleo de Soja 900ml', fornecedorNome: 'Distribuidora Central', variacaoPercentual: -5.4, precoAnterior: 7.40, precoAtual: 7.00, data: '2026-09-01' },
  { id: 'ph-4', ingredienteNome: 'Batata Pré-Frita Pacote 2kg', fornecedorNome: 'Congelados Express', variacaoPercentual: 4.1, precoAnterior: 24.00, precoAtual: 25.00, data: '2026-08-28' }
];

export const PurchasesView: React.FC = () => {
  const { purchaseOrders = [], suppliers = [], ingredients = [] } = useRestaurant();
  const priceHistories = DEFAULT_PRICE_HISTORIES;

  const [activeTab, setActiveTab] = useState<'pedidos' | 'cotacoes' | 'historico_precos'>('pedidos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = purchaseOrders.filter(o => 
    o.fornecedorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.numero.toString().includes(searchTerm)
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-600" />
            Compras, Cotações & Variação de Preços
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Acompanhe pedidos de reposição com fornecedores e monitoramento de inflação de matérias-primas
          </p>
        </div>

        <button
          id="new-purchase-order-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido de Compra
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'pedidos' 
              ? 'border-amber-600 text-amber-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Ordens de Compra ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('historico_precos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'historico_precos' 
              ? 'border-amber-600 text-amber-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>Monitor de Preços & Variação</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
            +22% alerta
          </span>
        </button>
      </div>

      {/* Tab: Ordens de Compra */}
      {activeTab === 'pedidos' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por número da ordem ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ordem #</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Data Emissão</th>
                    <th className="py-3 px-4">Previsão Entrega</th>
                    <th className="py-3 px-4">Itens</th>
                    <th className="py-3 px-4">Valor Total</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        #{po.numero}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800">
                        {po.fornecedorNome}
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-mono">
                        {new Date(po.dataEmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-mono">
                        {new Date(po.dataPrevisaoEntrega).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {(po.itens || []).map(i => `${i.quantidade}x ${i.ingredienteNome}`).join(', ')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        {formatCurrency(po.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          po.status === 'entregue'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.status === 'aprovado'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Histórico & Variação de Preços */}
      {activeTab === 'historico_precos' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Alerta de Oscilação de Preços (CMV)</div>
              <p className="mt-0.5">
                O sistema detectou variações expressivas nas últimas cotações de insumos essenciais (ex: Queijo Muçarela +22,2% e Picanha Bovina +8,9%). Revise as fichas técnicas e a precificação de venda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priceHistories.map((hist) => {
              const isUp = hist.variacaoPercentual > 0;
              return (
                <div key={hist.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">{hist.ingredienteNome}</h4>
                      <p className="text-xs text-stone-500">Fornecedor: {hist.fornecedorNome}</p>
                    </div>
                    <span className={`flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                      isUp ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {isUp ? `+${hist.variacaoPercentual.toFixed(1)}%` : `${hist.variacaoPercentual.toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs font-mono">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Preço Anterior</span>
                      <strong className="text-stone-700">{formatCurrency(hist.precoAnterior)}</strong>
                    </div>
                    <div className="text-stone-300 font-sans">→</div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Preço Atual</span>
                      <strong className={`font-bold ${isUp ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatCurrency(hist.precoAtual)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Data Atualização</span>
                      <span className="text-stone-500">{new Date(hist.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
