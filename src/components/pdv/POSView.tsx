import React, { useState, useMemo, useRef } from 'react';
import { money, normalizeSearch, uid } from '../../utils/business';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, CategoryType, OrderType, CartItem, Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { FIRST_ACCOUNT_NUMBER } from '../../lib/accountMigration';
import { AccompanimentModal } from './AccompanimentModal';
import { ReceiptModal } from './ReceiptModal';
import { 
  Search, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Bike, 
  Store, 
  Users, 
  Utensils, 
  Percent,
  Check
} from 'lucide-react';

export const POSView: React.FC = () => {
  const {
    menu,
    tables,
    accounts,
    getAccount,
    getOpenTableAccounts,
    getPreferredAccountForTable,
    createOrder,
    orders,
    currentUser, customers,
    settings,
  } = useRestaurant();

  const [cart, setCart] = useState<CartItem[]>([]);
  const operationId = useRef(uid('sale'));
  const submissionLocked = useRef(false);
  const [saleError, setSaleError] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('balcao');
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  // Taxa de entrega padrão vem da configuração do estabelecimento.
  const [deliveryFee, setDeliveryFee] = useState<number>(settings.delivery.defaultFee);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  // Escolha explícita do atendimento: continuar uma conta aberta ou abrir uma
  // nova. Nunca é inferido pelo saldo nem pelo status da mesa.
  const [targetAccountChoice, setTargetAccountChoice] = useState<string>('');

  const selectedTable = selectedTableNumber !== null ? tables.find(t => t.numero === selectedTableNumber) : undefined;
  // HIERARQUIA DE CONTA (única, espelhada em getPreferredAccountForTable):
  // escolha explícita do operador -> conta que ocupa a mesa -> ÚNICA conta
  // aberta ligada à mesa (inclusive liberada pelo espelho) -> nova conta.
  // `table.status` NÃO participa da decisão: mesa livre pode ter conta aberta.
  const openTableAccounts = getOpenTableAccounts(selectedTableNumber ?? undefined);
  const preferred = getPreferredAccountForTable(selectedTableNumber ?? undefined);
  // Só existe uma conta obviously válida? Então ela é a selecionada por
  // padrão. Havendo mais de uma, o operador precisa escolher.
  const uniqueOpenAccountId = openTableAccounts.length === 1 ? openTableAccounts[0].id : '';
  const targetAccountId = targetAccountChoice || uniqueOpenAccountId || (preferred.kind === 'conta' ? preferred.account.id : '');
  const isNewAccountChoice = targetAccountChoice === 'nova';
  const explicitAccount = isNewAccountChoice ? undefined : (targetAccountId ? getAccount(targetAccountId) : undefined);
  // O preview usa a conta REALMENTE escolhida: se for abrir conta nova, mostramos
  // o número que ela REALLY terá (ex.: 3.1) em vez do código de outra conta.
  const nextAccountNumber = accounts.length
    ? accounts.reduce((max, a) => Math.max(max, a.numero), FIRST_ACCOUNT_NUMBER) + 1
    : FIRST_ACCOUNT_NUMBER;
  const ambiguousAccounts = preferred.kind === 'ambigua' ? preferred.accounts : [];
  const previewAccount = explicitAccount;
  const nextSequencePreview = previewAccount
    ? orders.filter(o => o.contaId === previewAccount.id).reduce((max, o) => Math.max(max, o.sequencia ?? 0), 0) + 1
    : 1;
  const previewCode = previewAccount
    ? `${previewAccount.numero}.${nextSequencePreview}`
    : `${nextAccountNumber}.${nextSequencePreview}`;
  const occupiedByOther = !!(selectedTable?.contaAtualId && selectedTable.contaAtualId !== explicitAccount?.id);
  const occupiedAccount = occupiedByOther ? getAccount(selectedTable!.contaAtualId!) : undefined;

  const categories = useMemo(() => {
    return Array.from(new Set(menu.map(m => m.categoria)));
  }, [menu]);

  const setCustomerInfo = (info: { name?: string; phone?: string; address?: string; fee?: number }) => {
    if (info.name !== undefined) setCustomerName(info.name);
    if (info.phone !== undefined) setCustomerPhone(info.phone);
    if (info.address !== undefined) setDeliveryAddress(info.address);
    if (info.fee !== undefined) setDeliveryFee(info.fee);
  };

  const addToCart = (item: MenuItem, sides: string[] = [], obs: string = '', removals: string[] = []) => {
    submissionLocked.current = false;
    setCart(prev => {
      const existingIdx = prev.findIndex(ci => 
        ci.menuItemId === item.id && 
        (ci.variacaoNome || '') === (item.tamanho || '') &&
        (ci.observacao || '') === obs &&
        JSON.stringify(ci.acompanhamentosEscolhidos || []) === JSON.stringify(sides) &&
        JSON.stringify(ci.remocoes || []) === JSON.stringify(removals)
      );
      if (existingIdx > -1) {
        return prev.map((ci, idx) => idx === existingIdx ? { ...ci, quantidade: ci.quantidade + 1 } : ci);
      }
      const newCartItem: CartItem = {
        cartItemId: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        menuItemId: item.id,
        nome: item.nome,
        variacaoNome: item.tamanho || undefined,
        precoUnitario: item.preco,
        quantidade: 1,
        observacao: obs,
        estacaoProducao: item.estacaoProducao || 'cozinha',
                acompanhamentosEscolhidos: sides || [],
        adicionais: [],
        remocoes: removals
      };
      return [...prev, newCartItem];
    });
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(ci => {
      if (ci.cartItemId === cartItemId) {
        const newQty = ci.quantidade + delta;
        return newQty > 0 ? { ...ci, quantidade: newQty } : null;
      }
      return ci;
    }).filter(Boolean) as CartItem[]);
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(ci => ci.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    operationId.current = uid('sale');
    setCart([]);
    setDiscount(0);
    setNotes('');
    setSelectedTableNumber(null);
    // A escolha de conta pertence à mesa: nunca sobreviver a uma troca de
    // mesa nem ao fim da venda (evita "Mesa 8 -> ainda Conta 2").
    setTargetAccountChoice('');
    setCustomerName('');
    setSelectedCustomerId('');
    setCustomerPhone('');
    setDeliveryAddress('');
  };

  const cartSubtotal = useMemo(() => {
    return money(cart.reduce((acc, it) => acc + (it.precoUnitario * it.quantidade), 0));
  }, [cart]);

  const cartTotal = useMemo(() => {
    const fee = orderType === 'delivery' ? deliveryFee : 0;
    return Math.max(0, cartSubtotal - discount + fee);
  }, [cartSubtotal, discount, orderType, deliveryFee]);

  const openItemModal = (item: MenuItem) => {
    setSelectedItemForModal(item);
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setSelectedItemForModal(null);
  };

  const [selectedCatalog, setSelectedCatalog] = useState<'restaurante' | 'lanche'>('restaurante');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchCatalog = (item.catalogo || 'restaurante') === selectedCatalog;
      const matchCat = selectedCategory === 'Todos' || item.categoria === selectedCategory;
      const matchSearch = normalizeSearch(item.nome).includes(normalizeSearch(searchQuery)) ||
        (item.descricao && normalizeSearch(item.descricao).includes(normalizeSearch(searchQuery)));
      return matchCatalog && matchCat && matchSearch;
    });
  }, [menu, selectedCatalog, selectedCategory, searchQuery]);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disponivel) return;
    if (item.variacoes && item.variacoes.length > 0 && !item.variacoes.some(v => v.disponivel !== false)) return;
    if ((item.acompanhamentos && item.acompanhamentos.length > 0) || (item.variacoes && item.variacoes.length > 0)) {
      openItemModal(item);
    } else {
      addToCart(item);
    }
  };

  const handleAccompanimentConfirm = (item: MenuItem, sides: string[], obs: string, removals: string[]) => {
    addToCart(item, sides, obs, removals);
  };

  // Em mesa, cada confirmação cria um novo LANÇAMENTO na conta escolhida:
  // 0.1, 0.2, 0.3... O histórico anterior permanece intacto. Só um novo
  // atendimento financeiro cria uma nova conta.
  const handleConfirmOrder = () => {
    if (cart.length === 0 || submissionLocked.current) return;
    submissionLocked.current = true;
    setSaleError('');
    try {
    // Validação de endereço: nunca inventar "Centro"/"S/N". Se faltarem
    // dados obrigatórios, o pedido é bloqueado com mensagem clara.
    const addressRequired = orderType === 'delivery';
    const addressComplete = !addressRequired || (deliveryAddress.trim().length >= 5);
    if (addressRequired && !addressComplete) {
      submissionLocked.current = false;
      setSaleError('Informe o endereço completo de entrega (rua e número, no mínimo).');
      return;
    }
    const deliveryAddressParts = deliveryAddress.trim().split(',');
    // A conta NUNCA é criada aqui. O PDV apenas declara a INTENÇÃO:
    //  - "Criar novo atendimento" -> novaConta: true (escolha explícita);
    //  - "Continuar Conta X"       -> contaId explícita;
    //  - sem escolha               -> undefined e createOrder aplica a
    //    hierarquia (conta atual -> única conta aberta -> nova).
    const order = createOrder({
      operacaoId: operationId.current,
      tipo: orderType,
      mesaNumero: orderType === 'mesa' && selectedTableNumber ? selectedTableNumber : undefined,
      contaId: isNewAccountChoice ? undefined : (explicitAccount?.id || undefined),
      novaConta: isNewAccountChoice,
      clienteId: selectedCustomerId || undefined,
      nomeCliente: customerName || undefined,
      telefoneCliente: customerPhone || undefined,
      enderecoEntrega: orderType === 'delivery' ? {
        logradouro: deliveryAddressParts[0]?.trim() || '',
        numero: deliveryAddressParts[1]?.trim() || 'S/N',
        bairro: deliveryAddressParts[2]?.trim() || ''
      } : undefined,
      taxaEntrega: orderType === 'delivery' ? deliveryFee : 0,
      desconto: discount,
      observacoesGerais: notes || undefined,
      itens: cart,
      status: 'novo',
      statusPagamento: 'pendente',
      valorTotalPago: 0,
      saldoRestante: cartTotal
    });
    clearCart();
    } catch (err) { submissionLocked.current = false; setSaleError(err instanceof Error ? err.message : 'Falha ao confirmar pedido.'); }
  };



  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {saleError && <p role="alert" className="p-3 text-red-700">{saleError}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Catalog & Search (7 Cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Search bar & Category Bar */}
          <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="pos-search-input"
                placeholder="Buscar pratos, lanches, bebidas, sobremesas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-50/60 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['restaurante','lanche'] as const).map(catalog => (
                <button
                  key={catalog}
                  type="button"
                  onClick={() => { setSelectedCatalog(catalog); setSelectedCategory('Todos'); }}
                  className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedCatalog === catalog
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {catalog === 'restaurante' ? 'Cardápio Restaurante' : 'Cardápio Lanche'}
                </button>
              ))}
            </div>

            {/* Category scrollable pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                type="button"
                id="cat-pill-todos"
                onClick={() => setSelectedCategory('Todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'Todos'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-700'
                }`}
              >
                Todos ({menu.filter(m => (m.catalogo || 'restaurante') === selectedCatalog).length})
              </button>
              {categories.map((cat) => {
                const count = menu.filter(m => (m.catalogo || 'restaurante') === selectedCatalog && m.categoria === cat).length;
                return (
                  <button
                    key={cat}
                    id={`cat-pill-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-700'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredMenu.map((item) => {
              const hasAccompaniments = item.acompanhamentos && item.acompanhamentos.length > 0;
              const hasVariations = item.variacoes && item.variacoes.length > 0;
              const availableVariations = item.variacoes?.filter(v => v.disponivel !== false) || [];
              return (
                <div
                  key={item.id}
                  id={`product-card-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className={`bg-white rounded-xl p-3 border transition-all flex flex-col justify-between text-left group relative ${
                    item.disponivel && (!hasVariations || availableVariations.length > 0)
                      ? 'border-slate-200 hover:border-sky-400 hover:shadow-sm cursor-pointer active:scale-[0.99]'
                      : 'border-slate-200 bg-slate-50/80 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                        {item.categoria}
                      </span>
                      {hasAccompaniments && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.acompanhamentos!.length} guarnições
                        </span>
                      )}
                      {hasVariations && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {availableVariations.length} de {item.variacoes!.length} opções
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 leading-snug group-hover:text-blue-700 transition-colors">
                      {item.nome}
                    </h3>
                    
                    {item.descricao && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.descricao}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium">Preço</span>
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-900">
                        {formatCurrency(item.preco)}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!item.disponivel}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        item.disponivel
                          ? 'bg-sky-50 text-sky-700 border border-sky-200/80 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{hasAccompaniments ? 'Montar' : hasVariations ? 'Opções' : 'Adicionar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredMenu.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <Utensils className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-sm">Nenhum item encontrado</p>
                <p className="text-xs text-slate-400">Tente buscar por outro termo ou categoria</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order / Cart Panel (5 Cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col h-full sticky top-[110px] max-h-[calc(100vh-130px)]">
            
            {/* Header: Order Type Selector */}
            <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/70 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-sm text-slate-800">
                    Comanda / Pedido Atual
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    id="cart-clear-btn"
                    onClick={clearCart}
                    className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              {/* Order Type Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/80 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  id="order-type-balcao"
                  onClick={() => setOrderType('balcao')}
                  className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
                    orderType === 'balcao'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Balcão</span>
                </button>

                <button
                  type="button"
                  id="order-type-mesa"
                  onClick={() => setOrderType('mesa')}
                  className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
                    orderType === 'mesa'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Mesa</span>
                </button>

                <button
                  type="button"
                  id="order-type-delivery"
                  onClick={() => setOrderType('delivery')}
                  className={`py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
                    orderType === 'delivery'
                      ? 'bg-white text-blue-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Entrega</span>
                </button>
              </div>

              {customers.length > 0 && <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Cliente cadastrado (opcional)</label>
                <select value={selectedCustomerId} onChange={e => { const id=e.target.value; setSelectedCustomerId(id); const c=customers.find(x=>x.id===id); if(c) { setCustomerName(c.nome); setCustomerPhone(c.telefone || ''); setDeliveryAddress(c.endereco || ''); } }} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs">
                  <option value="">Selecionar cliente...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` • ${c.telefone}` : ''}</option>)}
                </select>
              </div>}

              {/* Dynamic Context Fields based on Order Type */}
              {orderType === 'mesa' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nº da Mesa
                    </label>
                    <select
                      id="pos-select-table"
                      value={selectedTableNumber || ''}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setSelectedTableNumber(num || null);
                        setTargetAccountChoice('');
                        const table = tables.find(t => t.numero === num);
                        if (table?.clienteNome) {
                          setCustomerInfo({ name: table.clienteNome });
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">Selecione a Mesa</option>
                      {tables.map(t => (
                        <option key={t.numero} value={t.numero}>
                          Mesa {t.numero} ({t.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedTableNumber !== null && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Conta de destino
                      </label>
                      <select
                        id="pos-select-account"
                        value={isNewAccountChoice ? 'nova' : (explicitAccount?.id || '')}
                        onChange={(e) => setTargetAccountChoice(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        {openTableAccounts.length === 0 && (
                          <option value="nova">Criar novo atendimento (nova conta)</option>
                        )}
                        {openTableAccounts.map(a => (
                          <option key={a.id} value={a.id}>
                            Continuar Conta {a.numero} • saldo R$ {a.saldoRestante.toFixed(2)} • {a.lancamentos ?? 0} lançamento{(a.lancamentos ?? 0) === 1 ? '' : 's'}
                          </option>
                        ))}
                        {openTableAccounts.length > 0 && (
                          <option value="nova">Criar novo atendimento (nova conta)</option>
                        )}
                      </select>
                      <p className="mt-1 text-[10px] text-slate-500" id="pos-account-hint">
                        {isNewAccountChoice
                          ? `Novo atendimento: este pedido será o lançamento ${previewCode} da nova Conta ${nextAccountNumber}.`
                          : explicitAccount
                            ? `Continuar Conta ${explicitAccount.numero}: novo lançamento ${previewCode} (${nextSequencePreview}º da conta).`
                            : ambiguousAccounts.length > 1
                              ? `Há mais de uma conta aberta nesta mesa (${ambiguousAccounts.map(a => `Conta ${a.numero}`).join(' e ')}). Escolha qual continua.`
                              : 'Nenhuma conta aberta nesta mesa: este pedido abrirá um novo atendimento.'}
                      </p>
                      {openTableAccounts.length > 1 && !targetAccountChoice && (
                        <p className="mt-1 text-[10px] font-semibold text-amber-700">
                          Há mais de uma conta aberta nesta mesa. Escolha qual continua.
                        </p>
                      )}
                      {occupiedByOther && (
                        <p className="mt-1 text-[10px] font-semibold text-amber-700">
                          Mesa {selectedTable?.numero} ocupada pela {occupiedAccount ? `Conta ${occupiedAccount.numero}` : 'outra conta'}. Um novo atendimento
                          {targetAccountChoice ? ' será criado sem ocupar a mesa' : ' não pode ocupar esta mesa'}.
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Identificação / Nome
                    </label>
                    <input
                      type="text"
                      id="pos-table-client-name"
                      value={customerName}
                      onChange={(e) => setCustomerInfo({ name: e.target.value })}
                      placeholder="Ex: Carlos, Família..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Nome do Cliente
                      </label>
                      <input
                        type="text"
                        id="pos-delivery-name"
                        value={customerName}
                        onChange={(e) => setCustomerInfo({ name: e.target.value })}
                        placeholder="Nome..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        id="pos-delivery-phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerInfo({ phone: e.target.value })}
                        placeholder="Telefone..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Endereço Completo
                      </label>
                      <input
                        type="text"
                        id="pos-delivery-address"
                        value={deliveryAddress}
                        onChange={(e) => setCustomerInfo({ address: e.target.value })}
                        placeholder="Rua, Número, Bairro, Apto..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Taxa (R$)
                      </label>
                      <input
                        type="number"
                        id="pos-delivery-fee"
                        value={deliveryFee}
                        onChange={(e) => setCustomerInfo({ fee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {orderType === 'balcao' && (
                <div>
                  <input
                    type="text"
                    id="pos-balcao-name"
                    value={customerName}
                    onChange={(e) => setCustomerInfo({ name: e.target.value })}
                    placeholder="Nome do cliente no balcão (opcional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">Pedido vazio</p>
                  <p className="text-[11px] text-slate-400">Clique nos itens à esquerda para adicionar</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-xs text-slate-800 block leading-tight">
                          {item.nome}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatCurrency(item.precoUnitario)} cada
                        </span>
                      </div>
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(item.precoUnitario * item.quantidade)}
                      </div>
                    </div>

                    {/* Accompaniments tags */}
                    {item.acompanhamentosEscolhidos && item.acompanhamentosEscolhidos.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.acompanhamentosEscolhidos.map((acc, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-800 border border-sky-200"
                          >
                            {acc}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.remocoes && item.remocoes.length > 0 && (
                      <div className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 italic">
                        Sem: {item.remocoes.join(', ')}
                      </div>
                    )}

                    {/* Note */}
                    {item.observacao && (
                      <div className="text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 italic">
                        Obs: {item.observacao}
                      </div>
                    )}

                    {/* Quantity bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.cartItemId, -1)}
                          className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs font-mono">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.cartItemId, 1)}
                          className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cartItemId)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary & Actions */}
            <div className="p-3 border-t border-slate-200 bg-slate-50/70 rounded-b-xl space-y-2.5">
              {/* Calculations */}
              <div className="text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                </div>

                {/* Discount input toggle */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3 text-slate-400" />
                    <span>Desconto:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">R$</span>
                    <input
                      type="number"
                      id="pos-discount-input"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-right font-mono text-xs bg-white"
                    />
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega:</span>
                    <span className="font-mono">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}

                <div className="flex justify-between font-extrabold text-base pt-2 border-t border-slate-200 text-slate-900">
                  <span>Total a Pagar:</span>
                  <span className="font-mono text-lg sm:text-xl text-blue-700">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                {/* Confirmar pedido / gerar via impressa */}
                <button
                  type="button"
                  id="pos-confirm-order-btn"
                  disabled={cart.length === 0}
                  onClick={handleConfirmOrder}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                  title="Confirmar pedido e gerar a via impressa"
                >
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                  <span>Confirmar Pedido</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Accompaniments Modal */}
      <AccompanimentModal
        item={selectedItemForModal}
        isOpen={isItemModalOpen}
        onClose={closeItemModal}
        onConfirm={handleAccompanimentConfirm}
      />

      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
