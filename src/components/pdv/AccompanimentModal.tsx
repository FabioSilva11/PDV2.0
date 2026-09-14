import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { X, Check, Utensils, AlertCircle } from 'lucide-react';

interface AccompanimentModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: MenuItem, accompaniments: string[], observation: string, removals: string[]) => void;
}

export const AccompanimentModal: React.FC<AccompanimentModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [observation, setObservation] = useState<string>('');
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');

  useEffect(() => {
    if (item) {
      // By default pre-select all standard accompaniments
      setSelectedSides(item.acompanhamentos || []);
      setObservation('');
      setSelectedVariationId(item.variacoes?.find(v => v.disponivel !== false)?.id || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const hasSides = item.acompanhamentos && item.acompanhamentos.length > 0;
  const hasVariations = item.variacoes && item.variacoes.length > 0;
  const availableVariations = item.variacoes?.filter(v => v.disponivel !== false) || [];
  const isJuice = item.categoria === 'Sucos de Frutas';
  const observationChips = isJuice
    ? ['Sem açúcar', 'Pouco gelo', 'Sem gelo']
    : item.categoria === 'Bebidas'
      ? ['Gelada', 'Sem gelo', 'Com gelo']
      : item.categoria === 'Pratos principais'
        ? ['Sem cebola', 'Bem passado', 'Ao ponto', 'Sem maionese', 'Molho à parte']
        : item.categoria === 'Porções Extras'
          ? ['Bem servido', 'Molho à parte', 'Sem sal']
          : [];
  const observationLabel = isJuice
    ? 'Observações do suco'
    : item.categoria === 'Bebidas'
      ? 'Observações da bebida'
      : 'Observações do preparo / cozinha';
  const observationPlaceholder = isJuice
    ? 'Ex.: sem açúcar, pouco gelo, bem gelado...'
    : item.categoria === 'Bebidas'
      ? 'Ex.: bem gelada, sem gelo, abrir na hora...'
      : 'Ex.: carne bem passada, sem cebola, molho à parte...';

  const toggleSide = (side: string) => {
    setSelectedSides(prev =>
      prev.includes(side) ? prev.filter(s => s !== side) : [...prev, side]
    );
  };

  const handleSelectAll = () => {
    if (item.acompanhamentos) {
      setSelectedSides([...item.acompanhamentos]);
    }
  };

  const handleClearAll = () => {
    setSelectedSides([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const variation = item.variacoes?.find(v => v.id === selectedVariationId);
    if (hasVariations && !variation) return;
    const variationLabel = variation
      ? `${variation.nome}${variation.quantidade !== undefined && !variation.nome.toLowerCase().includes(String(variation.quantidade)) ? ` (${variation.quantidade} ${variation.unidade || ''})` : ''}`
      : undefined;
    const itemToAdd = variation
      ? { ...item, preco: variation.preco, tamanho: variationLabel, variacoes: undefined }
      : item;
    const removals = item.acompanhamentos?.filter(side => !selectedSides.includes(side)) || [];
    onConfirm(itemToAdd, selectedSides, observation.trim(), removals);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif leading-tight">
                {item.nome}
              </h2>
              <div className="text-xs text-amber-400 font-mono font-semibold">
                {hasVariations ? (availableVariations.length > 0 ? `A partir de ${formatCurrency(Math.min(...availableVariations.map(v => v.preco)))}` : 'Sem opções disponíveis') : formatCurrency(item.preco)}
              </div>
            </div>
          </div>
          <button
            id="accompaniment-modal-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {item.descricao && (
            <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
              {item.descricao}
            </p>
          )}

          {hasVariations && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">{isJuice ? 'Escolha o volume' : 'Escolha uma opção'}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {item.variacoes.map(variation => (
                  <button key={variation.id} type="button" disabled={variation.disponivel === false}
                    onClick={() => setSelectedVariationId(variation.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold ${selectedVariationId === variation.id ? 'bg-amber-50 border-amber-500 text-amber-900' : 'border-stone-200 text-stone-600'} ${variation.disponivel === false ? 'opacity-40 cursor-not-allowed line-through' : ''}`}>
                    <span className="block">{variation.nome}</span>
                    {variation.quantidade !== undefined && !variation.nome.toLowerCase().includes(String(variation.quantidade)) && <span className="block text-[10px] text-stone-500">Quantidade: {variation.quantidade} {variation.unidade || ''}</span>}
                    <span className="block mt-1">{variation.disponivel === false ? 'Indisponível' : formatCurrency(variation.preco)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Accompaniments Selection */}
          {hasSides ? (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Guarnições & Acompanhamentos
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-stone-500 hover:text-stone-700"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.acompanhamentos!.map((side) => {
                  const isChecked = selectedSides.includes(side);
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => toggleSide(side)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        isChecked
                          ? 'bg-amber-50 border-amber-500 text-amber-950 font-semibold shadow-xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <span>{side}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-stone-300'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedSides.length === 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Nenhum acompanhamento selecionado (prato será servido puro).</span>
                </div>
              )}
            </div>
          ) : hasVariations ? null : (
            <div className="text-xs text-stone-500 italic">
              Este item não possui opções adicionais pré-definidas.
            </div>
          )}

          {/* Cooking notes / Observations */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              {observationLabel}
            </label>
            <input
              type="text"
              id="item-observation-input"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder={observationPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
            />
            {/* Quick observation chips */}
            {observationChips.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">
              {observationChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setObservation(prev => prev ? `${prev}, ${chip}` : chip)}
                  className="px-2 py-1 bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 border border-stone-200 text-[11px] rounded-lg transition-colors"
                >
                  +{chip}
                </button>
              ))}
            </div>}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            id="accompaniment-cancel-btn"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="accompaniment-confirm-btn"
            onClick={handleSubmit}
            disabled={!!hasVariations && !selectedVariationId}
            className="flex-1 max-w-xs px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Adicionar ao Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
