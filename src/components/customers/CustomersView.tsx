import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Customer } from '../../types';
import { Users, Plus, Search, Trash2 } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer } = useRestaurant();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const filtered = customers.filter(c => `${c.nome} ${c.telefone || ''}`.toLowerCase().includes(search.toLowerCase()));
  const empty: Customer = { id: '', nome: '', telefone: '', cpf: '', endereco: '', observacoes: '', criadoEm: new Date().toISOString() };
  const save = () => { if (!editing?.nome.trim()) return; saveCustomer({ ...editing, id: editing.id || `cli-${Date.now()}`, criadoEm: editing.criadoEm || new Date().toISOString() }); setEditing(null); };
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold font-serif flex items-center gap-2"><Users className="w-6 h-6 text-blue-600"/>Clientes</h2><p className="text-xs text-stone-500">Cadastro e histórico básico de clientes.</p></div><button onClick={()=>setEditing(empty)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex gap-1.5 items-center"><Plus className="w-4 h-4"/>Novo cliente</button></div>
    <div className="bg-white rounded-2xl border border-stone-200 p-4"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente ou telefone" className="w-full pl-9 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"/></div></div>
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden"><table className="w-full text-xs"><thead className="bg-stone-50"><tr><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Telefone</th><th className="p-3 text-left">Endereço</th><th className="p-3 text-right">Total comprado</th><th className="p-3"></th></tr></thead><tbody>{filtered.map(c=><tr key={c.id} className="border-t border-stone-100"><td className="p-3 font-bold">{c.nome}</td><td className="p-3">{c.telefone || '—'}</td><td className="p-3">{c.endereco || '—'}</td><td className="p-3 text-right font-mono">R$ {(c.totalComprado || 0).toFixed(2)}</td><td className="p-3 text-right"><button onClick={()=>setEditing(c)} className="text-blue-700 font-bold mr-3">Editar</button><button onClick={()=>deleteCustomer(c.id)} className="text-rose-600"><Trash2 className="w-4 h-4"/></button></td></tr>)}{!filtered.length&&<tr><td colSpan={5} className="p-8 text-center text-stone-400">Nenhum cliente cadastrado.</td></tr>}</tbody></table></div>
    {editing && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3"><h3 className="font-bold text-lg">{editing.id?'Editar cliente':'Novo cliente'}</h3>{[['nome','Nome'],['telefone','Telefone'],['cpf','CPF'],['endereco','Endereço'],['observacoes','Observações']].map(([key,label])=><input key={key} value={(editing as any)[key] || ''} onChange={e=>setEditing({...editing,[key]:e.target.value})} placeholder={label} className="w-full p-2.5 border border-stone-200 rounded-xl text-sm"/>)}<div className="flex justify-end gap-2"><button onClick={()=>setEditing(null)} className="px-4 py-2 rounded-xl bg-stone-100 text-xs font-bold">Cancelar</button><button onClick={save} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">Salvar</button></div></div></div>}
  </div>;
};
