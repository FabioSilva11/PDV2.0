import React, { useState, useEffect } from 'react';
import { StaffUser } from '../../types';
import { X, Save, UserCheck, Key, Shield, Check } from 'lucide-react';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: StaffUser) => void;
  staffToEdit?: StaffUser | null;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSave,
  staffToEdit
}) => {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('Operador de Caixa');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [pin, setPin] = useState('1234');
  const [ativo, setAtivo] = useState(true);
  const [permissoes, setPermissoes] = useState({
    cancelarPedido: false,
    cancelarItem: false,
    aplicarDesconto: false,
    estornarPagamento: false,
    fechamentoCegoCaixa: false,
    reabrirConta: false,
  });

  useEffect(() => {
    if (staffToEdit) {
      setNome(staffToEdit.nome);
      setCargo(staffToEdit.cargo);
      setUsuario(staffToEdit.usuario || '');
      setSenha(staffToEdit.senha || '');
      setPin(staffToEdit.pin);
      setAtivo(staffToEdit.ativo);
      setPermissoes({
        cancelarPedido: !!staffToEdit.permissoes.cancelarPedido,
        cancelarItem: !!staffToEdit.permissoes.cancelarItem,
        aplicarDesconto: !!staffToEdit.permissoes.aplicarDesconto,
        estornarPagamento: !!staffToEdit.permissoes.estornarPagamento,
        fechamentoCegoCaixa: !!staffToEdit.permissoes.fechamentoCegoCaixa,
        reabrirConta: !!staffToEdit.permissoes.reabrirConta,
      });
    } else {
      setNome('');
      setCargo('Operador de Caixa');
      setUsuario('');
      setSenha('');
      setPin(Math.floor(1000 + Math.random() * 9000).toString());
      setAtivo(true);
      setPermissoes({
        cancelarPedido: false,
        cancelarItem: false,
        aplicarDesconto: false,
        estornarPagamento: false,
        fechamentoCegoCaixa: false,
        reabrirConta: false,
      });
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !usuario.trim() || (!staffToEdit && !senha.trim())) return;

    const updatedUser: StaffUser = {
      id: staffToEdit?.id || `staff-${Date.now()}`,
      nome: nome.trim(),
      cargo,
      telefone: staffToEdit?.telefone || '',
      usuario: usuario.trim().toLowerCase(),
      status: ativo ? 'ativo' : 'inativo',
      senha: senha.trim() || staffToEdit?.senha || '1234',
      pin: pin.trim() || '1234',
      ativo,
      permissoes
    };

    onSave(updatedUser);
    onClose();
  };

  const togglePerm = (key: keyof typeof permissoes) => {
    setPermissoes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-base">
              {staffToEdit ? 'Editar Colaborador' : 'Novo Colaborador & Credenciais'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nome do Colaborador *</label>
            <input
              type="text"
              required
              placeholder="Ex: Roberto Almeida"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Usuário de acesso *</label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Ex: joao.silva"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value.replace(/\s+/g, '.'))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Senha de acesso {!staffToEdit && '*'}</label>
              <input
                type="password"
                required={!staffToEdit}
                minLength={4}
                autoComplete={staffToEdit ? 'new-password' : 'new-password'}
                placeholder={staffToEdit ? 'Deixe vazio para manter' : 'Mínimo de 4 caracteres'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Cargo / Função</label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Gerente Geral">Gerente Geral</option>
                <option value="Operador de Caixa">Operador de Caixa</option>
                <option value="Garçom / Atendente">Garçom / Atendente</option>
                <option value="Chef de Cozinha">Chef de Cozinha</option>
                <option value="Pizzaiolo / Chapa">Pizzaiolo / Chapa</option>
                <option value="Entregador / Courier">Entregador / Courier</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">PIN de Autorização (4 dígitos)</label>
              <div className="relative">
                <Key className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="staff-active-check"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="staff-active-check" className="text-xs font-bold text-stone-800 cursor-pointer">
              Colaborador com acesso ativo ao sistema
            </label>
          </div>

          {/* Matriz de Permissões */}
          <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Matriz de Permissões de Segurança</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'cancelarPedido', label: 'Cancelar Pedido Inteiro' },
                { key: 'cancelarItem', label: 'Cancelar Item Produzido' },
                { key: 'aplicarDesconto', label: 'Conceder Descontos' },
                { key: 'estornarPagamento', label: 'Estornar Pagamento' },
                { key: 'fechamentoCegoCaixa', label: 'Fechar Caixa Cego' },
                { key: 'reabrirConta', label: 'Reabrir Conta Finalizada' },
              ].map(perm => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={permissoes[perm.key as keyof typeof permissoes]}
                    onChange={() => togglePerm(perm.key as keyof typeof permissoes)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-stone-700 font-medium text-xs">{perm.label}</span>
                </label>
              ))}
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
              <span>Salvar Colaborador</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
