import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Order, OrderStatus, CartItem, MenuItem } from '../../types';
import { 
  X, 
  Printer, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Percent, 
  Send, 
  RotateCcw,
  ChefHat,
  ArrowRightLeft,
  Flame,
  User,
  MapPin,
  FileText,
  Plus,
  Minus,
  ShoppingBag,
  Search
} from 'lucide-react';

export const OrderDetailsModal: React.FC = () => {
  const { 
    selectedOrderForModal, 
    setSelectedOrderForModal,
    updateOrderStatus,
    cancelOrder,
    cancelOrderItem,
    addItemsToOrder,
    applyOrderDiscount,
    updateOrderItemProductionStatus,
    setOrderPriority,
    reopenOrder,
    openPaymentModal,
    setSelectedReceiptOrder,
    currentUser,
    tables,
    menu
  } = useRestaurant();

  const [showCancelOrderInput, setShowCancelOrderInput] = useState(false);
  const [cancelOrderReason, setCancelOrderReason] = useState('');

  const [showItemCancelId, setShowItemCancelId] = useState<string | null>(null);
  const [cancelItemReason, setCancelItemReason] = useState('');

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const [showReopenInput, setShowReopenInput] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const [showAddItems, setShowAddItems] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addCart, setAddCart] = useState<CartItem[]>([]);

  if (!selectedOrderForModal) return null;

  const order = selectedOrderForModal;

  const handleCancelWholeOrder = () => {
    if (!cancelOrderReason.trim()) return;
    cancelOrder(order.id, cancelOrderReason.trim());
    setSelectedOrderForModal(null);
  };

  const handleCancelItem = (cartItemId: string) => {
    if (!cancelItemReason.trim()) return;
    cancelOrderItem(order.id, cartItemId, cancelItemReason.trim());
    setSelectedOrderForModal(null);
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue.replace(',', '.')) || 0;
    if (val <= 0 || !discountReason.trim()) return;
    applyOrderDiscount(order.id, val, discountReason.trim());
    setShowDiscountInput(false);
    setDiscountValue('');
    setDiscountReason('');
  };

  const handleReopen = () => {
    if (!reopenReason.trim()) return;
    reopenOrder(order.id, reopenReason.trim());
    setShowReopenInput(false);
    setReopenReason('');
  };

  const addToAddCart = (item: MenuItem) => {
    setAddCart(prev => {
      const existing = prev.find(ci => ci.menuItemId === item.id);
      if (existing) {
        return prev.map(ci => ci.menuItemId === item.id ? { ...ci, quantidade: ci.quantidade + 1 } : ci);
      }
      return [...prev, {
        cartItemId: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        menuItemId: item.id,
        nome: item.nome,
        precoUnitario: item.preco,
        quantidade: 1,
        observacao: '',
        estacaoProducao: item.estacaoProducao || 'cozinha',
        statusProducao: 'pendente'
      }];
    });
  };

  const changeAddQty = (cartItemId: string, delta: number) => {
    setAddCart(prev => prev.map(ci => {
      if (ci.cartItemId === cartItemId) {
        const newQty = ci.quantidade + delta;
        return newQty > 0 ? { ...ci, quantidade: newQty } : null;
      }
      return ci;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromAddCart = (cartItemId: string) => {
    setAddCart(prev => prev.filter(ci => ci.cartItemId !== cartItemId));
  };

  const confirmAddItems = () => {
    if (addCart.length === 0) return;
    addItemsToOrder(order.id, addCart);
    setSelectedOrderForModal(null);
  };

  const addCartSubtotal = addCart.reduce((acc, ci) => acc + ci.precoUnitario * ci.quantidade, 0);
  const availableMenu = menu.filter(item => item.disponivel !== false
    && item.nome.toLowerCase().includes(addItemSearch.toLowerCase()));

  const getStatusBadge = (st: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; color: string }> = {
      novo: { label: 'Novo', color: 'bg-sky-100 text-sky-800 border-sky-300' },
      confirmado: { label: 'Confirmado', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      em_preparacao: { label: 'Na Cozinha', color: 'bg-amber-100 text-amber-800 border-amber-300' },
      preparando: { label: 'Em Preparo', color: 'bg-amber-100 text-amber-800 border-amber-300' },
      pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 border-amber-300' },
      pronto: { label: 'Pronto p/ Servir', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      saiu_entrega: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-800 border-purple-300' },
      entregue: { label: 'Entregue', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      finalizado: { label: 'Finalizado', color: 'bg-stone-100 text-stone-700 border-stone-300' },
      cancelado: { label: 'Cancelado', color: 'bg-rose-100 text-rose-800 border-rose-300' }
    };
    const b = map[st] || { label: st, color: 'bg-stone-100 text-stone-700 border-stone-300' };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${b.color}`}>
        {b.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
              #{order.numero}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Detalhes do Pedido #{order.numero}</h3>
                {getStatusBadge(order.status)}
                {order.prioridade === 'urgente' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                    <Flame className="w-3 h-3" />
                    URGENTE
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Canal: <strong className="text-stone-200">{order.canal}</strong> • Criado em {new Date(order.criadoEm).toLocaleTimeString('pt-BR')} 
                {order.garcomNome ? ` • Atendente: ${order.garcomNome}` : ''}
              </p>
            </div>
          </div>

          <button
            id="close-order-details-modal-btn"
            onClick={() => setSelectedOrderForModal(null)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Customer / Destination Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-stone-500 uppercase tracking-wide text-[10px]">Destino / Identificação</div>
              <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" />
                <span>{order.nomeCliente || 'Cliente Balcão'}</span>
                {order.mesaNumero && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-xs">
                    Mesa {order.mesaNumero}
                  </span>
                )}
              </div>
              {order.telefoneCliente && (
                <div className="text-stone-600">Telefone: {order.telefoneCliente}</div>
              )}
            </div>

            {order.tipo === 'delivery' && order.enderecoEntrega && (
              <div className="space-y-0.5">
                <div className="font-semibold text-stone-500 uppercase tracking-wide text-[10px]">Endereço de Entrega</div>
                <div className="text-stone-800 font-medium flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{order.enderecoEntrega.logradouro}, {order.enderecoEntrega.numero} - {order.enderecoEntrega.bairro}</span>
                </div>
                {order.enderecoEntrega.complemento && (
                  <div className="text-stone-500 pl-4">{order.enderecoEntrega.complemento}</div>
                )}
                {order.entregadorNome && (
                  <div className="text-purple-700 font-semibold pl-4">Entregador: {order.entregadorNome}</div>
                )}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 uppercase tracking-wider">
              <span>Itens do Pedido ({order.itens.length})</span>
              <span>Status na Cozinha / Valor</span>
            </div>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {order.itens.map((it) => (
                <div key={it.cartItemId} className="p-3 hover:bg-stone-50/60 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-xs text-stone-800">
                          {it.quantidade}x
                        </span>
                        <span className="font-bold text-stone-900 text-sm">{it.nome}</span>
                        {it.variacaoNome && (
                          <span className="text-xs px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-medium">
                            {it.variacaoNome}
                          </span>
                        )}
                      </div>

                      {/* Addons */}
                      {it.adicionais && it.adicionais.length > 0 && (
                        <div className="text-xs text-stone-600 pl-8 space-y-0.5 mt-1">
                          {it.adicionais.map((ad, i) => (
                            <div key={i} className="text-amber-800 font-medium">
                              + {ad.nome} (+{formatCurrency(ad.preco)})
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Removals */}
                      {it.remocoes && it.remocoes.length > 0 && (
                        <div className="text-xs text-rose-600 italic pl-8 mt-0.5">
                          Sem: {it.remocoes?.join(', ')}
                        </div>
                      )}

                      {/* Observações */}
                      {it.observacao && (
                        <div className="text-xs text-stone-500 italic pl-8 mt-0.5">
                          Obs: {it.observacao}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sm text-stone-900">
                        {formatCurrency(it.precoUnitario * it.quantidade)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 justify-end">
                        {/* Production status switcher */}
                        <button
                          id={`prod-status-${it.cartItemId}`}
                          onClick={() => {
                            const next = it.statusProducao === 'pronto' ? 'pendente' : it.statusProducao === 'preparando' ? 'pronto' : 'preparando';
                            updateOrderItemProductionStatus(order.id, it.cartItemId, next);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                            it.statusProducao === 'pronto' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : it.statusProducao === 'preparando' 
                              ? 'bg-amber-100 text-amber-800 border-amber-300' 
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {it.statusProducao === 'pronto' ? '✓ Pronto' : it.statusProducao === 'preparando' ? '⏳ Preparando' : 'Pendente'}
                        </button>

                        {/* Cancel Item button */}
                        {order.status !== 'cancelado' && order.status !== 'finalizado' && (
                          <button
                            id={`cancel-item-${it.cartItemId}`}
                            onClick={() => {
                              setShowItemCancelId(showItemCancelId === it.cartItemId ? null : it.cartItemId);
                              setCancelItemReason('');
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded"
                            title="Cancelar este item (com justificativa)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cancel item inline prompt */}
                  {showItemCancelId === it.cartItemId && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Motivo obrigatório de cancelamento do item..."
                        value={cancelItemReason}
                        onChange={(e) => setCancelItemReason(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-rose-300 bg-white focus:outline-none"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setShowItemCancelId(null)}
                          className="px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                        >
                          Voltar
                        </button>
                        <button
                          id={`confirm-cancel-item-${it.cartItemId}`}
                          onClick={() => handleCancelItem(it.cartItemId)}
                          className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                        >
                          Confirmar Cancelamento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Items Panel (edit order after sent to kitchen) */}
          {order.status !== 'cancelado' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
              <button
                id="order-details-add-items-toggle"
                onClick={() => setShowAddItems(!showAddItems)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <Plus className="w-4 h-4 text-amber-600" />
                  {showAddItems ? 'Fechar adição de itens' : 'Adicionar mais itens ao pedido'}
                </span>
                <span className="text-xs text-amber-700">
                  {addCart.length > 0 ? `${addCart.length} item(ns) selecionado(s)` : 'Editar pedido já enviado'}
                </span>
              </button>

              {showAddItems && (
                <div className="border-t border-amber-200 p-3 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar item do cardápio..."
                      value={addItemSearch}
                      onChange={(e) => setAddItemSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-300 bg-white text-xs focus:outline-none"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-lg bg-white">
                    {availableMenu.length === 0 && (
                      <div className="p-4 text-center text-xs text-stone-400 italic">Nenhum item encontrado.</div>
                    )}
                    {availableMenu.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 truncate">{item.nome}</div>
                          <div className="text-[11px] text-stone-500">{item.categoria}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-amber-700">{formatCurrency(item.preco)}</span>
                          <button
                            id={`add-item-menu-${item.id}`}
                            onClick={() => addToAddCart(item)}
                            className="p-1.5 rounded-lg border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800"
                            title={`Adicionar ${item.nome}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {addCart.length > 0 && (
                    <div className="space-y-2">
                      <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg bg-white">
                        {addCart.map((ci) => (
                          <div key={ci.cartItemId} className="flex items-center justify-between gap-2 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-stone-900 truncate">{ci.nome}</div>
                              <div className="text-[11px] text-stone-500">
                                {formatCurrency(ci.precoUnitario)} cada
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => changeAddQty(ci.cartItemId, -1)}
                                className="p-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold">{ci.quantidade}</span>
                              <button
                                onClick={() => changeAddQty(ci.cartItemId, 1)}
                                className="p-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeFromAddCart(ci.cartItemId)}
                                className="p-1 rounded-md text-rose-500 hover:bg-rose-50 ml-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 px-1">
                        <div className="text-xs font-bold text-amber-900">
                          Total a adicionar: {formatCurrency(addCartSubtotal)}
                        </div>
                        <button
                          id="confirm-add-items-btn"
                          onClick={confirmAddItems}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Adicionar ao Pedido #{order.numero}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Totals & Discounts Section */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal dos itens:</span>
              <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>

            {order.desconto > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Desconto ({order.descontoMotivo || 'Manual'}):</span>
                <span>-{formatCurrency(order.desconto)}</span>
              </div>
            )}

            {order.taxaServico > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Taxa de serviço:</span>
                <span>{formatCurrency(order.taxaServico)}</span>
              </div>
            )}

            {order.taxaEntrega > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Taxa de entrega:</span>
                <span>{formatCurrency(order.taxaEntrega)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-sm font-extrabold text-stone-900">
              <span>VALOR TOTAL DO PEDIDO:</span>
              <span className="text-base text-amber-700">{formatCurrency(order.total)}</span>
            </div>

            {/* Payment status summary */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-stone-500">Status do Pagamento: </span>
                <strong className={`uppercase ${order.statusPagamento === 'pago' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.statusPagamento}
                </strong>
                <span className="text-stone-500 ml-2">
                  (Pago: {formatCurrency(order.valorTotalPago)} • Restante: {formatCurrency(order.saldoRestante)})
                </span>
              </div>

              {/* Discount trigger */}
              {order.status !== 'cancelado' && order.status !== 'finalizado' && (
                <button
                  id="open-apply-discount-btn"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <Percent className="w-3.5 h-3.5" />
                  {order.desconto > 0 ? 'Alterar Desconto' : 'Aplicar Desconto'}
                </button>
              )}
            </div>

            {/* Apply discount prompt */}
            {showDiscountInput && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2 mt-2">
                <div className="text-xs font-bold text-amber-900">Aplicar Desconto Manual (Registrado em Auditoria)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor do desconto (R$)..."
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded border border-amber-300 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Motivo (ex: Cortesia Gerente, Cliente VIP)..."
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded border border-amber-300 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowDiscountInput(false)}
                    className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-discount-btn"
                    onClick={handleApplyDiscount}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation record if cancelled */}
          {order.cancelamento && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Pedido Cancelado por {order.cancelamento.usuario} em {order.cancelamento.dataHora}
              </div>
              <div>Motivo: "{order.cancelamento.motivo}"</div>
            </div>
          )}

          {/* Reopen order prompt */}
          {showReopenInput && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
              <div className="text-xs font-bold text-indigo-900">Reabrir Pedido / Conta (Auditoria Requer Justificativa)</div>
              <input
                type="text"
                placeholder="Motivo para reabrir este pedido finalizado..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-indigo-300 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReopenInput(false)} className="text-xs px-2 py-1 text-stone-600">
                  Cancelar
                </button>
                <button onClick={handleReopen} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold">
                  Confirmar Reabertura
                </button>
              </div>
            </div>
          )}

          {/* Cancel whole order prompt */}
          {showCancelOrderInput && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="text-xs font-bold text-rose-900">Cancelar Todo o Pedido #{order.numero}</div>
              <input
                type="text"
                placeholder="Motivo obrigatório de cancelamento..."
                value={cancelOrderReason}
                onChange={(e) => setCancelOrderReason(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-rose-300 bg-white"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCancelOrderInput(false)} className="text-xs px-2 py-1 text-stone-600">
                  Voltar
                </button>
                <button onClick={handleCancelWholeOrder} className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-bold">
                  Confirmar Cancelamento do Pedido
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer toolbar with primary operational actions */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Print thermal receipt */}
            <button
              id="order-details-print-btn"
              onClick={() => setSelectedReceiptOrder(order)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold shadow-2xs transition-colors"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Imprimir Térmico</span>
            </button>

            {/* Toggle priority */}
            <button
              id="order-details-priority-btn"
              onClick={() => setOrderPriority(order.id, order.prioridade === 'urgente' ? 'normal' : 'urgente')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                order.prioridade === 'urgente' 
                  ? 'bg-rose-100 border-rose-300 text-rose-800' 
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{order.prioridade === 'urgente' ? 'Prioridade Alta' : 'Tornar Urgente'}</span>
            </button>

            {/* Reopen closed order */}
            {order.status === 'finalizado' && (
              <button
                id="order-details-reopen-btn"
                onClick={() => setShowReopenInput(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir Conta</span>
              </button>
            )}

            {/* Cancel order trigger */}
            {order.status !== 'cancelado' && order.status !== 'finalizado' && (
              <button
                id="order-details-cancel-btn"
                onClick={() => setShowCancelOrderInput(true)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold"
              >
                <span>Cancelar Pedido</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Manual Payment Button */}
            <button
              id="order-details-payment-btn"
              onClick={() => openPaymentModal(order)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              <span>
                {order.saldoRestante === 0 ? 'Ver Pagamentos' : `Registrar Pagamento (${formatCurrency(order.saldoRestante)})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
