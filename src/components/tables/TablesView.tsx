import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table, Order, PaymentMethod } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { PaymentModal } from '../pdv/PaymentModal';
import { ReceiptModal } from '../pdv/ReceiptModal';
import { 
  Users, 
  Clock, 
  Receipt, 
  PlusCircle, 
  CheckCircle, 
  DollarSign, 
  X, 
  Divide, 
  Utensils, 
  AlertCircle 
} from 'lucide-react';

export const TablesView: React.FC = () => {
  const {
    tables,
    orders,
    openTableWithOrder,
    requestTableBill,
    settleTableAccount,
    freeTableManually,
    setActiveTab,
    setSelectedTableNumber,
    setOrderType,
    setCustomerInfo,
    selectedReceiptOrder,
    setSelectedReceiptOrder,
  } = useRestaurant();

  const [filter, setFilter] = useState<'todas' | 'livres' | 'ocupadas' | 'conta'>('todas');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [newTableClientName, setNewTableClientName] = useState('');

  // Filtered tables
  const filteredTables = tables.filter(t => {
    if (filter === 'livres') return t.status === 'livre';
    if (filter === 'ocupadas') return t.status === 'ocupada';
    if (filter === 'conta') return t.status === 'conta';
    return true;
  });

  // Active order for currently selected table
  const activeOrder = selectedTable ? orders.find(o => 
    (o.id === selectedTable.pedidoAtivoId || o.mesaNumero === selectedTable.numero) && 
    o.status !== 'entregue' && 
    o.status !== 'cancelado'
  ) : null;

  const tableTotal = activeOrder ? activeOrder.total : 0;
  const splitAmount = splitCount > 0 ? tableTotal / splitCount : tableTotal;

  const handleOpenTableClick = (tableNumber: number) => {
    openTableWithOrder(tableNumber, newTableClientName.trim() || `Mesa ${tableNumber}`);
    setNewTableClientName('');
    setSelectedTable(null);
    setActiveTab('pdv');
  };

  const handleAddItemsToTable = (tableNumber: number) => {
    setSelectedTableNumber(tableNumber);
    setOrderType('mesa');
    if (selectedTable?.clienteNome) {
      setCustomerInfo({ name: selectedTable.clienteNome });
    }
    setSelectedTable(null);
    setActiveTab('pdv');
  };

  const handleSettleConfirm = (method: PaymentMethod, amountPaid?: number, change?: number) => {
    if (!selectedTable) throw new Error('No table selected');
    const closedOrder = settleTableAccount(selectedTable.numero, method, amountPaid, change);
    setIsPaymentOpen(false);
    setSelectedTable(null);
    if (closedOrder) {
      setSelectedReceiptOrder(closedOrder);
    }
    return closedOrder!;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            <span>Mapa de Mesas & Comandas</span>
          </h2>
          <p className="text-xs text-stone-500">
            Gerencie o salão, adicione consumos e feche contas com divisão automática
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-200/80 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter('todas')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'todas' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Todas ({tables.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('livres')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'livres' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Livres ({tables.filter(t => t.status === 'livre').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ocupadas')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'ocupadas' ? 'bg-sky-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Ocupadas ({tables.filter(t => t.status === 'ocupada').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('conta')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'conta' ? 'bg-purple-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Pedindo Conta ({tables.filter(t => t.status === 'conta').length})
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map((table) => {
          const tableOrder = orders.find(o => 
            (o.id === table.pedidoAtivoId || o.mesaNumero === table.numero) && 
            o.status !== 'entregue' && 
            o.status !== 'cancelado'
          );

          const isFree = table.status === 'livre';
          const isOccupied = table.status === 'ocupada';
          const isBillRequested = table.status === 'conta';

          return (
            <div
              key={table.numero}
              id={`table-card-${table.numero}`}
              onClick={() => setSelectedTable(table)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between h-44 group relative shadow-xs hover:shadow-md ${
                isFree
                  ? 'bg-white border-emerald-300/80 hover:border-emerald-500'
                  : isOccupied
                  ? 'bg-sky-50/40 border-sky-300 hover:border-sky-500'
                  : 'bg-purple-50/50 border-purple-300 hover:border-purple-500 animate-pulse'
              }`}
            >
              {/* Top Card Info */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-stone-400 font-semibold block uppercase tracking-wider">
                    Mesa
                  </span>
                  <div className="text-2xl font-black font-serif text-stone-900">
                    {String(table.numero).padStart(2, '0')}
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isFree
                    ? 'bg-emerald-100 text-emerald-800'
                    : isOccupied
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {isFree ? 'Livre' : isOccupied ? 'Ocupada' : 'Conta'}
                </span>
              </div>

              {/* Middle: Details */}
              <div className="space-y-1">
                {!isFree && table.clienteNome && (
                  <p className="text-xs font-bold text-stone-800 truncate">
                    {table.clienteNome}
                  </p>
                )}
                {!isFree && table.abertaEm && (
                  <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Aberta às {formatDateTime(table.abertaEm)}</span>
                  </div>
                )}
                {isFree && (
                  <p className="text-xs text-stone-400 italic">
                    Capacidade: {table.capacidade} pessoas
                  </p>
                )}
              </div>

              {/* Bottom: Total or Action */}
              <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                {!isFree && tableOrder ? (
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] text-stone-500 font-semibold">Consumo:</span>
                    <span className="text-sm font-bold font-mono text-stone-900">
                      {formatCurrency(tableOrder.total)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-700 font-bold group-hover:underline flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Ocupar Mesa</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Table Detail Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-serif font-black text-xl">
                  {selectedTable.numero}
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif">
                    Mesa {selectedTable.numero} {selectedTable.clienteNome && `• ${selectedTable.clienteNome}`}
                  </h3>
                  <div className="text-xs text-stone-400 flex items-center gap-2">
                    <span className="capitalize">Status: {selectedTable.status}</span>
                    {selectedTable.abertaEm && (
                      <span>• Aberta às {formatDateTime(selectedTable.abertaEm)}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* If Table is Free */}
              {selectedTable.status === 'livre' ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                    Esta mesa está livre para receber clientes. Digite uma identificação e abra a comanda no PDV.
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Identificação do Cliente / Família (Opcional)
                    </label>
                    <input
                      type="text"
                      id="modal-open-table-name-input"
                      value={newTableClientName}
                      onChange={(e) => setNewTableClientName(e.target.value)}
                      placeholder="Ex: Família Souza, João..."
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    id="modal-confirm-open-table-btn"
                    onClick={() => handleOpenTableClick(selectedTable.numero)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Abrir Mesa & Montar Pedido no PDV</span>
                  </button>
                </div>
              ) : (
                /* If Table is Occupied */
                <div className="space-y-4">
                  {/* Items list */}
                  <div>
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                      Consumo da Comanda #{activeOrder?.numero || ''}
                    </h4>

                    <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 bg-stone-50/40 max-h-52 overflow-y-auto">
                      {activeOrder?.itens && activeOrder.itens.length > 0 ? (
                        activeOrder.itens.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-start justify-between text-xs">
                            <div>
                              <span className="font-bold text-stone-900">
                                {item.quantidade}x {item.nome}
                              </span>
                              {item.acompanhamentosEscolhidos && item.acompanhamentosEscolhidos.length > 0 && (
                                <div className="text-[10px] text-stone-500">
                                  {item.acompanhamentosEscolhidos?.join(', ')}
                                </div>
                              )}
                              {item.remocoes && item.remocoes.length > 0 && (
                                <div className="text-[10px] text-rose-700 italic">
                                  Sem: {item.remocoes.join(', ')}
                                </div>
                              )}
                              {item.observacao && (
                                <div className="text-[10px] text-amber-800 italic">
                                  Obs: {item.observacao}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-semibold text-stone-800">
                              {formatCurrency(item.precoUnitario * item.quantidade)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-stone-400">
                          Nenhum item lançado ainda.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Total */}
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                      Total da Mesa
                    </span>
                    <span className="text-2xl font-mono font-black text-stone-900">
                      {formatCurrency(tableTotal)}
                    </span>
                  </div>

                  {/* Bill Split Calculator */}
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <Divide className="w-3.5 h-3.5" />
                        <span>Divisão de Conta por Pessoas</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                          className="w-6 h-6 bg-white border border-amber-300 rounded font-bold text-amber-900 hover:bg-amber-100 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs font-mono w-4 text-center">
                          {splitCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSplitCount(splitCount + 1)}
                          className="w-6 h-6 bg-white border border-amber-300 rounded font-bold text-amber-900 hover:bg-amber-100 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60">
                      <span className="text-amber-800">Valor por pessoa:</span>
                      <span className="font-bold font-mono text-amber-900 text-sm">
                        {formatCurrency(splitAmount)} / pessoa
                      </span>
                    </div>
                  </div>

                  {/* Status update buttons */}
                  <div className="flex items-center gap-2">
                    {selectedTable.status === 'ocupada' ? (
                      <button
                        type="button"
                        id="table-request-bill-btn"
                        onClick={() => {
                          requestTableBill(selectedTable.numero);
                          setSelectedTable({ ...selectedTable, status: 'conta' });
                        }}
                        className="flex-1 py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-300 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Marcar como "Pedindo Conta"</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-1.5 px-3 bg-purple-50 text-purple-800 text-xs font-semibold rounded-xl border border-purple-200 text-center">
                        Mesa aguardando pagamento
                      </div>
                    )}

                    <button
                      type="button"
                      id="table-free-manual-btn"
                      onClick={() => {
                        if (confirm(`Deseja realmente desocupar a Mesa ${selectedTable.numero}?`)) {
                          freeTableManually(selectedTable.numero);
                          setSelectedTable(null);
                        }
                      }}
                      className="py-2 px-3 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
                      title="Liberar mesa sem pagamento"
                    >
                      Liberar Mesa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {selectedTable.status !== 'livre' && (
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  id="table-add-more-items-btn"
                  onClick={() => handleAddItemsToTable(selectedTable.numero)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Lançar Mais Itens no PDV</span>
                </button>

                <button
                  type="button"
                  id="table-settle-account-btn"
                  disabled={!activeOrder || tableTotal <= 0}
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Fechar Conta & Receber</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal for settling table */}
      <PaymentModal
        isOpen={isPaymentOpen}
        total={tableTotal}
        onClose={() => setIsPaymentOpen(false)}
        onConfirm={handleSettleConfirm}
        onReceiptTrigger={(order) => setSelectedReceiptOrder(order)}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
