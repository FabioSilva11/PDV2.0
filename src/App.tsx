import React, { useState, useEffect } from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { POSView } from './components/pdv/POSView';
import { TablesView } from './components/tables/TablesView';
import { ComandasView } from './components/comandas/ComandasView';
import { CashierView } from './components/cashier/CashierView';
import { KDSView } from './components/kitchen/KDSView';
import { DeliveryView } from './components/delivery/DeliveryView';
import { MenuManagementView } from './components/menu/MenuManagementView';
import { PrintersView } from './components/printers/PrintersView';

// Global Modals
import { ManualPaymentModal } from './components/payment/ManualPaymentModal';
import { OrderDetailsModal } from './components/orders/OrderDetailsModal';
import { ThermalReceiptModal } from './components/orders/ThermalReceiptModal';
import { OperationHealthModal } from './components/layout/OperationHealthModal';
import { AlertsDrawer } from './components/layout/AlertsDrawer';

const MainAppContent: React.FC = () => {
  const { activeModule, setActiveModule } = useRestaurant();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Keyboard shortcuts (F1 = PDV, F2 = Pedidos, F3 = Mesas, F4 = KDS, F5 = Caixa)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveModule('pdv');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveModule('pedidos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveModule('mesas');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveModule('kds');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveModule('caixa');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveModule]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-900">
      <div className="flex flex-1 overflow-hidden h-screen">
        {/* Left SaaS Navigation Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* SaaS Header Topbar */}
          <Topbar />

          {/* Dynamic Module Viewport */}
          <main className="flex-1 overflow-y-auto bg-stone-100/90 pb-16">
            {activeModule === 'dashboard' && <DashboardView />}
            {activeModule === 'pedidos' && <OrdersView />}
            {activeModule === 'pdv' && <POSView />}
            {activeModule === 'mesas' && <TablesView />}
            {activeModule === 'comandas' && <ComandasView />}
            {activeModule === 'caixa' && <CashierView />}
            {activeModule === 'kds' && <KDSView />}
            {activeModule === 'delivery' && <DeliveryView />}
            {activeModule === 'cardapio' && <MenuManagementView />}
            {activeModule === 'impressoras' && <PrintersView />}
          </main>

          {/* Quick status bar at the bottom */}
          <footer className="bg-white border-t border-stone-200 py-1.5 px-4 text-stone-500 text-[11px] flex items-center justify-between z-10 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-stone-700">Murupi Gastronomia & Lanches</span>
              <span>• Ecossistema SaaS v3.2</span>
              <span className="hidden md:inline text-stone-400">• Pagamentos Manuais (Sem gateway externo)</span>
            </div>

            <div className="flex items-center gap-3 text-stone-400 text-[10px]">
              <span className="hidden sm:inline">Atalhos:</span>
              <span><kbd className="px-1 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-stone-600">F1</kbd> PDV</span>
              <span><kbd className="px-1 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-stone-600">F2</kbd> Pedidos</span>
              <span><kbd className="px-1 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-stone-600">F3</kbd> Mesas</span>
              <span><kbd className="px-1 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-stone-600">F4</kbd> KDS</span>
              <span><kbd className="px-1 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-stone-600">F5</kbd> Caixa</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Modals Mounted at Root */}
      <ManualPaymentModal />
      <OrderDetailsModal />
      <ThermalReceiptModal />
      <OperationHealthModal />
      <AlertsDrawer />
    </div>
  );
};

export default function App() {
  return (
    <RestaurantProvider>
      <MainAppContent />
    </RestaurantProvider>
  );
}