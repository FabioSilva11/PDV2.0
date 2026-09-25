import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { AppModule } from '../../types';
import { 
  LayoutDashboard, 
  Receipt, 
  Utensils, 
  DollarSign, 
  BookMarked, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  ShoppingBag, Users, CalendarDays, ShieldCheck, ClipboardList
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { 
    activeModule, 
    setActiveModule, 
    orders, 
    tables, 
    currentUser,
  } = useRestaurant();

  // Computed badges
  const pendingOrdersCount = orders.filter(o => o.status === 'novo' || o.status === 'confirmado').length;
  const occupiedTablesCount = tables.filter(t => t.status === 'ocupada' || t.status === 'conta').length;

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
        { id: 'pedidos', label: 'Pedidos', icon: Receipt, badge: pendingOrdersCount, badgeColor: 'bg-sky-100 text-sky-800' },
        { id: 'pdv', label: 'Frente de Caixa (PDV)', icon: ShoppingBag },
        { id: 'mesas', label: 'Mesas & Salão', icon: Utensils, badge: occupiedTablesCount, badgeColor: 'bg-blue-100 text-blue-800' },
        { id: 'caixa', label: 'Caixa do Turno', icon: DollarSign },
      ]
    },
    {
      title: 'GERENCIAMENTO',
      items: [
        { id: 'cardapio', label: 'Cardápio & Fichas', icon: BookMarked },
        { id: 'impressoras', label: 'Impressoras & Fila', icon: Printer },
        { id: 'clientes', label: 'Clientes', icon: Users },
        { id: 'reservas', label: 'Reservas', icon: CalendarDays },
        { id: 'usuarios', label: 'Usuários & Permissões', icon: ShieldCheck },
        { id: 'auditoria', label: 'Auditoria', icon: ClipboardList },
      ]
    }
  ];

  return (
    <aside 
      className={`bg-white text-slate-700 border-r border-slate-200/90 shadow-xs transition-all duration-300 flex flex-col z-30 select-none ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Brand Header */}
      <div className="h-13 px-3 border-b border-slate-100 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              M
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 tracking-wide truncate">Murupi PDV</div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Matriz Centro
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            M
          </div>
        )}

        <button
          id="toggle-sidebar-btn"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-auto"
          title={collapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-200">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
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
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group relative ${
                    isActive 
                      ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20' 
                      : 'text-slate-600 hover:bg-sky-50 hover:text-blue-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                  
                  {!collapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {item.badge && item.badge > 0 && (
                    <span 
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                        collapsed ? 'absolute top-1 right-1' : ''
                      } ${isActive ? 'bg-blue-800 text-white' : item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {item.label}{item.badge && item.badge > 0 ? ` · ${item.badge}` : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Operator profile footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50/70">
        <div
          id="user-profile-menu-trigger"
          className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {currentUser.nome.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <div className="text-xs font-semibold text-slate-800 truncate">{currentUser.nome}</div>
              <div className="text-[10px] text-sky-600 font-medium truncate">{currentUser.cargo}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
