import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { 
  ShoppingCart, 
  LayoutGrid, 
  ChefHat, 
  CircleDollarSign, 
  UtensilsCrossed, 
  BarChart3 
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, orders, tables, cart } = useRestaurant();

  const kitchenPending = orders.filter(o => o.status === 'pendente' || o.status === 'preparando').length;
  const occupiedTables = tables.filter(t => t.status === 'ocupada' || t.status === 'conta').length;

  const navItems = [
    {
      id: 'pdv' as const,
      label: 'Frente de Caixa (PDV)',
      icon: ShoppingCart,
      badge: cart.length > 0 ? `${cart.length}` : null,
      badgeColor: 'bg-amber-500 text-stone-900',
    },
    {
      id: 'mesas' as const,
      label: 'Mesas & Comandas',
      icon: LayoutGrid,
      badge: occupiedTables > 0 ? `${occupiedTables}` : null,
      badgeColor: 'bg-sky-600 text-white',
    },
    {
      id: 'kds' as const,
      label: 'Cozinha (KDS)',
      icon: ChefHat,
      badge: kitchenPending > 0 ? `${kitchenPending}` : null,
      badgeColor: 'bg-amber-500 text-stone-900',
    },
    {
      id: 'caixa' as const,
      label: 'Fluxo de Caixa',
      icon: CircleDollarSign,
      badge: null,
    },
    {
      id: 'cardapio' as const,
      label: 'Cardápio & Preços',
      icon: UtensilsCrossed,
      badge: null,
    },
    {
      id: 'relatorios' as const,
      label: 'Relatórios & Vendas',
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <nav className="bg-white border-b border-stone-200 shadow-xs sticky top-[65px] md:top-[65px] z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
