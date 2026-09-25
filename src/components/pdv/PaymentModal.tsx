import React, { useState, useEffect, useRef } from 'react';
import { PaymentMethod, Order } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import { buildPixPayload } from '../../utils/pix';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  AlertTriangle 
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, amountPaid?: number, change?: number) => Order;
  onReceiptTrigger: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  total,
  onClose,
  onConfirm,
  onReceiptTrigger,
}) => {
  const { settings } = useRestaurant();
  const [method, setMethod] = useState<PaymentMethod>('dinheiro');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  // PIX e valores rápidos vêm da configuração do estabelecimento (banco),
  // não de variáveis de ambiente nem constantes no componente.
  const pix = settings.pix;
  const quickAmounts = settings.cashier.quickAmounts;

  useEffect(() => {
    if (isOpen) {
      locked.current = false;
      setFinished(false);
      setError('');
      setMethod('dinheiro');
      setCashGiven(total.toFixed(2));
      setCopiedPix(false);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const cashNum = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashNum - total);
  const isInsufficient = !Number.isFinite(total) || total < 0 || (method === 'dinheiro' && (!Number.isFinite(cashNum) || cashNum < total));

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount.toFixed(2));
  };

  const handleCopyPix = async () => {
    if (!pix.chave) {
      setError('Chave PIX não configurada. Defina em Configurações do Estabelecimento.');
      return;
    }
    try {
      const pixCode = buildPixPayload(pix.chave, total, pix.nomeRecebedor, pix.cidade, pix.descricao || 'PEDIDO');
      await navigator.clipboard.writeText(pixCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o PIX.');
    }
  };

  const handleFinalize = (printImmediately: boolean = false) => {
    if (isInsufficient || locked.current) return;
    locked.current = true;
    setError('');

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch {
      // ignore
    }

    try {
    const order = onConfirm(
      method, 
      method === 'dinheiro' ? cashNum : total, 
      method === 'dinheiro' ? change : 0
    );

    setFinished(true);
    onClose();

    if (printImmediately) {
      onReceiptTrigger(order);
    }
    } catch (err) {
      locked.current = false;
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div>
            <h2 className="text-lg font-bold font-serif">
              Finalizar Pagamento
            </h2>
            <p className="text-xs text-stone-400">
              Selecione a forma de pagamento do cliente
            </p>
          </div>
          <button
            id="payment-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && <p role="alert" className="text-red-700">{error}</p>}
          {/* Total display highlight */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
            <span className="text-xs uppercase font-bold tracking-wider text-stone-500">
              Valor Total a Receber
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-stone-900 mt-1">
              {formatCurrency(total)}
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                id="pay-method-cash"
                onClick={() => setMethod('dinheiro')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  method === 'dinheiro'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                id="pay-method-pix"
                onClick={() => setMethod('pix')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  method === 'pix'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm ring-1 ring-teal-500'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <QrCode className="w-5 h-5 text-teal-600" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                id="pay-method-debito"
                onClick={() => setMethod('debito')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  method === 'debito'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Débito</span>
              </button>

              <button
                type="button"
                id="pay-method-credito"
                onClick={() => setMethod('credito')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  method === 'credito'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-sm ring-1 ring-purple-500'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-purple-600" />
                <span>Crédito</span>
              </button>
            </div>
          </div>

          {/* Conditional Method Details */}
          {method === 'dinheiro' && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Valor Entregue pelo Cliente (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    id="cash-amount-input"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 font-mono text-lg font-bold text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick money chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickCash(total)}
                  className="px-3 py-1.5 bg-white border border-stone-300 hover:border-emerald-500 rounded-lg text-xs font-semibold text-stone-700 hover:text-emerald-800"
                >
                  Exato ({formatCurrency(total)})
                </button>
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickCash(val)}
                    className="px-3 py-1.5 bg-white border border-stone-300 hover:border-emerald-500 rounded-lg text-xs font-semibold text-stone-700 hover:text-emerald-800"
                  >
                    R$ {val}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isInsufficient 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isInsufficient ? 'Falta Pagar:' : 'Troco a Devolver:'}
                </span>
                <span className="text-xl font-mono font-bold">
                  {isInsufficient 
                    ? formatCurrency(total - cashNum)
                    : formatCurrency(change)}
                </span>
              </div>

              {isInsufficient && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>O valor entregue é menor que o total da venda.</span>
                </div>
              )}
            </div>
          )}

          {method === 'pix' && (
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 flex flex-col items-center text-center space-y-4 animate-in fade-in">
              <div className={`w-full rounded-2xl p-5 border ${pix.chave ? 'bg-white border-teal-300' : 'bg-sky-50 border-sky-300'}`}>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">PIX manual</div>
                <div className="mt-2 text-sm font-bold text-slate-900">{pix.chave ? 'Chave PIX configurada' : 'Chave PIX não configurada'}</div>
                <div className="mt-1 text-xs text-slate-500">O QR Code/copia e cola só deve ser exibido quando uma chave real estiver configurada.</div>
              </div>

              <div className="w-full">
                <p className="text-xs text-stone-600 mb-2">
                  Copie o código PIX Copia e Cola gerado com a chave configurada:
                </p>
                <button
                  type="button"
                  id="copy-pix-btn"
                  onClick={handleCopyPix}
                  disabled={!pix.chave}
                  className="w-full py-2.5 px-4 disabled:opacity-50 bg-white border border-teal-300 hover:bg-teal-50 text-teal-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Código PIX Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Chave / Código PIX</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {(method === 'debito' || method === 'credito') && (
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 bg-stone-200 text-stone-700 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-800">
                  {method === 'debito' ? 'Maquininha: Cartão de Débito' : 'Maquininha: Cartão de Crédito'}
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Passe o cartão na maquininha física do estabelecimento. Após confirmar o recebimento, registre manualmente a venda abaixo.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pronto para transação</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            id="payment-cancel-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Voltar
          </button>
          
          <button
            type="button"
            id="payment-confirm-and-print-btn"
            disabled={isInsufficient || finished}
            onClick={() => handleFinalize(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Pagar & Imprimir Cupom</span>
          </button>

          <button
            type="button"
            id="payment-confirm-only-btn"
            disabled={isInsufficient || finished}
            onClick={() => handleFinalize(false)}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar Pagamento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
