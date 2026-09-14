import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Customer } from '../../types';
import { CustomerModal } from './CustomerModal';
import { 
  Users2, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Heart, 
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  Award,
  ArrowRight
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers = [], saveCustomer, deleteCustomer, setActiveModule } = useRestaurant();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [filterType, setFilterType] = useState<'todos' | 'vip' | 'recentes'>('todos');

  const filtered = (customers || []).filter(c => {
    const matchSearch = 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.includes(searchTerm) ||
      (c.cpf && c.cpf.includes(searchTerm));

    if (!matchSearch) return false;

    if (filterType === 'vip') return (c.totalGasto || 0) > 300 || (c.totalPedidos || 0) >= 5;
    if (filterType === 'recentes') return !!c.ultimoPedidoEm;
    return true;
  });

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cadastro do cliente "${name}"?`)) {
      deleteCustomer(id);
    }
  };

  const handleSave = (customer: Customer) => {
    saveCustomer(customer);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Users2 className="w-6 h-6 text-amber-600" />
            Clientes (CRM & Fidelidade)
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Base de dados dinâmica de clientes, histórico de consumo e endereços de delivery
          </p>
        </div>

        <button
          id="new-customer-btn"
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente por nome, telefone ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              filterType === 'todos' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('vip')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1 ${
              filterType === 'vip' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            VIPs (+R$300)
          </button>
          <button
            onClick={() => setFilterType('recentes')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              filterType === 'recentes' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Recentes
          </button>
        </div>
      </div>

      {/* Grid of Customers */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <Users2 className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-800">Nenhum cliente encontrado</h3>
          <p className="text-xs text-stone-500">
            Cadastre um novo cliente usando o botão acima ou ajuste os filtros de busca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const isVip = (c.totalGasto || 0) > 300 || (c.totalPedidos || 0) >= 5;
            return (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between hover:border-amber-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-stone-900">{c.nome}</h3>
                        {isVip && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded border border-amber-300">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{c.telefone}</span>
                        {c.cpf && <span className="font-mono text-[11px] text-stone-400">({c.cpf})</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">Total Gasto</span>
                      <span className="font-mono font-extrabold text-sm text-stone-900">
                        {formatCurrency(c.totalGasto || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {c.enderecos && c.enderecos.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-700 flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div>{c.enderecos[0].logradouro}, {c.enderecos[0].numero} - {c.enderecos[0].bairro}</div>
                        {c.enderecos[0].complemento && (
                          <div className="text-stone-400 text-[11px]">{c.enderecos[0].complemento}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats & Favorites */}
                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-stone-400 block text-[10px]">Pedidos Feitos</span>
                      <strong className="text-stone-800 font-bold">{c.totalPedidos || 0} compras</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-stone-400 block text-[10px]">Ticket Médio</span>
                      <strong className="text-stone-800 font-bold">
                        {formatCurrency(c.totalPedidos && c.totalPedidos > 0 ? (c.totalGasto || 0) / c.totalPedidos : 0)}
                      </strong>
                    </div>
                  </div>

                  {c.preferencias && (
                    <div className="text-xs text-amber-800 italic flex items-center gap-1 pt-1 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                      <Heart className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Obs: {c.preferencias}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-customer-${c.id}`}
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
                      title="Editar cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-customer-${c.id}`}
                      onClick={() => handleDelete(c.id, c.nome)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    id={`customer-new-order-${c.id}`}
                    onClick={() => setActiveModule('pdv')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition-colors"
                  >
                    <span>Lançar Pedido</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        customerToEdit={editingCustomer}
      />
    </div>
  );
};
