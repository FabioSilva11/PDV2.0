import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/context/RestaurantContext.tsx';
let s = readFileSync(path, 'utf8');
function replace(name, next, body) {
  const a = s.indexOf(`  const ${name} =`), b = s.indexOf(`  const ${next} =`, a);
  if (a < 0 || b < 0) throw Error(name);
  s = s.slice(0, a) + body + '\n\n' + s.slice(b);
}
replace('deductRecipeIngredients', 'createOrder', `  const deductRecipeIngredients = (cartItems: CartItem[], restore = false) => {
    const usages = new Map<string, number>();
    for (const item of cartItems) {
      quantity(item.quantidade);
      const product = store.state.menu.find((m: MenuItem) => m.id === item.menuItemId) as MenuItem | undefined;
      if (!restore && (!product || !product.disponivel)) throw new Error('Produto indisponível.');
      const recipe = item.ingredientesConsumidos || (product?.estoqueControlado ? product.fichaTecnica || [] : []);
      for (const usage of recipe) usages.set(usage.ingredienteId, (usages.get(usage.ingredienteId) || 0) + quantity(usage.quantidade) * item.quantidade);
    }
    for (const [id, qty] of usages) {
      const ing = store.state.ingredients.find((i: Ingredient) => i.id === id) as Ingredient | undefined;
      if (!ing || (!restore && ing.estoqueAtual + 1e-9 < qty)) throw new Error('Estoque insuficiente para concluir o pedido.');
    }
    setIngredients(prev => prev.map(ing => {
      const qty = usages.get(ing.id);
      if (!qty) return ing;
      const next = Number((ing.estoqueAtual + (restore ? qty : -qty)).toFixed(6));
      setStockMovements(prev => [{ id: uid('mov'), ingredienteId: ing.id, tipo: restore ? 'entrada' : 'saida_venda', quantidade: qty, unidade: ing.unidade, custoTotal: money(qty * ing.custoMedio), motivo: restore ? 'Cancelamento de pedido' : 'Consumo de pedido', usuario: currentUser.nome, dataHora: new Date().toISOString() }, ...prev]);
      if (!restore && next <= ing.estoqueMinimo) addAlert({ tipo: 'estoque_baixo', titulo: 'Estoque baixo: ' + ing.nome, mensagem: 'Restam ' + next + ' ' + ing.unidade, gravidade: 'alta', linkAcao: 'estoque' });
      return { ...ing, estoqueAtual: next };
    }));
  };

  const snapshotItems = (items: CartItem[]): CartItem[] => items.map(item => {
    const product = store.state.menu.find((m: MenuItem) => m.id === item.menuItemId) as MenuItem | undefined;
    const recipe = product?.estoqueControlado ? [...(product.fichaTecnica || [])] : [];
    for (const addon of item.adicionais || []) {
      const option = product?.gruposAdicionais?.flatMap(g => g.opcoes).find(a => a.id === addon.addonId);
      if (product?.estoqueControlado) recipe.push(...(option?.ingredientes || []));
    }
    return { ...structuredClone(item), cartItemId: uid('item'), ingredientesConsumidos: recipe, statusProducao: 'pendente' };
  });
  const syncTableTotals = (order: Order) => {
    setTables(prev => prev.map(t => t.pedidoAtivoId === order.id ? { ...t, valorAtual: order.saldoRestante } : t));
  };
  const dispatchItems = (order: Order, items: CartItem[], prefix = 'PEDIDO') => {
    for (const station of new Set(items.map(i => i.estacaoProducao))) {
      const route = routingRules.find(r => r.estacao === station);
      const printer = store.state.printers.find((p: PrinterDevice) => p.id === route?.impressoraId) as PrinterDevice | undefined;
      if (!printer) continue;
      const content = items.filter(i => i.estacaoProducao === station).map(i => i.quantidade + 'x ' + i.nome + (i.observacao ? ' [OBS: ' + i.observacao + ']' : '') + (i.adicionais || []).map(a => ' + ' + a.nome).join('')).join('\\n');
      setPrintQueue(prev => [{ id: uid('job'), impressoraId: printer.id, impressoraNome: printer.nome, pedidoNumero: order.numero, titulo: prefix + ' #' + order.numero, conteudoTexto: content, status: 'pendente', dataHora: new Date().toISOString(), tentativas: 0 }, ...prev]);
    }
  };`);
replace('createOrder', 'updateOrderStatus', `  const createOrder = (data: Partial<Order>): Order => {
    if (data.operacaoId) {
      const existing = store.state.orders.find((o: Order) => o.operacaoId === data.operacaoId);
      if (existing) return existing;
    }
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa antes de vender.');
    if (!data.itens?.length) throw new Error('Adicione produtos ao pedido.');
    if (data.desconto) requirePermission(currentUser, 'aplicarDesconto');
    const values = totals(data.itens, data.desconto, data.taxaServico, data.taxaEntrega);
    const table = data.tipo === 'mesa' ? store.state.tables.find((t: Table) => t.numero === data.mesaNumero) as Table | undefined : undefined;
    if (data.tipo === 'mesa' && (!table || table.pedidoAtivoId)) throw new Error('Mesa inexistente ou com pedido ativo. Adicione itens à conta existente.');
    const items = snapshotItems(data.itens);
    deductRecipeIngredients(items);
    let order: Order = { ...data, ...values, id: uid('ord'), operacaoId: data.operacaoId || uid('op'), numero: Math.max(1000, ...store.state.orders.map((o: Order) => o.numero)) + 1,
      tipo: data.tipo || 'balcao', garcomNome: data.garcomNome || currentUser.nome, canal: data.canal || (data.tipo === 'mesa' ? 'Salão' : data.tipo === 'delivery' ? 'Delivery' : 'Balcão'), criadoEm: new Date().toISOString(), itens: items,
      status: 'novo', statusPagamento: values.total === 0 ? 'pago' : 'pendente', pagamentos: [], valorTotalPago: 0, saldoRestante: values.total };
    setOrders(prev => [order, ...prev]);
    if (table) setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'ocupada', pedidoAtivoId: order.id, valorAtual: order.total, abertaEm: t.abertaEm || order.criadoEm } : t));
    if (data.pagamentos?.length) {
      for (const payment of data.pagamentos) {
        if (!addManualPaymentToOrder(order.id, payment.formaId, payment.valor, payment.valorRecebido, payment.observacao)) throw new Error('Pagamento inválido.');
      }
      order = store.state.orders.find((o: Order) => o.id === order.id);
    }
    dispatchItems(order, items);
    logAuditEvent('Criação de pedido', 'Pedido #' + order.numero, order.numero, order.total);
    return order;
  };`);
replace('cancelOrder', 'cancelOrderItem', `  const cancelOrder = (orderId: string, motivo: string) => {
    requirePermission(currentUser, 'cancelarPedido');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    if (!motivo.trim()) throw new Error('Informe o motivo do cancelamento.');
    if (order.valorTotalPago > 0) throw new Error('Estorne os pagamentos antes de cancelar.');
    deductRecipeIngredients(order.itens, true);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelado', cancelamento: { motivo, usuario: currentUser.nome, dataHora: new Date().toISOString() } } : o));
    setTables(prev => prev.map(t => t.pedidoAtivoId === orderId ? { ...t, status: 'livre', pedidoAtivoId: undefined, valorAtual: 0, clienteNome: undefined } : t));
    dispatchItems(order, order.itens, 'CANCELAMENTO');
    logAuditEvent('Cancelamento de pedido', motivo, order.numero, order.total);
  };`);
replace('cancelOrderItem', 'addItemsToOrder', `  const cancelOrderItem = (orderId: string, itemId: string, motivo: string) => {
    requirePermission(currentUser, 'cancelarPedido');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    const removed = order.itens.find(i => i.cartItemId === itemId);
    if (!removed) return;
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    const items = order.itens.filter(i => i.cartItemId !== itemId);
    const values = totals(items, Math.min(order.desconto, calculateSubtotal(items)), order.taxaServico, order.taxaEntrega);
    if (values.total < order.valorTotalPago) throw new Error('Estorne o valor excedente antes de remover o item.');
    deductRecipeIngredients([removed], true);
    const next = reconcile({ ...order, ...values, itens: items });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    dispatchItems(order, [removed], 'CANCELAMENTO DE ITEM');
    logAuditEvent('Item cancelado', motivo, order.numero);
  };`);
replace('addItemsToOrder', 'applyOrderDiscount', `  const addItemsToOrder = (orderId: string, newItems: CartItem[]) => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado' || !newItems.length) return;
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa.');
    const added = snapshotItems(newItems);
    const items = [...order.itens, ...added];
    const values = totals(items, order.desconto, order.taxaServico, order.taxaEntrega);
    deductRecipeIngredients(added);
    const next = reconcile({ ...order, ...values, itens: items, status: 'em_preparacao' });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    dispatchItems(order, added, 'ADICIONAL');
    logAuditEvent('Adição de itens', 'Itens adicionados ao pedido', order.numero);
  };`);
replace('applyOrderDiscount', 'updateOrderItemProductionStatus', `  const applyOrderDiscount = (orderId: string, desconto: number, motivo: string) => {
    requirePermission(currentUser, 'aplicarDesconto');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado') return;
    const values = totals(order.itens, desconto, order.taxaServico, order.taxaEntrega);
    if (values.total < order.valorTotalPago) throw new Error('Estorne o excedente antes de aplicar desconto.');
    const next = reconcile({ ...order, ...values, descontoMotivo: motivo });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    syncTableTotals(next);
    logAuditEvent('Desconto', motivo, order.numero, desconto);
  };`);
replace('reopenOrder', 'addManualPaymentToOrder', `  const reopenOrder = (id: string, motivo: string) => {
    requirePermission(currentUser, 'reabrirConta');
    const order = store.state.orders.find((o: Order) => o.id === id) as Order | undefined;
    if (!order) return;
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    if (order.status === 'cancelado') deductRecipeIngredients(order.itens);
    setOrders(prev => prev.map(o => o.id === id ? { ...reconcile(o), status: 'confirmado', cancelamento: undefined } : o));
    logAuditEvent('Reabertura de pedido', motivo, order.numero);
  };`);
replace('addManualPaymentToOrder', 'reverseOrderPayment', `  const addManualPaymentToOrder = (orderId: string, formaId: PaymentMethodId, valor: number, valorRecebido?: number, observacao?: string): boolean => {
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    const option = store.state.paymentOptions.find((p: ManualPaymentOption) => p.id === formaId) as ManualPaymentOption | undefined;
    if (!order || order.status === 'cancelado' || !store.state.cashRegister.aberto || !option?.ativo) return false;
    if (!Number.isFinite(valor) || valor <= 0 || money(valor) > order.saldoRestante || order.saldoRestante <= 0) return false;
    valor = amount(valor, 'Pagamento', false);
    const received = formaId === 'dinheiro' ? (valorRecebido ?? valor) : valor;
    if (!Number.isFinite(received) || received < valor) return false;
    amount(received);
    const payment: PaymentRecord = { id: uid('pay'), formaId, formaNome: option.nome, valor, valorRecebido: money(received), troco: formaId === 'dinheiro' ? money(received - valor) : 0, observacao, dataHora: new Date().toISOString(), registradoPor: currentUser.nome };
    const next = reconcile({ ...order, pagamentos: [...order.pagamentos, payment] });
    // Payment does not mark food as delivered or remove it from the kitchen.
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta + (formaId === 'dinheiro' ? valor : 0)), transacoes: [{ id: uid('tx'), tipo: 'venda_manual', valor, motivo: 'Recebimento pedido #' + order.numero, formaPagamento: formaId, horario: new Date().toISOString(), pedidoId: orderId, operador: currentUser.nome }, ...prev.transacoes] }));
    syncTableTotals(next);
    logAuditEvent('Registro manual de pagamento', option.nome, order.numero, valor);
    return true;
  };`);
replace('reverseOrderPayment', 'markOrderAsPaidManually', `  const reverseOrderPayment = (orderId: string, paymentId: string, motivo: string) => {
    requirePermission(currentUser, 'estornarPagamento');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    const payment = order?.pagamentos.find(p => p.id === paymentId);
    if (!order || !payment || payment.estornado) return;
    if (!store.state.cashRegister.aberto) throw new Error('Abra o caixa para registrar o estorno.');
    if (!motivo.trim()) throw new Error('Informe o motivo do estorno.');
    if (payment.formaId === 'dinheiro' && store.state.cashRegister.saldoAtualGaveta < payment.valor) throw new Error('Saldo de caixa insuficiente para estorno.');
    const next = reconcile({ ...order, pagamentos: order.pagamentos.map(p => p.id === paymentId ? { ...p, estornado: true, motivoEstorno: motivo, estornadoPor: currentUser.nome, estornadoEm: new Date().toISOString() } : p) });
    setOrders(prev => prev.map(o => o.id === orderId ? next : o));
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta - (payment.formaId === 'dinheiro' ? payment.valor : 0)), transacoes: [{ id: uid('tx-rev'), tipo: 'saida_manual', valor: payment.valor, formaPagamento: payment.formaId, motivo: 'Estorno: ' + motivo, horario: new Date().toISOString(), pedidoId: orderId, operador: currentUser.nome }, ...prev.transacoes] }));
    syncTableTotals(next);
    logAuditEvent('Estorno de pagamento', motivo, order.numero, payment.valor);
  };`);
replace('markOrderAsPaidManually', 'openPaymentModal', `  const markOrderAsPaidManually = (orderId: string) => {
    requirePermission(currentUser, 'aplicarDesconto');
    const order = store.state.orders.find((o: Order) => o.id === orderId) as Order | undefined;
    if (!order || order.status === 'cancelado' || !order.saldoRestante) return;
    throw new Error('Selecione a forma e registre o pagamento. Para cortesia, aplique desconto com motivo.');
  };`);
replace('addItemsToTable', 'requestTableBill', `  const addItemsToTable = (number: number, items: CartItem[]) => {
    const table = store.state.tables.find((t: Table) => t.numero === number) as Table | undefined;
    if (!table || !items.length) return;
    if (table.pedidoAtivoId) addItemsToOrder(table.pedidoAtivoId, items);
    else createOrder({ tipo: 'mesa', mesaNumero: number, nomeCliente: table.clienteNome, itens: items });
  };`);
replace('openCashRegister', 'closeCashRegister', `  const openCashRegister = (initialAmount: number) => {
    if (store.state.cashRegister.aberto) return;
    const initial = amount(initialAmount, 'Fundo inicial');
    const previous = store.state.cashRegister as CashRegister;
    if (previous.fechadoEm) store.set('cashHistory', [...(store.state.cashHistory || []), previous]);
    setCashRegister({ id: uid('cash'), aberto: true, operadorAbertura: currentUser.nome, abertoEm: new Date().toISOString(), saldoInicial: initial, saldoAtualGaveta: initial, transacoes: [] });
    logAuditEvent('Abertura de caixa', 'Fundo inicial', undefined, initial);
  };`);
replace('addCashMovement', 'addStockMovement', `  const addCashMovement = (tipo: 'suprimento' | 'sangria' | 'entrada_manual' | 'saida_manual', valor: number, motivo: string) => {
    if (!store.state.cashRegister.aberto) throw new Error('Caixa fechado.');
    valor = amount(valor, 'Movimentação', false);
    if (!motivo.trim()) throw new Error('Informe o motivo.');
    const incoming = tipo === 'suprimento' || tipo === 'entrada_manual';
    if (!incoming && valor > store.state.cashRegister.saldoAtualGaveta) throw new Error('Saldo insuficiente na gaveta.');
    setCashRegister(prev => ({ ...prev, saldoAtualGaveta: money(prev.saldoAtualGaveta + (incoming ? valor : -valor)), transacoes: [{ id: uid('tx'), tipo, valor, motivo, horario: new Date().toISOString(), operador: currentUser.nome }, ...prev.transacoes] }));
    logAuditEvent('Movimentação de caixa', motivo, undefined, valor);
  };`);
replace('addStockMovement', 'addBatch', `  const addStockMovement = (id: string, tipo: StockMovement['tipo'], qty: number, motivo: string) => {
    requirePermission(currentUser, 'modificarEstoque');
    const ing = store.state.ingredients.find((i: Ingredient) => i.id === id) as Ingredient | undefined;
    if (!ing) throw new Error('Ingrediente inexistente.');
    quantity(qty, tipo === 'inventario' || tipo === 'ajuste');
    const next = tipo === 'entrada' ? ing.estoqueAtual + qty : tipo === 'inventario' || tipo === 'ajuste' ? qty : ing.estoqueAtual - qty;
    if (next < 0) throw new Error('Estoque insuficiente.');
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, estoqueAtual: Number(next.toFixed(6)) } : i));
    setStockMovements(prev => [{ id: uid('mov'), ingredienteId: id, tipo, quantidade: qty, unidade: ing.unidade, custoTotal: money(qty * ing.custoMedio), motivo, usuario: currentUser.nome, dataHora: new Date().toISOString() }, ...prev]);
    logAuditEvent('Movimentação de estoque', motivo);
  };`);
// Preserve line IDs supplied by the cart, since existing callers use them for removal.
s = s.replace("cartItemId: uid('item'), ingredientesConsumidos", "cartItemId: item.cartItemId || uid('item'), ingredientesConsumidos");
s = s.replace('  const saveMenuItem = useCallback((item: MenuItem) => {', `  const saveMenuItem = useCallback((item: MenuItem) => {
    requirePermission(currentUser, 'excluirProduto');
    amount(item.preco, 'Preço');
    if (!item.nome.trim() || item.nome.length > 200) throw new Error('Nome de produto inválido.');`);
s = s.replace('  const deleteMenuItem = useCallback((id: string) => {', `  const deleteMenuItem = useCallback((id: string) => {
    requirePermission(currentUser, 'excluirProduto');`);
s = s.replace('  const updateItemPrice = useCallback((id: string, newPrice: number) => {', `  const updateItemPrice = useCallback((id: string, newPrice: number) => {
    requirePermission(currentUser, 'excluirProduto');
    newPrice = amount(newPrice, 'Preço');`);
s = s.replace('if (t.numero === tableNumber) {\n        return {\n          ...t,\n          status: \'ocupada\'', 'if (t.numero === tableNumber && t.status === \'livre\') {\n        return {\n          ...t,\n          status: \'ocupada\'');
s = s.replace("if (!origin || origin.status === 'livre') return;", "if (!origin || origin.status === 'livre') return;\n    const target = store.state.tables.find((t: Table) => t.numero === toTable);\n    if (!target || target.status !== 'livre' || fromTable === toTable) throw new Error('Escolha uma mesa livre.');");
s = s.replace("  const updateIngredient = useCallback((ing: Ingredient) => {", "  const updateIngredient = useCallback((ing: Ingredient) => {\n    requirePermission(currentUser, 'modificarEstoque');\n    quantity(ing.estoqueAtual, true);");
s = s.replace("  const closeCashRegister = useCallback((blindCloseData?: CashRegister['fechamentoCego']) => {", "  const closeCashRegister = useCallback((blindCloseData?: CashRegister['fechamentoCego']) => {\n    if (!store.state.cashRegister.aberto) return;\n    if (!['Administrador', 'Gerente', 'Gerente Geral', 'Caixa', 'Operador de Caixa'].includes(currentUser.cargo)) throw new Error('Sem permissão para fechar caixa.');\n    if (blindCloseData) { amount(blindCloseData.dinheiroInformado); amount(blindCloseData.pixInformado); amount(blindCloseData.cartaoInformado); amount(blindCloseData.outrosInformado); }");
s = s.replace('if (po.id === poId) {', "if (po.id === poId && po.status !== 'recebido') {");
// General unique IDs, including audit and queue records.
s = s.replace(/'([a-z-]+)-' \+ Date\.now\(\)( \+ '-' \+ Math\.random\(\)\.toString\(36\)\.substring\(2, [345]\))?/g, (_, prefix) => `uid('${prefix}')`);
writeFileSync(path, s);
