import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, CategoryType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export const MenuManagementView: React.FC = () => {
  const { 
    menu, 
    categories, 
    saveMenuItem, 
    deleteMenuItem, 
    toggleItemAvailability, 
    updateItemPrice,
    resetMenuToDefaults 
  } = useRestaurant();

  const [selectedCatalog, setSelectedCatalog] = useState<'restaurante' | 'lanche'>('restaurante');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);

  // New/Edit item form state
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState<{
    catalogo: 'restaurante' | 'lanche';
    nome: string;
    categoria: CategoryType;
    preco: string;
    descricao: string;
    acompanhamentos: string[];
    tamanho: string;
    usarVariacoes: boolean;
    volumes: { nome: string; quantidade: string; unidade: string; preco: string; disponivel: boolean }[];
  }>({
    catalogo: 'restaurante',
    nome: '',
    categoria: 'Pratos principais',
    preco: '',
    descricao: '',
    acompanhamentos: ['Arroz branco', 'Macarrão', 'Farofa', 'Salada crua'],
    tamanho: '',
    usarVariacoes: false,
    volumes: [
      { nome: 'Opção 1', quantidade: '', unidade: 'un', preco: '', disponivel: true },
      { nome: 'Opção 2', quantidade: '', unidade: 'un', preco: '', disponivel: true },
      { nome: 'Opção 3', quantidade: '', unidade: 'un', preco: '', disponivel: true }
    ]
  });
  const [formError, setFormError] = useState('');

  const filteredItems = menu.filter(item => {
    const matchCatalog = (item.catalogo || 'restaurante') === selectedCatalog;
    const matchCat = selectedCategory === 'Todos' || item.categoria === selectedCategory;
    const matchSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.descricao && item.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCatalog && matchCat && matchSearch;
  });

  const handleStartPriceEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditingPrice(item.preco.toFixed(2));
  };

  const handleSavePriceEdit = (id: string) => {
    const val = parseFloat(editingPrice);
    if (!isNaN(val) && val >= 0) {
      updateItemPrice(id, val);
    }
    setEditingItemId(null);
  };

  const handleStartFullEdit = (item: MenuItem) => {
    setEditingProduct(item);
    setNewItem({
      catalogo: item.catalogo || 'restaurante',
      nome: item.nome,
      categoria: item.categoria,
      preco: item.preco.toString(),
      descricao: item.descricao || '',
      acompanhamentos: item.acompanhamentos ? [...item.acompanhamentos] : [],
      tamanho: item.tamanho || '',
      usarVariacoes: !!(item.variacoes && item.variacoes.length > 0),
      volumes: item.variacoes?.length
        ? item.variacoes.map(v => ({
            nome: v.nome,
            quantidade: v.quantidade?.toString() || '',
            unidade: v.unidade || 'un',
            preco: v.preco.toString(),
            disponivel: v.disponivel !== false
          }))
        : [
            { nome: 'Opção 1', quantidade: '', unidade: 'un', preco: '', disponivel: true },
            { nome: 'Opção 2', quantidade: '', unidade: 'un', preco: '', disponivel: true },
            { nome: 'Opção 3', quantidade: '', unidade: 'un', preco: '', disponivel: true }
          ]
    });
    setFormError('');
    setIsNewItemModalOpen(true);
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const isJuice = newItem.categoria === 'Sucos de Frutas';
    const hasVariations = newItem.usarVariacoes || isJuice;
    const priceVal = parseFloat(newItem.preco);
    const validVariations = newItem.volumes.filter(v => v.nome.trim() && v.disponivel && parseFloat(v.preco) >= 0 && v.preco !== '');
    if (!newItem.nome.trim()) {
      setFormError('Informe o nome do produto.');
      return;
    }
    if (!hasVariations && (isNaN(priceVal) || priceVal < 0)) {
      setFormError('Informe um preço válido para este produto.');
      return;
    }
    if (hasVariations && validVariations.length === 0) {
      setFormError('Cadastre pelo menos uma opção disponível com nome e preço.');
      return;
    }

    const sides = newItem.acompanhamentos.map(s => s.trim()).filter(Boolean);

    const item: MenuItem = {
      id: editingProduct ? editingProduct.id : 'custom-' + Math.random().toString(36).substring(2, 9),
      catalogo: newItem.catalogo,
      nome: newItem.nome.trim(),
      categoria: newItem.categoria,
      preco: hasVariations ? parseFloat(validVariations[0].preco) : priceVal,
      descricao: newItem.descricao.trim() || undefined,
      tamanho: newItem.tamanho.trim() || undefined,
      acompanhamentos: newItem.categoria === 'Pratos principais' && sides.length > 0 ? sides : undefined,
      variacoes: hasVariations ? newItem.volumes.filter(v => v.nome.trim()).map((v, index) => ({ id: `variation-${index}`, nome: v.nome.trim(), preco: parseFloat(v.preco) || 0, custoEstimado: 0, disponivel: v.disponivel, quantidade: parseFloat(v.quantidade) || undefined, unidade: v.unidade })) : undefined,
      disponivel: editingProduct ? editingProduct.disponivel : true
    };

    saveMenuItem(item);
    setIsNewItemModalOpen(false);
    setEditingProduct(null);
    setNewItem({
      catalogo: selectedCatalog,
      nome: '',
      categoria: 'Pratos principais',
      preco: '',
      descricao: '',
      acompanhamentos: ['Arroz branco', 'Macarrão', 'Farofa', 'Salada crua'],
      tamanho: '',
      usarVariacoes: false,
      volumes: [{ nome: 'Opção 1', quantidade: '', unidade: 'un', preco: '', disponivel: true }, { nome: 'Opção 2', quantidade: '', unidade: 'un', preco: '', disponivel: true }, { nome: 'Opção 3', quantidade: '', unidade: 'un', preco: '', disponivel: true }]
    });
    setFormError('');
  };

  const variationUnits = newItem.categoria === 'Sucos de Frutas'
    ? [{ value: 'ml', label: 'ml' }]
    : newItem.categoria === 'Bebidas'
      ? [{ value: 'un', label: 'unidade(s)' }, { value: 'l', label: 'litro(s)' }]
      : [{ value: 'un', label: 'unidade(s)' }, { value: 'g', label: 'g' }, { value: 'kg', label: 'kg' }, { value: 'porção', label: 'porção' }];

  const variationLabel = newItem.categoria === 'Sucos de Frutas'
    ? 'Volumes (ml), preços e disponibilidade'
    : newItem.categoria === 'Bebidas'
      ? 'Embalagens, volumes, preços e disponibilidade'
      : 'Opções, quantidades, preços e disponibilidade';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-blue-600" />
            <span>Gestão do Cardápio & Preços</span>
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre novos itens, altere preços instantaneamente e controle a disponibilidade
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (confirm('Deseja redefinir o cardápio com os dados originais do Murupi Restaurante?')) {
                resetMenuToDefaults();
              }
            }}
            className="px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            title="Restaurar Cardápio Padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar Padrão</span>
          </button>

          <button
            type="button"
            id="menu-add-product-btn"
            onClick={() => { setFormError(''); setIsNewItemModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="menu-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome do prato, sobremesa, lanche ou ingrediente..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['restaurante','lanche'] as const).map(catalog => (
            <button
              key={catalog}
              type="button"
              onClick={() => { setSelectedCatalog(catalog); setSelectedCategory('Todos'); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                selectedCatalog === catalog
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {catalog === 'restaurante' ? 'Cardápio Restaurante' : 'Cardápio Lanche'}
            </button>
          ))}
        </div>
        {/* Categories scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('Todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'Todos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-700'
            }`}
          >
            Todos ({menu.filter(m => (m.catalogo || 'restaurante') === selectedCatalog).length})
          </button>
          {categories.map((cat) => {
            const count = menu.filter(m => (m.catalogo || 'restaurante') === selectedCatalog && m.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-700'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item / Prato</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Acompanhamentos / Descrição</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Preço (R$)</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const availableVariations = item.variacoes?.filter(v => v.disponivel !== false) || [];
              const isEditing = editingItemId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm block">
                        {item.nome}
                      </span>
                      {item.tamanho && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Tamanho: {item.tamanho}
                        </span>
                      )}
                      {item.variacoes && item.variacoes.length > 0 && (
                        <span className="text-[10px] text-sky-700 font-semibold block">
                          {availableVariations.length} de {item.variacoes.length} opções • {availableVariations.length > 0 ? `a partir de ${formatCurrency(Math.min(...availableVariations.map(v => v.preco)))}` : 'sem opções disponíveis'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-900 border border-sky-200">
                        {item.categoria}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {item.variacoes && item.variacoes.length > 0 ? (
                        <div className="text-[11px] text-slate-600 line-clamp-2">
                          <span className="font-semibold text-slate-700">Opções: </span>
                          {item.variacoes.map(v => `${v.nome}${v.quantidade && !v.nome.toLowerCase().includes(String(v.quantidade)) ? ` (${v.quantidade} ${v.unidade || ''})` : ''} — ${formatCurrency(v.preco)}`).join(', ')}
                        </div>
                      ) : item.acompanhamentos && item.acompanhamentos.length > 0 ? (
                        <div className="text-[11px] text-slate-600 line-clamp-2">
                          <span className="font-semibold text-slate-700">Guarnições: </span>
                          {item.acompanhamentos?.join(', ')}
                        </div>
                      ) : item.descricao ? (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {item.descricao}
                        </p>
                      ) : (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleItemAvailability(item.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 ${
                          item.disponivel
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title={item.disponivel ? "Clique para marcar como Esgotado" : "Clique para marcar como Disponível"}
                      >
                        {item.disponivel ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{item.disponivel ? 'Disponível' : 'Esgotado'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.10"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePriceEdit(item.id);
                              if (e.key === 'Escape') setEditingItemId(null);
                            }}
                            autoFocus
                            className="w-20 px-1.5 py-0.5 border border-sky-500 rounded text-right font-mono font-bold bg-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePriceEdit(item.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartPriceEdit(item)}
                          className="hover:text-blue-600 hover:underline flex items-center justify-end gap-1 ml-auto"
                          title="Clique para editar o preço"
                        >
                          <span>{formatCurrency(item.preco)}</span>
                          <Edit3 className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          id={`edit-item-${item.id}`}
                          onClick={() => handleStartFullEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Cadastro Completo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          id={`delete-item-${item.id}`}
                          onClick={() => {
                            if (confirm(`Remover "${item.nome}" do cardápio?`)) {
                              deleteMenuItem(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    Nenhum produto cadastrado nesta categoria ou busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Menu Item */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-serif">
                {editingProduct ? 'Editar Produto do Cardápio' : 'Cadastrar Novo Item no Cardápio'}
              </h3>
              <button
                onClick={() => { setIsNewItemModalOpen(false); setEditingProduct(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="p-6 space-y-4">
              {/* Escolha Explícita de Catálogo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cardápio de Destino *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="catalog-select-restaurante"
                    onClick={() => setNewItem({ ...newItem, catalogo: 'restaurante' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      newItem.catalogo === 'restaurante'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>🍽️ Cardápio Restaurante</span>
                  </button>
                  <button
                    type="button"
                    id="catalog-select-lanche"
                    onClick={() => setNewItem({ ...newItem, catalogo: 'lanche' })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      newItem.catalogo === 'lanche'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>🍔 Cardápio Lanche</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Item / Prato *
                </label>
                <input
                  type="text"
                  required
                  value={newItem.nome}
                  onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                  placeholder="Ex: Filé à Parmegiana, X-Salada Especial..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={newItem.categoria}
                    onChange={(e) => {
                      const categoria = e.target.value as CategoryType;
                      const volumes = categoria === 'Sucos de Frutas'
                        ? [{ nome: '100 ml', quantidade: '100', unidade: 'ml', preco: '', disponivel: true }, { nome: '200 ml', quantidade: '200', unidade: 'ml', preco: '', disponivel: true }, { nome: '300 ml', quantidade: '300', unidade: 'ml', preco: '', disponivel: true }, { nome: '400 ml', quantidade: '400', unidade: 'ml', preco: '', disponivel: true }]
                        : newItem.volumes.map((volume, index) => ({
                            ...volume,
                            nome: volume.nome.includes('ml') ? `Opção ${index + 1}` : volume.nome,
                            unidade: categoria === 'Bebidas' && volume.unidade === 'ml' ? 'un' : categoria !== 'Bebidas' && volume.unidade === 'ml' ? 'un' : volume.unidade
                          }));
                      setNewItem({ ...newItem, categoria, volumes });
                      setFormError('');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {!newItem.usarVariacoes && newItem.categoria !== 'Sucos de Frutas' && <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newItem.preco}
                    onChange={(e) => setNewItem({ ...newItem, preco: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>}
              </div>

              {newItem.categoria !== 'Sucos de Frutas' && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={newItem.usarVariacoes} onChange={e => setNewItem({ ...newItem, usarVariacoes: e.target.checked })} />
                  Este produto possui opções de tamanho, quantidade ou apresentação
                </label>
              )}

              {(newItem.usarVariacoes || newItem.categoria === 'Sucos de Frutas') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{variationLabel}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {newItem.volumes.map((volume, index) => (
                      <div key={volume.nome} className="rounded-xl border border-slate-200 p-2">
                        <input value={volume.nome} onChange={e => { const volumes = [...newItem.volumes]; volumes[index] = { ...volume, nome: e.target.value }; setNewItem({ ...newItem, volumes }); }} className="w-full px-2 py-1 mb-1 rounded-lg border border-slate-300 text-[11px] font-bold" placeholder="Ex.: 10 unidades" />
                        <input type="number" min="0" step="0.01" value={volume.quantidade} onChange={e => { const volumes = [...newItem.volumes]; volumes[index] = { ...volume, quantidade: e.target.value }; setNewItem({ ...newItem, volumes }); }} className="w-full px-2 py-1 mb-1 rounded-lg border border-slate-300 text-[11px]" placeholder={newItem.categoria === 'Sucos de Frutas' ? 'Volume em ml' : 'Quantidade (opcional)'} />
                        <select value={volume.unidade} onChange={e => { const volumes = [...newItem.volumes]; volumes[index] = { ...volume, unidade: e.target.value }; setNewItem({ ...newItem, volumes }); }} className="w-full px-2 py-1 mb-1 rounded-lg border border-slate-300 text-[11px]">
                          {variationUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                        </select>
                        <input type="number" step="0.01" required={volume.disponivel} placeholder="Preço" value={volume.preco} onChange={e => { const volumes = [...newItem.volumes]; volumes[index] = { ...volume, preco: e.target.value }; setNewItem({ ...newItem, volumes }); }} className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs" />
                        <label className="flex items-center gap-1 mt-2 text-[10px] text-slate-500"><input type="checkbox" checked={volume.disponivel} onChange={e => { const volumes = [...newItem.volumes]; volumes[index] = { ...volume, disponivel: e.target.checked }; setNewItem({ ...newItem, volumes }); }} /> Disponível</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção de Guarnições / Acompanhamentos em Cards Individuais */}
              {newItem.categoria === 'Pratos principais' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Guarnições / Acompanhamentos ({newItem.acompanhamentos.length})
                    </label>
                    <button
                      type="button"
                      id="add-guarnicao-btn"
                      onClick={() => setNewItem({ ...newItem, acompanhamentos: [...newItem.acompanhamentos, ''] })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-blue-800 text-xs font-bold border border-sky-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Adicionar Guarnição</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {newItem.acompanhamentos.map((acomp, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 hover:border-slate-300 transition-all shadow-2xs"
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Nome da guarnição (ex: Arroz Branco, Farofa...)"
                            value={acomp}
                            onChange={(e) => {
                              const updated = [...newItem.acompanhamentos];
                              updated[idx] = e.target.value;
                              setNewItem({ ...newItem, acompanhamentos: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <button
                          type="button"
                          id={`remove-guarnicao-${idx}`}
                          onClick={() => {
                            const updated = newItem.acompanhamentos.filter((_, i) => i !== idx);
                            setNewItem({ ...newItem, acompanhamentos: updated });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                          title="Remover Guarnição"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {newItem.acompanhamentos.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400 italic border border-dashed border-slate-300 rounded-xl">
                        Nenhuma guarnição cadastrada. Clique em "+ Adicionar Guarnição".
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newItem.descricao}
                  onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                  placeholder="Breve descrição dos ingredientes ou preparo..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsNewItemModalOpen(false); setEditingProduct(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="save-menu-item-submit-btn"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Salvar no Cardápio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
