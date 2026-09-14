import React, { useState } from 'react';
import { FinancialEntry } from '../../types';
import { X, Save, PiggyBank, Calendar, DollarSign, Tag, FileText } from 'lucide-react';

interface FinancialEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<FinancialEntry, 'id'>) => void;
}

export const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [categoria, setCategoria] = useState<'insumos' | 'fixas' | 'pessoal' | 'variaveis' | 'outros'>('fixas');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'pendente' | 'pago'>('pago');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValor = parseFloat(valor.replace(',', '.'));
    if (!descricao.trim() || isNaN(numValor) || numValor <= 0) return;

    onSave({
      descricao: descricao.trim(),
      tipo,
      categoria,
      valor: numValor,
      dataVencimento,
      dataPagamento: status === 'pago' ? new Date().toISOString().split('T')[0] : undefined,
      status,
      origem: 'manual'
    });

    setDescricao('');
    setValor('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-base">
              Novo Lançamento Financeiro
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTipo('despesa')}
              className={`py-2 rounded-lg font-bold text-xs transition-all ${
                tipo === 'despesa' ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              [-] Despesa / Conta a Pagar
            </button>
            <button
              type="button"
              onClick={() => setTipo('receita')}
              className={`py-2 rounded-lg font-bold text-xs transition-all ${
                tipo === 'receita' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              [+] Receita Extra
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Descrição do Lançamento *</label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel do Imóvel, Conta de Luz Enel, Compra de Gás"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Valor (R$) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Categoria DRE</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="fixas">Despesas Fixas (Aluguel, Luz)</option>
                <option value="pessoal">Pessoal (Folha, Pró-labore)</option>
                <option value="insumos">Insumos (Alimentos, Bebidas)</option>
                <option value="variaveis">Variáveis (Embalagens, Taxas)</option>
                <option value="outros">Outros Lançamentos</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Data de Vencimento</label>
              <input
                type="date"
                required
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Status Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="pago">Liquidado / Pago</option>
                <option value="pendente">Pendente / A Pagar</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Lançamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
