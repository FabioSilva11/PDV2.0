import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { AppModule } from '../../types';
import { 
  LayoutDashboard, 
  Receipt, 
  Utensils, 
  BookOpen, 
  DollarSign, 
  ChefHat, 
  BookMarked, 
  Boxes, 
  ShoppingCart, 
  Truck, 
  Bike, 
  Users2, 
  UserCheck, 
  PiggyBank, 
  BarChart3, 
  Printer, 
  Settings, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  ShoppingBag
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, onLogout }) => {
  const { 
    activeModule, 
    setActiveModule, 
    orders, 
    tables, 
    ingredients, 
    stockMovements,
    currentUser,
  } = useRestaurant();

  const [showUserMenu, setShowUserMenu] = useState(false);

  // Computed badges
  const pendingOrdersCount = orders.filter(o => o.status === 'novo' || o.status === 'confirmado').length;
  const occupiedTablesCount = tables.filter(t => t.status === 'ocupada' || t.status === 'conta').length;
  const kdsCount = orders.filter(o => o.status === 'novo' || o.status === 'em_preparacao').length;
  // O alerta de estoque só aparece depois que houver uma movimentação registrada;
  // assim o menu não transforma o estoque demonstrativo inicial em um alerta falso.
  const lowStockCount = stockMovements.length > 0
    ? ingredients.filter(i => i.estoqueAtual <= i.estoqueMinimo).length
    : 0;

  interface NavSection {
    title: string;
    items: {
      id: AppModule;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number | null;
      badgeColor?: string;
    }[];
  }

  const sections: NavSection[] = [
    {
      title: 'OPERAÇÃO',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'pedidos', label: 'Pedidos', icon: Receipt, badge: pendingOrdersCount, badgeColor: 'bg-amber-500 text-stone-900' },
        { id: 'pdv', label: 'Frente de Caixa (PDV)', icon: ShoppingBag },
        { id: 'mesas', label: 'Mesas & Salão', icon: Utensils, badge: occupiedTablesCount, badgeColor: 'bg-sky-500 text-white' },
        { id: 'comandas', label: 'Comandas', icon: BookOpen },
        { id: 'caixa', label: 'Caixa do Turno', icon: DollarSign },
        { id: 'kds', label: 'Cozinha (KDS)', icon: ChefHat, badge: kdsCount, badgeColor: 'bg-rose-500 text-white' },
        { id: 'delivery', label: 'Delivery & Entregas', icon: Bike },
      ]
    },
    {
      title: 'PRODUTOS & ESTOQUE',
      items: [
        { id: 'cardapio', label: 'Cardápio & Fichas', icon: BookMarked },
        { id: 'estoque', label: 'Estoque & Validades', icon: Boxes, badge: lowStockCount, badgeColor: 'bg-amber-600 text-white' },
        { id: 'compras', label: 'Compras & Cotações', icon: ShoppingCart },
        { id: 'fornecedores', label: 'Fornecedores', icon: Truck },
      ]
    },
    {
      title: 'GESTÃO & SAAS',
      items: [
        { id: 'clientes', label: 'Clientes (CRM)', icon: Users2 },
        { id: 'funcionarios', label: 'Funcionários & Cargos', icon: UserCheck },
        { id: 'financeiro', label: 'Financeiro Gerencial', icon: PiggyBank },
        { id: 'relatorios', label: 'Relatórios & BI', icon: BarChart3 },
        { id: 'impressoras', label: 'Impressoras & Fila', icon: Printer },
        { id: 'auditoria', label: 'Auditoria de Ações', icon: ShieldAlert },
        { id: 'configuracoes', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  return (
    <aside 
      className={`bg-stone-900 text-stone-300 border-r border-stone-800 transition-all duration-300 flex flex-col z-30 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-stone-800 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              M
            </div>
            <div className="truncate">
              <div className="text-sm font-bold text-white tracking-wide truncate">Murupi SaaS</div>
              <div className="text-[11px] text-stone-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Matriz Centro
              </div>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            M
          </div>
        )}

        <button
          id="toggle-sidebar-btn"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors ml-auto"
          title={collapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin scrollbar-thumb-stone-700">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setActiveModule(item.id)}
                  aria-label={item.badge && item.badge > 0 ? `${item.label} (${item.badge})` : item.label}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                    isActive 
                      ? 'bg-amber-600 text-white font-semibold shadow-sm' 
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-stone-400 group-hover:text-amber-400'}`} />
                  
                  {!collapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {item.badge && item.badge > 0 && (
                    <span 
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        collapsed ? 'absolute top-1 right-1' : ''
                      } ${isActive ? 'bg-stone-900/40 text-white' : item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-stone-950 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {item.label}{item.badge && item.badge > 0 ? ` · ${item.badge}` : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Operator profile footer & Switcher */}
      <div className="p-3 border-t border-stone-800 relative bg-stone-950/40">
        <button
          id="user-profile-menu-trigger"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-stone-800 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
            {currentUser.nome.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <div className="text-xs font-semibold text-stone-200 truncate">{currentUser.nome}</div>
              <div className="text-[10px] text-amber-400 font-medium truncate">{currentUser.cargo}</div>
            </div>
          )}
        </button>

        {/* Sessão atual */}
        {showUserMenu && (
          <div className="absolute bottom-16 left-3 w-56 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-2 py-1.5 text-[11px] font-bold text-stone-400 border-b border-stone-800 mb-1 flex items-center justify-between">
              <span>Sessão autenticada</span>
            </div>
            <p className="px-2 py-2 text-[11px] leading-4 text-stone-400">
              Para trocar de operador, encerre esta sessão e entre com outro usuário.
            </p>
            <button
              id="logout-btn"
              onClick={() => { setShowUserMenu(false); onLogout(); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-rose-300 hover:bg-rose-950/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do sistema
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
