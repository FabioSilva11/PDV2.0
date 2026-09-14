import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { StaffUser } from '../../types';
import { StaffModal } from './StaffModal';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Shield, 
  Key, 
  CheckCircle, 
  XCircle, 
  Edit2, 
  Trash2
} from 'lucide-react';

export const StaffView: React.FC = () => {
  const { 
    staffList = [], 
    currentUser, 
    addStaffMember, 
    updateStaffPermissions, 
    deleteStaffMember 
  } = useRestaurant();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  const filtered = (staffList || []).filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: StaffUser) => {
    setEditingStaff(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (id === currentUser.id) {
      alert('Você não pode excluir o operador atualmente em sessão!');
      return;
    }
    if (window.confirm(`Tem certeza que deseja desvincular o colaborador "${name}"?`)) {
      deleteStaffMember(id);
    }
  };

  const handleSave = (user: StaffUser) => {
    if (editingStaff) {
      // update permissions and details
      updateStaffPermissions(user.id, user.permissoes);
    } else {
      addStaffMember(user);
    }
  };

  const toggleSinglePermission = (user: StaffUser, permKey: keyof StaffUser['permissoes']) => {
    const updated = {
      ...user.permissoes,
      [permKey]: !user.permissoes[permKey]
    };
    updateStaffPermissions(user.id, updated);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-600" />
            Equipe, Cargos & Matriz de Permissões
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Controle de acessos dinâmico para cancelamentos, descontos, estorno de pagamentos e fechamento cego
          </p>
        </div>

        <button
          id="new-staff-btn"
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar colaborador por nome ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Staff Cards & Permission Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((user) => {
          const isMe = user.id === currentUser?.id;
          return (
            <div 
              key={user.id} 
              className={`bg-white p-5 rounded-2xl border shadow-2xs space-y-4 flex flex-col justify-between ${
                isMe ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-stone-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm">
                      {user.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-stone-900">{user.nome}</h3>
                        {isMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-600 text-white rounded">
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">{user.cargo}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {user.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Permissions checklist (Clickable to toggle!) */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-stone-500" />
                      Permissões (Clique p/ alternar)
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">PIN: ••••</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { key: 'cancelarPedido', label: 'Cancelar Pedido' },
                      { key: 'cancelarItem', label: 'Cancelar Item' },
                      { key: 'aplicarDesconto', label: 'Descontos' },
                      { key: 'estornarPagamento', label: 'Estornos' },
                      { key: 'fechamentoCegoCaixa', label: 'Fechamento Cego' },
                      { key: 'reabrirConta', label: 'Reabrir Conta' },
                    ].map(perm => {
                      const enabled = !!user.permissoes[perm.key as keyof StaffUser['permissoes']];
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => toggleSinglePermission(user, perm.key as keyof StaffUser['permissoes'])}
                          className={`flex items-center gap-1.5 p-1 rounded-lg text-left transition-colors cursor-pointer ${
                            enabled ? 'hover:bg-emerald-50' : 'hover:bg-stone-200/60'
                          }`}
                          title="Clique para alternar esta permissão"
                        >
                          {enabled ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                          )}
                          <span className={enabled ? 'text-stone-800 font-medium' : 'text-stone-400 line-through'}>
                            {perm.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <button
                    id={`edit-staff-${user.id}`}
                    onClick={() => handleOpenEdit(user)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
                    title="Editar colaborador"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!isMe && (
                    <button
                      id={`delete-staff-${user.id}`}
                      onClick={() => handleDelete(user.id, user.nome)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                      title="Excluir colaborador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        staffToEdit={editingStaff}
      />
    </div>
  );
};
