import React, { useState, useEffect } from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { LoginView } from './components/admin/LoginView';
import { SetupWizard } from './components/admin/SetupWizard';
import { SettingsView } from './components/admin/SettingsView';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { POSView } from './components/pdv/POSView';
import { TablesView } from './components/tables/TablesView';
import { CashierView } from './components/cashier/CashierView';
import { MenuManagementView } from './components/menu/MenuManagementView';
import { PrintersView } from './components/printers/PrintersView';
import { CustomersView } from './components/customers/CustomersView';
import { ReservationsView } from './components/reservations/ReservationsView';
import { UsersView } from './components/admin/UsersView';
import { AuditView } from './components/admin/AuditView';

// Global Modals
import { ManualPaymentModal } from './components/payment/ManualPaymentModal';
import { OrderDetailsModal } from './components/orders/OrderDetailsModal';
import { ThermalReceiptModal } from './components/orders/ThermalReceiptModal';
import { OperationHealthModal } from './components/layout/OperationHealthModal';
import { AlertsDrawer } from './components/layout/AlertsDrawer';

const MainAppContent: React.FC = () => {
  const { activeModule, setActiveModule, currentUser, authChecked, needsSetup, settings } = useRestaurant();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Atalhos: F1 PDV, F2 Pedidos, F3 Mesas, F4 Caixa
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
      } else if (e.key === 'F5' || e.key === 'F4') {
        e.preventDefault();
        setActiveModule('caixa');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveModule]);

  // Gate de autenticação: primeiro o assistente de configuração inicial
  // (quando não há settings), depois o login. Nenhum usuário fixo no código.
  if (!authChecked) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Carregando…</div>;
  }
  if (needsSetup) {
    return <SetupWizard />;
  }
  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-200 selection:text-sky-900">
      <div className="flex flex-1 overflow-hidden h-screen">
        {/* Left SaaS Navigation Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
          {/* SaaS Header Topbar */}
          <Topbar />

          {/* Dynamic Module Viewport */}
          <main className="flex-1 overflow-y-auto bg-slate-50/70 pb-16">
            {activeModule === 'dashboard' && <DashboardView />}
            {activeModule === 'pedidos' && <OrdersView />}
            {activeModule === 'pdv' && <POSView />}
            {activeModule === 'mesas' && <TablesView />}
            {activeModule === 'caixa' && <CashierView />}
            {activeModule === 'cardapio' && <MenuManagementView />}
            {activeModule === 'impressoras' && <PrintersView />}
            {activeModule === 'clientes' && <CustomersView />}
            {activeModule === 'reservas' && <ReservationsView />}
            {activeModule === 'usuarios' && <UsersView />}
            {activeModule === 'auditoria' && <AuditView />}
            {activeModule === 'configuracoes' && <SettingsView />}
          </main>

          {/* Quick status bar at the bottom */}
          <footer className="bg-white border-t border-slate-200 py-1.5 px-4 text-slate-500 text-[11px] flex items-center justify-between z-10 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">{settings.nomeFantasia || settings.nomeAplicacao}</span>
              {settings.nomeFantasia && settings.nomeAplicacao && <span>• {settings.nomeAplicacao} v{settings.versaoExibida}</span>}
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-[10px]">
              <span className="hidden sm:inline">Atalhos:</span>
              <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-600">F1</kbd> PDV</span>
              <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-600">F2</kbd> Pedidos</span>
              <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-600">F3</kbd> Mesas</span>
              <span><kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-600">F4</kbd> Caixa</span>
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