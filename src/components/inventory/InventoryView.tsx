import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Ingredient, StockBatch } from '../../types';
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  CalendarClock, 
  History, 
  Layers, 
  Scale,
  DollarSign,
  TrendingUp,
  Tag
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { 
    ingredients = [], 
    batches = [], 
    stockMovements = [], 
    addStockMovement,
    menu = [],
    currentUser 
  } = useRestaurant();

  const stockLots = batches;
  const menuItems = menu;

  const [activeTab, setActiveTab] = useState<'insumos' | 'lotes' | 'movimentacoes'>('insumos');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');

  // New movement modal state
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState(ingredients[0]?.id || '');
  const [movTipo, setMovTipo] = useState<'entrada' | 'saida_manual' | 'perda' | 'ajuste_inventario'>('entrada');
  const [movQuantidade, setMovQuantidade] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [movCustoUnitario, setMovCustoUnitario] = useState('');

  const categories = ['todas', ...Array.from(new Set(ingredients.map(i => i.categoria)))];

  const filteredIngredients = ingredients.filter(ing => {
    const matchSearch = ing.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'todas' || ing.categoria === categoryFilter;
    return matchSearch && matchCat;
  });

  const criticalCount = ingredients.filter(i => i.estoqueAtual <= i.estoqueMinimo).length;
  
  // Expiry check
  const now = new Date();
  const expiringLots = stockLots.filter(l => {
    const expDate = new Date(l.dataValidade);
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7;
  });

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(movQuantidade.replace(',', '.')) || 0;
    const custo = movCustoUnitario ? parseFloat(movCustoUnitario.replace(',', '.')) : undefined;

    if (qty <= 0) return;

    addStockMovement(
      selectedIngredientId,
      movTipo,
      qty,
      movMotivo || `Registro manual de ${movTipo}`,
      custo
    );

    setIsNewMovementOpen(false);
    setMovQuantidade('');
    setMovMotivo('');
    setMovCustoUnitario('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-600" />
            Controle de Estoque & Insumos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Gerencie matérias-primas, baixas automáticas por ficha técnica e lotes de validade
          </p>
        </div>

        <button
          id="open-stock-movement-modal-btn"
          onClick={() => setIsNewMovementOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Movimento / Ajuste
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total de Insumos Cadastrados</span>
          <div className="text-2xl font-extrabold text-stone-900">{ingredients.length} itens</div>
          <div className="text-[11px] text-stone-500">Com ficha técnica e rastreabilidade</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Estoque Crítico / Mínimo</span>
          <div className="text-2xl font-extrabold text-amber-700">{criticalCount} itens</div>
          <div className="text-[11px] text-stone-500">Abaixo da margem de segurança configurada</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Lotes Próximos do Vencimento</span>
          <div className="text-2xl font-extrabold text-rose-700">{expiringLots.length} lotes</div>
          <div className="text-[11px] text-stone-500">Vencimento nos próximos 7 dias</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          id="stock-tab-insumos"
          onClick={() => setActiveTab('insumos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'insumos' 
              ? 'border-amber-600 text-amber-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Insumos & Quantidades ({ingredients.length})
        </button>

        <button
          id="stock-tab-lotes"
          onClick={() => setActiveTab('lotes')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'lotes' 
              ? 'border-amber-600 text-amber-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>Lotes & Validades</span>
          {expiringLots.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] rounded-full font-extrabold">
              {expiringLots.length}
            </span>
          )}
        </button>

        <button
          id="stock-tab-movimentacoes"
          onClick={() => setActiveTab('movimentacoes')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'movimentacoes' 
              ? 'border-amber-600 text-amber-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Histórico de Movimentações ({stockMovements.length})
        </button>
      </div>

      {/* Tab 1: Insumos List */}
      {activeTab === 'insumos' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar insumo por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500 font-semibold">Categoria:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-700 font-medium focus:outline-none capitalize"
              >
                {categories.map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Estoque Atual</th>
                    <th className="py-3 px-4">Estoque Mínimo</th>
                    <th className="py-3 px-4">Custo Médio Unitário</th>
                    <th className="py-3 px-4">Valor em Estoque</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredIngredients.map((ing) => {
                    const isLow = ing.estoqueAtual <= ing.estoqueMinimo;
                    const totalVal = ing.estoqueAtual * ing.custoUnitario;

                    return (
                      <tr key={ing.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">
                          <div>{ing.nome}</div>
                          <div className="text-[10px] text-stone-400 font-normal">ID: {ing.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 capitalize font-medium">
                            {ing.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                            isLow 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ing.estoqueAtual.toFixed(1)} {ing.unidade}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600">
                          {ing.estoqueMinimo} {ing.unidade}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                          {formatCurrency(ing.custoUnitario)} / {ing.unidade}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {formatCurrency(totalVal)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            id={`quick-adjust-${ing.id}`}
                            onClick={() => {
                              setSelectedIngredientId(ing.id);
                              setIsNewMovementOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-800 text-stone-700 font-semibold transition-colors"
                          >
                            Ajustar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lotes & Validades */}
      {activeTab === 'lotes' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-800">Controle de Lotes e Rastreabilidade</h3>
              <p className="text-xs text-stone-500">Monitoramento contra desperdício e segurança alimentar (PVPS)</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-200 text-stone-700">
              {stockLots.length} lotes ativos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Lote / Insumo</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Qtd. Restante</th>
                  <th className="py-3 px-4">Data de Entrada</th>
                  <th className="py-3 px-4">Data de Validade</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stockLots.map((lote) => {
                  const ing = ingredients.find(i => i.id === lote.ingredienteId);
                  const expDate = new Date(lote.dataValidade);
                  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                  const isExpired = diffDays < 0;
                  const isExpiring = diffDays >= 0 && diffDays <= 7;

                  return (
                    <tr key={lote.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        <div>{lote.numeroLote}</div>
                        <div className="text-[11px] text-stone-500 font-normal">{ing?.nome || 'Insumo'}</div>
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {lote.fornecedorNome}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {lote.quantidadeAtual} {ing?.unidade || 'un'}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {new Date(lote.dataEntrada).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {new Date(lote.dataValidade).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
                            VENCIDO
                          </span>
                        ) : isExpiring ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 animate-pulse">
                            Vence em {diffDays} dia{diffDays > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                            Em conformidade
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Movimentações */}
      {activeTab === 'movimentacoes' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-800">Histórico de Baixas e Entradas</h3>
              <p className="text-xs text-stone-500">Registro cronológico detalhado com rastreabilidade</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-200 text-stone-700">
              {stockMovements.length} movimentações
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Quantidade</th>
                  <th className="py-3 px-4">Motivo / Documento</th>
                  <th className="py-3 px-4">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stockMovements.map((mov) => {
                  const ing = ingredients.find(i => i.id === mov.ingredienteId);
                  const isPositive = mov.tipo === 'entrada';

                  return (
                    <tr key={mov.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {new Date(mov.dataHora).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800">
                        {ing?.nome || mov.ingredienteId}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          mov.tipo === 'entrada' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : mov.tipo === 'saida_venda' 
                            ? 'bg-sky-100 text-sky-800' 
                            : mov.tipo === 'perda' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {mov.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-stone-800'}>
                          {isPositive ? '+' : '-'}{mov.quantidade} {ing?.unidade || ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {mov.motivo}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {mov.usuario}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Movement / Adjustment Modal */}
      {isNewMovementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Movimentação de Estoque</h3>
              <button 
                onClick={() => setIsNewMovementOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Insumo:</label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.nome} (Atual: {ing.estoqueAtual} {ing.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Tipo de Operação:</label>
                <select
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none font-semibold"
                >
                  <option value="entrada">Entrada (Compra / Recebimento)</option>
                  <option value="saida_manual">Saída Manual</option>
                  <option value="perda">Perda / Descarte / Avaria</option>
                  <option value="ajuste_inventario">Ajuste de Balanço / Inventário</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Quantidade:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 5"
                    value={movQuantidade}
                    onChange={(e) => setMovQuantidade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 font-bold focus:outline-none"
                  />
                </div>

                {(movTipo === 'entrada' || movTipo === 'ajuste_inventario') && <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Custo Unitário (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={movCustoUnitario}
                    onChange={(e) => setMovCustoUnitario(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none"
                  />
                </div>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Motivo / Justificativa:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nota Fiscal 1420 / Quebra de frasco / Inventário semanal"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewMovementOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                >
                  Gravar Movimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
