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
  ArrowRightLeft,
  Flame,
  User,
  MapPin,
  FileText,
  Plus,
  Minus,
  ShoppingBag,
  Search,
  Edit3,
  UtensilsCrossed,
  Save
} from 'lucide-react';

export const OrderDetailsModal: React.FC = () => {
  const { 
    selectedOrderForModal,
    orders,
    setSelectedOrderForModal,
    cancelOrder,
    cancelOrderItem,
    addItemsToOrder,
    updateOrderStatus,
    applyOrderDiscount,
    generateOrderMirror,
    setOrderPriority,
    reopenOrder,
    openPaymentModal,
    setSelectedReceiptOrder,
    currentUser,
    tables,
    menu,
    editOrder
  } = useRestaurant();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<CartItem[]>([]);
  const [editDeliveryFee, setEditDeliveryFee] = useState<string>('0');
  const [editAddress, setEditAddress] = useState<Order['enderecoEntrega']>({ logradouro: '', numero: '', bairro: '', complemento: '' });
  const [editSearch, setEditSearch] = useState('');
  const [editError, setEditError] = useState('');

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

  const order = orders.find(item => item.id === selectedOrderForModal.id) || selectedOrderForModal;

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

  const startEditOrder = () => {
    if (order.status === 'pronto') {
      setEditError('Este pedido já foi espelhado. Use o botão "Reabrir Conta" antes de editar.');
      return;
    }
    if (order.status === 'cancelado' || order.status === 'finalizado' || order.status === 'entregue') {
      setEditError('Não é possível editar pedidos com este status.');
      return;
    }
    setEditError('');
    setEditCustomerName(order.nomeCliente || '');
    setEditCustomerPhone(order.telefoneCliente || '');
    setEditNotes(order.observacoesGerais || '');
    setEditDeliveryFee((order.taxaEntrega || 0).toString());
    setEditAddress(order.enderecoEntrega || { logradouro: '', numero: '', bairro: '', complemento: '' });
    setEditItems([...order.itens]);
    setIsEditMode(true);
  };

  const cancelEditOrder = () => {
    setIsEditMode(false);
    setEditError('');
  };

  const saveEditOrder = () => {
    setEditError('');
    if (editItems.length === 0) {
      setEditError('O pedido não pode ficar sem itens.');
      return;
    }
    const fee = parseFloat(editDeliveryFee) || 0;
    try {
      editOrder(order.id, {
        nomeCliente: editCustomerName.trim() || undefined,
        telefoneCliente: editCustomerPhone.trim() || undefined,
        observacoesGerais: editNotes.trim() || undefined,
        taxaEntrega: order.tipo === 'delivery' ? fee : undefined,
        enderecoEntrega: order.tipo === 'delivery' ? editAddress : undefined,
        itens: editItems
      });
      setIsEditMode(false);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações no pedido.');
    }
  };

  const changeEditItemQty = (cartItemId: string, delta: number) => {
    setEditItems(prev => prev.map(it => {
      if (it.cartItemId === cartItemId) {
        const nQty = it.quantidade + delta;
        return nQty > 0 ? { ...it, quantidade: nQty } : null;
      }
      return it;
    }).filter(Boolean) as CartItem[]);
  };

  const removeEditItem = (cartItemId: string) => {
    setEditItems(prev => prev.filter(it => it.cartItemId !== cartItemId));
  };

  const addProductToEdit = (menuItem: MenuItem) => {
    setEditItems(prev => {
      const existing = prev.find(it => it.menuItemId === menuItem.id && !it.adicionais?.length && !it.remocoes?.length);
      if (existing) {
        return prev.map(it => it.cartItemId === existing.cartItemId ? { ...it, quantidade: it.quantidade + 1 } : it);
      }
      return [...prev, {
        cartItemId: 'item-edit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        menuItemId: menuItem.id,
        nome: menuItem.nome,
        precoUnitario: menuItem.preco,
        quantidade: 1,
        observacao: '',
        estacaoProducao: menuItem.estacaoProducao || 'cozinha'
      }];
    });
  };

  const addCartSubtotal = addCart.reduce((acc, ci) => acc + ci.precoUnitario * ci.quantidade, 0);
  const availableMenu = menu.filter(item => item.disponivel !== false
    && item.nome.toLowerCase().includes(addItemSearch.toLowerCase()));

  const getStatusBadge = (st: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; color: string }> = {
      novo: { label: 'Aguardando espelho', color: 'bg-sky-100 text-sky-800 border-sky-300' },
      pronto: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      entregue: { label: 'Entregue', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      finalizado: { label: 'Finalizado', color: 'bg-stone-100 text-stone-700 border-stone-300' },
      cancelado: { label: 'Cancelado', color: 'bg-rose-100 text-rose-800 border-rose-300' }
    };
    const b = map[st];
    return <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${b.color}`}>{b.label}</span>;
  };

  const latestBatch = [...(order.impressoes || [])].reverse()[0];
  const canGenerateMirror = order.status === 'novo' && !!latestBatch && !latestBatch.espelhoJobId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm">
              #{order.codigoMesa || order.numero}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Detalhes do Pedido #{order.codigoMesa || order.numero}</h3>
                {getStatusBadge(order.status)}
                {order.prioridade === 'urgente' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                    <Flame className="w-3 h-3" />
                    URGENTE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Canal: <strong className="text-slate-200">{order.canal}</strong> • Criado em {new Date(order.criadoEm).toLocaleTimeString('pt-BR')} 
                {order.garcomNome ? ` • Atendente: ${order.garcomNome}` : ''}
              </p>
            </div>
          </div>

          <button
            id="close-order-details-modal-btn"
            onClick={() => setSelectedOrderForModal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* MODO DE EDIÇÃO COMPLETA DO PEDIDO */}
          {isEditMode ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-blue-200 bg-blue-50/60 p-3 rounded-xl">
                <div>
                  <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    Edição do Pedido #{order.codigoMesa || order.numero}
                  </h4>
                  <p className="text-[11px] text-blue-700">
                    Altere itens, quantidades, dados do cliente e taxas. Os totais serão recalculados automaticamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="cancel-edit-order-btn"
                    onClick={cancelEditOrder}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    id="save-edit-order-btn"
                    onClick={saveEditOrder}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Dados do Cliente / Pedido */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Dados do Cliente & Entrega</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Nome do Cliente:</label>
                    <input
                      id="edit-order-customer-name"
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      placeholder="Nome do cliente..."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Telefone:</label>
                    <input
                      id="edit-order-customer-phone"
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      placeholder="(99) 99999-9999"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                {order.tipo === 'delivery' && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-medium mb-1">Logradouro:</label>
                        <input
                          type="text"
                          value={editAddress?.logradouro || ''}
                          onChange={(e) => setEditAddress(prev => ({ ...(prev || { numero: '', bairro: '' }), logradouro: e.target.value }))}
                          placeholder="Rua, Av..."
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Número:</label>
                        <input
                          type="text"
                          value={editAddress?.numero || ''}
                          onChange={(e) => setEditAddress(prev => ({ ...(prev || { logradouro: '', bairro: '' }), numero: e.target.value }))}
                          placeholder="123"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Bairro:</label>
                        <input
                          type="text"
                          value={editAddress?.bairro || ''}
                          onChange={(e) => setEditAddress(prev => ({ ...(prev || { logradouro: '', numero: '' }), bairro: e.target.value }))}
                          placeholder="Bairro"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Taxa de Entrega (R$):</label>
                        <input
                          id="edit-order-delivery-fee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editDeliveryFee}
                          onChange={(e) => setEditDeliveryFee(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Observações Gerais:</label>
                  <input
                    id="edit-order-notes"
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Instruções de preparo, entrega, etc."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Itens em Edição */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Itens ({editItems.reduce((acc, it) => acc + it.quantidade, 0)})</span>
                  <span>Subtotal: {formatCurrency(editItems.reduce((acc, it) => acc + it.precoUnitario * it.quantidade, 0))}</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {editItems.map((it) => (
                    <div key={it.cartItemId} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm">{it.nome}</div>
                        {it.variacaoNome && <span className="text-[11px] text-slate-500 mr-2">{it.variacaoNome}</span>}
                        <span className="text-xs text-blue-700 font-mono font-semibold">{formatCurrency(it.precoUnitario)} cada</span>
                        {it.observacao && <div className="text-[11px] text-slate-500 italic mt-0.5">Obs: {it.observacao}</div>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => changeEditItemQty(it.cartItemId, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold"
                          title="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-xs font-mono">{it.quantidade}</span>
                        <button
                          onClick={() => changeEditItemQty(it.cartItemId, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold"
                          title="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-20 text-right font-extrabold text-xs text-slate-900 font-mono">
                          {formatCurrency(it.precoUnitario * it.quantidade)}
                        </div>

                        <button
                          id={`edit-remove-item-${it.cartItemId}`}
                          onClick={() => removeEditItem(it.cartItemId)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Busca de Produtos para Adicionar na Edição */}
              <div className="p-3 bg-sky-50/50 border border-sky-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Adicionar Produto ao Pedido</span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar prato ou bebida para adicionar..."
                    value={editSearch}
                    onChange={(e) => setEditSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                  {menu
                    .filter(m => m.disponivel !== false && m.nome.toLowerCase().includes(editSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(m => (
                      <div key={m.id} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <span className="font-bold text-slate-900">{m.nome}</span>
                          <span className="text-[11px] text-slate-500 ml-2">({m.categoria})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700 font-mono">{formatCurrency(m.preco)}</span>
                          <button
                            type="button"
                            onClick={() => addProductToEdit(m)}
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* Customer / Destination Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Destino / Identificação</div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                <User className="w-4 h-4 text-blue-600" />
                <span>{order.nomeCliente || 'Cliente Balcão'}</span>
                {order.mesaNumero && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-2xs border border-blue-700">
                    <UtensilsCrossed className="w-3 h-3" />
                    MESA {order.mesaNumero}
                  </span>
                )}
              </div>
              {order.telefoneCliente && (
                <div className="text-slate-600">Telefone: {order.telefoneCliente}</div>
              )}
            </div>

            {order.tipo === 'delivery' && order.enderecoEntrega && (
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Endereço de Entrega</div>
                <div className="text-slate-800 font-medium flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{order.enderecoEntrega.logradouro}, {order.enderecoEntrega.numero} - {order.enderecoEntrega.bairro}</span>
                </div>
                {order.enderecoEntrega.complemento && (
                  <div className="text-slate-500 pl-4">{order.enderecoEntrega.complemento}</div>
                )}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Itens do Pedido ({order.itens.length})</span>
              <span>Valor</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              {order.itens.map((it) => (
                <div key={it.cartItemId} className="p-3 hover:bg-slate-50/60 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800">
                          {it.quantidade}x
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{it.nome}</span>
                        {it.variacaoNome && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                            {it.variacaoNome}
                          </span>
                        )}
                      </div>

                      {/* Addons */}
                      {it.adicionais && it.adicionais.length > 0 && (
                        <div className="text-xs text-slate-600 pl-8 space-y-0.5 mt-1">
                          {it.adicionais.map((ad, i) => (
                            <div key={i} className="text-sky-800 font-medium">
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
                        <div className="text-xs text-slate-500 italic pl-8 mt-0.5">
                          Obs: {it.observacao}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sm text-slate-900">
                        {formatCurrency(it.precoUnitario * it.quantidade)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 justify-end">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${latestBatch?.espelhoJobId ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-sky-100 text-blue-800 border-sky-300'}`}>
                          {latestBatch?.espelhoJobId ? 'Espelho gerado' : 'Aguardando espelho'}
                        </span>

                        {/* Cancel Item button */}
                        {(order.status === 'novo' || order.status === 'pronto') && (
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
          {(order.status === 'novo' || order.status === 'pronto') && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 overflow-hidden">
              <button
                id="order-details-add-items-toggle"
                onClick={() => setShowAddItems(!showAddItems)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Plus className="w-4 h-4 text-blue-600" />
                  {showAddItems ? 'Fechar adição de itens' : 'Adicionar mais itens ao pedido'}
                </span>
                <span className="text-xs text-sky-700">
                  {addCart.length > 0 ? `${addCart.length} item(ns) selecionado(s)` : 'Editar pedido já enviado'}
                </span>
              </button>

              {showAddItems && (
                <div className="border-t border-sky-200 p-3 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar item do cardápio..."
                      value={addItemSearch}
                      onChange={(e) => setAddItemSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                    {availableMenu.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400 italic">Nenhum item encontrado.</div>
                    )}
                    {availableMenu.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.nome}</div>
                          <div className="text-[11px] text-slate-500">{item.categoria}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-blue-700">{formatCurrency(item.preco)}</span>
                          <button
                            id={`add-item-menu-${item.id}`}
                            onClick={() => addToAddCart(item)}
                            className="p-1.5 rounded-lg border border-sky-300 bg-sky-100 hover:bg-sky-200 text-blue-800"
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
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                        {addCart.map((ci) => (
                          <div key={ci.cartItemId} className="flex items-center justify-between gap-2 px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">{ci.nome}</div>
                              <div className="text-[11px] text-slate-500">
                                {formatCurrency(ci.precoUnitario)} cada
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => changeAddQty(ci.cartItemId, -1)}
                                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold">{ci.quantidade}</span>
                              <button
                                onClick={() => changeAddQty(ci.cartItemId, 1)}
                                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
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
                        <div className="text-xs font-bold text-slate-900">
                          Total a adicionar: {formatCurrency(addCartSubtotal)}
                        </div>
                        <button
                          id="confirm-add-items-btn"
                          onClick={confirmAddItems}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Adicionar ao Pedido #{order.codigoMesa || order.numero}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Totals & Discounts Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
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
              <div className="flex justify-between text-slate-600">
                <span>Taxa de serviço:</span>
                <span>{formatCurrency(order.taxaServico)}</span>
              </div>
            )}

            {order.taxaEntrega > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Taxa de entrega:</span>
                <span>{formatCurrency(order.taxaEntrega)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
              <span>VALOR TOTAL DO PEDIDO:</span>
              <span className="text-base text-blue-700">{formatCurrency(order.total)}</span>
            </div>

            {/* Payment status summary */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Status do Pagamento: </span>
                <strong className={`uppercase ${order.statusPagamento === 'pago' ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {order.statusPagamento}
                </strong>
                <span className="text-slate-500 ml-2">
                  (Pago: {formatCurrency(order.valorTotalPago)} • Restante: {formatCurrency(order.saldoRestante)})
                </span>
              </div>

              {/* Discount trigger */}
              {(order.status === 'novo' || order.status === 'pronto') && (
                <button
                  id="open-apply-discount-btn"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                >
                  <Percent className="w-3.5 h-3.5" />
                  {order.desconto > 0 ? 'Alterar Desconto' : 'Aplicar Desconto'}
                </button>
              )}
            </div>

            {/* Apply discount prompt */}
            {showDiscountInput && (
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 space-y-2 mt-2">
                <div className="text-xs font-bold text-slate-900">Aplicar Desconto Manual (Registrado em Auditoria)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor do desconto (R$)..."
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded border border-sky-300 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Motivo (ex: Cortesia Gerente, Cliente VIP)..."
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded border border-sky-300 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowDiscountInput(false)}
                    className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-discount-btn"
                    onClick={handleApplyDiscount}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs"
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
              <div className="text-xs font-bold text-rose-900">Cancelar Todo o Pedido #{order.codigoMesa || order.numero}</div>
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
          </>
          )}
        </div>

        {/* Footer toolbar with primary operational actions */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {order.status === 'novo' && (
              <button
                id="order-details-edit-btn"
                onClick={startEditOrder}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-xs transition-colors"
                title="Editar itens e informações do pedido"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Pedido</span>
              </button>
            )}

            {canGenerateMirror && (
              <button
                id="order-details-generate-mirror-btn"
                onClick={() => generateOrderMirror(order.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-2xs"
                title="Gera a via espelho e marca o pedido como pronto"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Gerar Espelho / Pronto</span>
              </button>
            )}

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
            {(order.status === 'novo' || order.status === 'pronto') && (
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
            {order.status === 'pronto' && (
              <button
                id="order-details-delivered-btn"
                onClick={() => { updateOrderStatus(order.id, 'entregue'); setSelectedOrderForModal(null); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Marcar Entregue</span>
              </button>
            )}
            {order.status === 'entregue' && order.saldoRestante === 0 && (
              <button
                id="order-details-finish-btn"
                onClick={() => { updateOrderStatus(order.id, 'finalizado'); setSelectedOrderForModal(null); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs shadow-2xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Finalizar Pedido</span>
              </button>
            )}

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
