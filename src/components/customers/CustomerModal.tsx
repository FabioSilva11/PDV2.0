import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { X, Save, User, Phone, MapPin, FileText, Heart } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  customerToEdit?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customerToEdit
}) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [preferencias, setPreferencias] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setNome(customerToEdit.nome || '');
      setTelefone(customerToEdit.telefone || '');
      setCpf(customerToEdit.cpf || '');
      const addr = customerToEdit.enderecos?.[0];
      setLogradouro(addr?.logradouro || '');
      setNumero(addr?.numero || '');
      setBairro(addr?.bairro || '');
      setComplemento(addr?.complemento || '');
      setPreferencias(customerToEdit.preferencias || '');
    } else {
      setNome('');
      setTelefone('');
      setCpf('');
      setLogradouro('');
      setNumero('');
      setBairro('');
      setComplemento('');
      setPreferencias('');
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) return;

    const addresses = logradouro.trim() ? [{
      id: customerToEdit?.enderecos?.[0]?.id || `addr-${Date.now()}`,
      logradouro: logradouro.trim(),
      numero: numero.trim() || 'S/N',
      bairro: bairro.trim() || 'Centro',
      complemento: complemento.trim() || undefined,
      referencia: undefined,
      principal: true
    }] : (customerToEdit?.enderecos || []);

    const updatedCustomer: Customer = {
      id: customerToEdit?.id || `cust-${Date.now()}`,
      nome: nome.trim(),
      telefone: telefone.trim(),
      whatsapp: customerToEdit?.whatsapp || telefone.trim(),
      email: customerToEdit?.email,
      aniversario: customerToEdit?.aniversario,
      endereco: addresses[0]
        ? {
            logradouro: addresses[0].logradouro,
            numero: addresses[0].numero,
            bairro: addresses[0].bairro,
            complemento: addresses[0].complemento,
            pontoReferencia: addresses[0].referencia,
          }
        : customerToEdit?.endereco || { logradouro: '', numero: '', bairro: '' },
      quantidadePedidos: customerToEdit?.quantidadePedidos || customerToEdit?.totalPedidos || 0,
      cpf: cpf.trim() || undefined,
      enderecos: addresses,
      totalPedidos: customerToEdit?.totalPedidos || 0,
      totalGasto: customerToEdit?.totalGasto || 0,
      ticketMedio: customerToEdit?.ticketMedio || 0,
      ultimoPedidoEm: customerToEdit?.ultimoPedidoEm,
      ultimoPedidoData: customerToEdit?.ultimoPedidoData || customerToEdit?.ultimoPedidoEm,
      produtosFavoritos: customerToEdit?.produtosFavoritos || [],
      observacoes: preferencias.trim() || customerToEdit?.observacoes,
      preferencias: preferencias.trim() || undefined
    };

    onSave(updatedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-base">
              {customerToEdit ? 'Editar Cliente' : 'Novo Cliente (CRM & Delivery)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nome Completo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Eduardo Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Telefone / WhatsApp *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="(11) 99999-8888"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">CPF (Opcional p/ Nota)</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Endereço de Entrega (Delivery)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-stone-600">Rua / Logradouro</label>
                <input
                  type="text"
                  placeholder="Ex: Rua das Flores"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600">Número</label>
                <input
                  type="text"
                  placeholder="120"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600">Bairro</label>
                <input
                  type="text"
                  placeholder="Ex: Jardim América"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600">Complemento / Ap</label>
                <input
                  type="text"
                  placeholder="Apto 42, Bloco B"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Preferências / Observações */}
          <div className="pt-2 border-t border-stone-100 space-y-1">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-amber-600" />
              <span>Preferências & Restrições Alimentares</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Sem cebola, alérgico a camarão, prefere mesa no salão principal..."
              value={preferencias}
              onChange={(e) => setPreferencias(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
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
              <span>Salvar Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
