import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { UserAccount, UserRole, PermissionKey } from '../../types';
import { ShieldCheck, Plus, KeyRound } from 'lucide-react';

const roles: UserRole[] = ['administrador', 'gerente', 'caixa', 'garcom'];

const ALL_PERMISSIONS: PermissionKey[] = ['pdv', 'pedidos', 'mesas', 'caixa', 'cardapio', 'clientes', 'reservas', 'desconto', 'cancelamento', 'reabertura', 'auditoria', 'usuarios', 'impressoras', 'configuracoes'];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  pdv: 'PDV', pedidos: 'Pedidos', mesas: 'Mesas', caixa: 'Caixa', cardapio: 'Cardápio',
  clientes: 'Clientes', reservas: 'Reservas', desconto: 'Desconto', cancelamento: 'Cancelamento',
  reabertura: 'Reabertura', auditoria: 'Auditoria', usuarios: 'Usuários', impressoras: 'Impressoras', configuracoes: 'Configurações',
};

/** Gerenciamento de usuários. Senhas são hasheadas (PBKDF2), nunca salvas em texto puro. */
export const UsersView: React.FC = () => {
  const { users, saveUser, changeUserPassword, currentUser, hasPermission } = useRestaurant();
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const empty: UserAccount = { id: '', nome: '', usuario: '', cargo: '', perfil: 'garcom', ativo: true, permissoes: ['pdv', 'pedidos', 'mesas'] };

  const save = async () => {
    if (!editing?.nome || !editing.usuario) return;
    setError('');
    try {
      const payload: UserAccount = { ...editing, id: editing.id || `usr-${Date.now()}` };
      if (password) {
        // Salva o usuário primeiro, depois aplica o hash da senha.
        saveUser(payload);
        await changeUserPassword(payload.id, password);
      } else {
        saveUser(payload);
      }
      setEditing(null);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
    }
  };

  const togglePermission = (p: PermissionKey) => {
    if (!editing) return;
    const has = editing.permissoes.includes(p);
    setEditing({ ...editing, permissoes: has ? editing.permissoes.filter(x => x !== p) : [...editing.permissoes, p] });
  };

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5"><div className="flex justify-between"><div><h2 className="text-xl font-bold font-serif flex gap-2 items-center"><ShieldCheck className="w-6 h-6 text-blue-600" />Usuários & Permissões</h2><p className="text-xs text-stone-500">Perfis e permissões operacionais do PDV. Senhas armazenadas com hash PBKDF2.</p></div><button onClick={() => { setEditing(empty); setPassword(''); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"><Plus className="w-4 h-4 inline mr-1" />Novo usuário</button></div><div className="bg-white border rounded-2xl overflow-hidden"><table className="w-full text-xs"><thead className="bg-stone-50"><tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Usuário</th><th className="p-3 text-left">Perfil</th><th className="p-3 text-left">Senha</th><th className="p-3">Ativo</th><th className="p-3"></th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-t"><td className="p-3 font-bold">{u.nome}{u.isPrimaryAdmin && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase">Admin principal</span>}</td><td className="p-3">{u.usuario}</td><td className="p-3 uppercase">{u.perfil}</td><td className="p-3">{u.senhaHash ? <span className="text-emerald-700">definida</span> : <span className="text-rose-600">não definida</span>}</td><td className="p-3 text-center">{u.ativo ? 'Sim' : 'Não'}</td><td className="p-3 text-right"><button onClick={() => { setEditing(u); setPassword(''); }} className="text-blue-700 font-bold">Editar</button></td></tr>)}</tbody></table></div>
    {editing && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 max-h-[92vh] overflow-y-auto"><h3 className="font-bold">Usuário</h3>
      {error && <div role="alert" className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}
      <input value={editing.nome} onChange={e => setEditing({ ...editing, nome: e.target.value })} placeholder="Nome" className="w-full p-2.5 border rounded-xl" />
      <input value={editing.usuario} onChange={e => setEditing({ ...editing, usuario: e.target.value })} placeholder="Usuário (login)" className="w-full p-2.5 border rounded-xl" />
      <input value={editing.cargo} onChange={e => setEditing({ ...editing, cargo: e.target.value })} placeholder="Cargo" className="w-full p-2.5 border rounded-xl" />
      <select value={editing.perfil} onChange={e => setEditing({ ...editing, perfil: e.target.value as UserRole })} className="w-full p-2.5 border rounded-xl">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={editing.ativo} onChange={e => setEditing({ ...editing, ativo: e.target.checked })} /> Ativo</label>
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1"><KeyRound className="w-3.5 h-3.5" />{editing.id ? 'Nova senha (opcional)' : 'Senha'}</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={editing.id ? 'Deixe vazio para manter' : 'Mínimo 4 caracteres'} className="w-full p-2.5 border rounded-xl" />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Permissões</div>
        <div className="flex flex-wrap gap-1.5">{ALL_PERMISSIONS.map(p => <button key={p} type="button" onClick={() => togglePermission(p)} className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${editing.permissoes.includes(p) ? 'bg-sky-100 border-sky-300 text-sky-900' : 'bg-white border-stone-200 text-stone-500'}`}>{PERMISSION_LABELS[p]}</button>)}</div>
      </div>
      <div className="flex justify-end gap-2"><button onClick={() => setEditing(null)} className="px-4 py-2 bg-stone-100 rounded-xl text-xs font-bold">Cancelar</button><button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Salvar</button></div></div></div>}
    {!hasPermission('usuarios') && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">Somente usuários com permissão podem editar. Seu usuário: {currentUser?.nome}.</div>}
  </div>;
};
