import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { PaymentMethodId } from '../../types';
import { 
  X, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Plus, 
  FileText, 
  HelpCircle,
  Coins,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export const ManualPaymentModal: React.FC = () => {
  const { 
    isPaymentModalOpen, 
    closePaymentModal, 
    orderForPaymentModal, 
    paymentOptions,
    addManualPaymentToOrder,
    reverseOrderPayment,
    markOrderAsPaidManually,
    currentUser
  } = useRestaurant();

  const [selectedForma, setSelectedForma] = useState<PaymentMethodId>('dinheiro');
  const [valorInput, setValorInput] = useState<string>('');
  const [valorRecebidoInput, setValorRecebidoInput] = useState<string>('');
  const [observacaoInput, setObservacaoInput] = useState<string>('');
  const [showEstornoConfirmId, setShowEstornoConfirmId] = useState<string | null>(null);
  const [motivoEstornoInput, setMotivoEstornoInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isPaymentModalOpen || !orderForPaymentModal) return null;

  const total = orderForPaymentModal.total;
  const jaRegistrado = orderForPaymentModal.valorTotalPago;
  const restante = orderForPaymentModal.saldoRestante;
  const pagamentos = orderForPaymentModal.pagamentos || [];

  const valorNum = parseFloat(valorInput.replace(',', '.')) || 0;
  const valorRecebidoNum = parseFloat(valorRecebidoInput.replace(',', '.')) || 0;
  const trocoCalculado = (selectedForma === 'dinheiro' && valorRecebidoNum > valorNum) 
    ? valorRecebidoNum - valorNum 
    : 0;

  const handleSetQuickRemaining = () => {
    setValorInput(restante.toFixed(2));
    if (selectedForma === 'dinheiro') {
      setValorRecebidoInput(restante.toFixed(2));
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (valorNum <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (valorNum > restante + 0.01) {
      setErrorMsg(`O valor (R$ ${valorNum.toFixed(2)}) não pode ser superior ao saldo restante (R$ ${restante.toFixed(2)}).`);
      return;
    }

    const success = addManualPaymentToOrder(
      orderForPaymentModal.id,
      selectedForma,
      valorNum,
      selectedForma === 'dinheiro' ? valorRecebidoNum : undefined,
      observacaoInput.trim() || undefined
    );

    if (!success) setErrorMsg('Pagamento não registrado. Confira o caixa, o saldo e o valor recebido.');
    if (success) {
      const quitouConta = valorNum >= restante - 0.01;
      setValorInput('');
      setValorRecebidoInput('');
      setObservacaoInput('');

      // Ao quitar o saldo inteiro, o fluxo de baixa terminou: fecha o diálogo.
      // Pagamentos parciais continuam visíveis para permitir registrar o restante.
      if (quitouConta) {
        closePaymentModal();
      }
    }
  };

  const handleConfirmEstorno = (paymentId: string) => {
    if (!motivoEstornoInput.trim()) {
      setErrorMsg('É obrigatório informar o motivo do estorno para fins de auditoria.');
      return;
    }
    reverseOrderPayment(orderForPaymentModal.id, paymentId, motivoEstornoInput.trim());
    setShowEstornoConfirmId(null);
    setMotivoEstornoInput('');
    setErrorMsg(null);
  };

  const handleMarkAsPaidFull = () => {
    markOrderAsPaidManually(orderForPaymentModal.id);
    closePaymentModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Registrar Pagamento Manual</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">
                  Pedido #{orderForPaymentModal.numero}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {orderForPaymentModal.tipo.toUpperCase()} • {orderForPaymentModal.nomeCliente || 'Cliente Salão'} 
                {orderForPaymentModal.mesaNumero ? ` • Mesa ${orderForPaymentModal.mesaNumero}` : ''}
              </p>
            </div>
          </div>
          <button
            id="close-manual-payment-modal-btn"
            onClick={closePaymentModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Notice (Strict manual rule) */}
        <div className="bg-sky-50 border-b border-sky-200 px-6 py-2.5 flex items-start gap-2.5 text-xs text-sky-950">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            <strong>Pagamento externo/manual:</strong> O atendente cobra o cliente fisicamente (maquininha física, dinheiro em espécie, Pix na chave da loja) e registra aqui apenas a confirmação para baixa da conta.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Account Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-center">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Total da Conta</span>
              <div className="text-lg font-extrabold text-stone-900 mt-0.5">{formatCurrency(total)}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Já Registrado</span>
              <div className="text-lg font-extrabold text-emerald-700 mt-0.5">{formatCurrency(jaRegistrado)}</div>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              restante === 0 ? 'bg-stone-50 border-stone-200 text-stone-400' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <span className="text-[11px] font-semibold uppercase tracking-wide">Saldo Restante</span>
              <div className="text-lg font-extrabold mt-0.5">{formatCurrency(restante)}</div>
            </div>
          </div>

          {/* New Payment Registration Form */}
          {restante > 0 ? (
            <form onSubmit={handleAddPayment} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Adicionar Pagamento Manual
                </span>
                <button
                  type="button"
                  id="pay-quick-fill-remaining-btn"
                  onClick={handleSetQuickRemaining}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 underline decoration-dotted"
                >
                  Pagar valor restante ({formatCurrency(restante)})
                </button>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Forma de Pagamento Recebida Fora do Sistema:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {paymentOptions.filter(p => p.ativo).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      id={`select-forma-${opt.id}`}
                      onClick={() => setSelectedForma(opt.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center truncate ${
                        selectedForma === opt.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-sky-400'
                      }`}
                    >
                      {opt.nome.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value & Change Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Valor a Baixar (R$):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">R$</span>
                    <input
                      id="input-manual-payment-value"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={restante}
                      placeholder={restante.toFixed(2)}
                      value={valorInput}
                      onChange={(e) => setValorInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Troco Calculator for Dinheiro */}
                {selectedForma === 'dinheiro' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                      <span>Valor Entregue pelo Cliente:</span>
                      {trocoCalculado > 0 && (
                        <span className="text-emerald-700 font-bold">
                          Troco: {formatCurrency(trocoCalculado)}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">R$</span>
                      <input
                        id="input-manual-payment-received"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 100.00"
                        value={valorRecebidoInput}
                        onChange={(e) => setValorRecebidoInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Observation / Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Observação do Pagamento (Opcional):
                </label>
                <input
                  id="input-manual-payment-notes"
                  type="text"
                  placeholder="Ex: Comprovante verificado no WhatsApp / Cartão Visa cliente final 4022"
                  value={observacaoInput}
                  onChange={(e) => setObservacaoInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                id="submit-add-manual-payment-btn"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Registrar Pagamento de {valorNum > 0 ? formatCurrency(valorNum) : 'Valor'}
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-1">
              <CheckCircle className="w-6 h-6 mx-auto text-emerald-600" />
              <div className="font-bold text-sm">Conta Quitada Integralmente!</div>
              <p className="text-xs text-emerald-700">O total de {formatCurrency(total)} foi totalmente coberto pelos registros manuais.</p>
            </div>
          )}

          {/* Registered Payments History List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center justify-between">
              <span>Registros de Pagamento deste Pedido ({pagamentos.length})</span>
              <span className="text-[11px] text-stone-400 normal-case font-normal">Operador: {currentUser.nome}</span>
            </h4>

            {pagamentos.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed border-stone-300 text-stone-400 text-xs">
                Nenhum pagamento registrado ainda para este pedido.
              </div>
            ) : (
              <div className="space-y-2">
                {pagamentos.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                      p.estornado 
                        ? 'bg-stone-100 border-stone-200 opacity-60 line-through' 
                        : 'bg-white border-stone-200 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">{p.formaNome}</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          {formatCurrency(p.valor)}
                        </span>
                        {p.estornado && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 no-underline">
                            Estornado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>Por: {p.registradoPor}</span>
                        <span>• {p.dataHora}</span>
                        {p.troco && p.troco > 0 ? <span>• Troco dado: {formatCurrency(p.troco)}</span> : null}
                      </div>
                      {p.observacao && (
                        <div className="text-[11px] text-stone-600 italic mt-0.5 no-underline">
                          "{p.observacao}"
                        </div>
                      )}
                      {p.estornado && p.motivoEstorno && (
                        <div className="text-[10px] text-rose-700 mt-1 no-underline font-medium">
                          Motivo do estorno: {p.motivoEstorno} (por {p.estornadoPor})
                        </div>
                      )}
                    </div>

                    {/* Estornar Action */}
                    {!p.estornado && (
                      <div>
                        {showEstornoConfirmId === p.id ? (
                          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200">
                            <input
                              type="text"
                              placeholder="Motivo obrigatório do estorno..."
                              value={motivoEstornoInput}
                              onChange={(e) => setMotivoEstornoInput(e.target.value)}
                              className="text-xs px-2 py-1 rounded border border-rose-300 bg-white"
                            />
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => setShowEstornoConfirmId(null)}
                                className="px-2 py-0.5 text-[11px] text-stone-600 hover:text-stone-900"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmEstorno(p.id)}
                                className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700"
                              >
                                Confirmar Estorno
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`estornar-payment-${p.id}`}
                            onClick={() => {
                              setShowEstornoConfirmId(p.id);
                              setMotivoEstornoInput('');
                            }}
                            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50"
                            title="Estornar registro de pagamento"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Estornar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            id="close-manual-payment-footer-btn"
            onClick={closePaymentModal}
            className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-xs shadow-2xs"
          >
            Fechar
          </button>

          {restante === 0 ? (
            <button
              type="button"
              id="confirm-order-paid-completed-btn"
              onClick={handleMarkAsPaidFull}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Finalizar Pedido como Pago
            </button>
          ) : (
            <div className="text-xs text-stone-500 font-medium">
              Faltam registrar <strong className="text-rose-600">{formatCurrency(restante)}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
