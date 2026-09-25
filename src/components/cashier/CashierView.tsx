import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency, formatFullDate, formatDateTime } from '../../utils/formatters';
import { cashPayments } from '../../utils/reports';
import { 
  CircleDollarSign, 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  Plus, 
  Minus, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  QrCode,
  Banknote,
  Printer
} from 'lucide-react';

export const CashierView: React.FC = () => {
  const { 
    cashRegister, 
    openCashRegister, 
    closeCashRegister, 
    addCashMovement,
    orders 
  } = useRestaurant();

  const addCashTransaction = (tipo: 'suprimento' | 'sangria', valor: number, motivo: string) => {
    addCashMovement(tipo, valor, motivo);
  };

  const [openAmount, setOpenAmount] = useState<string>('150.00');
  const [modalType, setModalType] = useState<'suprimento' | 'sangria' | 'fechar' | null>(null);
  const [txAmount, setTxAmount] = useState<string>('');
  const [txReason, setTxReason] = useState<string>('');
  const [closedSummary, setClosedSummary] = useState<boolean>(false);

  const transacoes = cashRegister?.transacoes || [];

  // Calculate totals by payment method for this shift
  const totalPix = cashPayments(cashRegister, ['pix']);
  const totalCard = cashPayments(cashRegister, ['debito', 'credito']);
  const totalCashSales = cashPayments(cashRegister, ['dinheiro']);
  const totalSalesAll = totalPix + totalCard + totalCashSales;

  const totalSangrias = transacoes
    .filter(t => t.tipo === 'sangria')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalSuprimentos = transacoes
    .filter(t => t.tipo === 'suprimento')
    .reduce((acc, t) => acc + t.valor, 0);

  const handleOpenCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openAmount) || 0;
    openCashRegister(val);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType || modalType === 'fechar') return;
    const val = parseFloat(txAmount) || 0;
    if (val <= 0 || !txReason.trim()) return;

    addCashTransaction(modalType, val, txReason.trim());
    setModalType(null);
    setTxAmount('');
    setTxReason('');
  };

  const handleCloseRegisterSubmit = () => {
    closeCashRegister();
    setModalType(null);
    setClosedSummary(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-blue-600" />
            <span>Fluxo & Controle de Caixa</span>
          </h2>
          <p className="text-xs text-stone-500">
            Acompanhe o saldo em gaveta, entradas, sangrias e conciliação por forma de pagamento
          </p>
        </div>

        {/* Register state pill & Actions */}
        <div className="flex items-center gap-2">
          {cashRegister.aberto ? (
            <>
              <button
                type="button"
                id="cashier-suprimento-btn"
                onClick={() => { setModalType('suprimento'); setTxAmount(''); setTxReason(''); }}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Suprimento (Entrada)</span>
              </button>

              <button
                type="button"
                id="cashier-sangria-btn"
                onClick={() => { setModalType('sangria'); setTxAmount(''); setTxReason(''); }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Sangria (Retirada)</span>
              </button>

              <button
                type="button"
                id="cashier-close-shift-btn"
                onClick={() => setModalType('fechar')}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>Caixa Fechado</span>
            </div>
          )}
        </div>
      </div>

      {/* If Cashier is Closed: Open Register Card */}
      {!cashRegister.aberto && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mx-auto">
            <Unlock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif text-stone-900">
              Abertura de Caixa
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Informe o valor de troco inicial disponível na gaveta para iniciar as operações do dia.
            </p>
          </div>

          <form onSubmit={handleOpenCash} className="space-y-4 pt-2">
            <div className="max-w-xs mx-auto">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fundo de Troco Inicial (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-500">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  id="open-cash-amount-input"
                  value={openAmount}
                  onChange={(e) => setOpenAmount(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 font-mono text-lg font-bold text-stone-900 bg-stone-50 text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              id="confirm-open-cash-btn"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Abrir Caixa</span>
            </button>
          </form>
        </div>
      )}

      {/* If Cashier is Open: Key Metrics Cards */}
      {cashRegister.aberto && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Gaveta */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Gaveta (Dinheiro Físico)
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-emerald-700">
                {formatCurrency(cashRegister.saldoAtualGaveta)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Fundo inicial:</span>
                <span className="font-mono">{formatCurrency(cashRegister.saldoInicial)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Vendas PIX */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Recebido em PIX
              </span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-teal-700">
                {formatCurrency(totalPix)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Depósito direto em conta bancária
              </p>
            </div>
          </div>

          {/* Card 3: Cartões */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Cartões (Déb./Créd.)
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-blue-700">
                {formatCurrency(totalCard)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Operações registradas no POS
              </p>
            </div>
          </div>

          {/* Card 4: Faturamento Total */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Faturamento do Turno
              </span>
              <div className="p-2 bg-sky-50 text-blue-600 rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-blue-800">
                {formatCurrency(totalSalesAll)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Soma de todas as vendas do caixa
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Ledger */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm font-serif text-stone-900">
              Histórico de Movimentações do Caixa
            </h3>
            <p className="text-xs text-stone-500">
              Registro cronológico de vendas, suprimentos e sangrias
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {transacoes.length} lançamentos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-bold uppercase border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Horário</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Motivo / Descrição</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {transacoes.map((tx) => {
                const isPositive = tx.tipo === 'venda' || tx.tipo === 'suprimento' || tx.tipo === 'abertura';
                return (
                  <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-500">
                      {formatDateTime(tx.horario)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tx.tipo === 'venda' ? 'bg-emerald-100 text-emerald-800' :
                        tx.tipo === 'abertura' ? 'bg-sky-100 text-sky-800' :
                        tx.tipo === 'suprimento' ? 'bg-teal-100 text-teal-800' :
                        tx.tipo === 'sangria' ? 'bg-rose-100 text-rose-800' :
                        'bg-stone-200 text-stone-800'
                      }`}>
                        {tx.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900">
                      {tx.motivo}
                    </td>
                    <td className="py-3 px-4 text-stone-600 capitalize">
                      {tx.formaPagamento || '-'}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                      tx.tipo === 'sangria' ? 'text-rose-600' : 'text-stone-900'
                    }`}>
                      {tx.tipo === 'sangria' ? `- ${formatCurrency(tx.valor)}` : formatCurrency(tx.valor)}
                    </td>
                  </tr>
                );
              })}

              {transacoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    Nenhuma movimentação registrada no caixa ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Suprimento / Sangria */}
      {(modalType === 'suprimento' || modalType === 'sangria') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-serif">
                {modalType === 'suprimento' ? 'Suprimento de Caixa (Entrada)' : 'Sangria de Caixa (Retirada)'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-stone-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Valor (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    id="tx-amount-input"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0,00"
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 font-mono text-base font-bold text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Motivo / Justificativa
                </label>
                <input
                  type="text"
                  id="tx-reason-input"
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  placeholder={modalType === 'suprimento' ? 'Ex: Troco adicional de moedas' : 'Ex: Pagamento fornecedor de bebidas'}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="tx-confirm-btn"
                  className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm ${
                    modalType === 'suprimento' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar {modalType === 'suprimento' ? 'Entrada' : 'Retirada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Fechamento de Caixa */}
      {modalType === 'fechar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-serif">
                Conferência & Fechamento de Caixa
              </h3>
              <button onClick={() => setModalType(null)} className="text-stone-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">
                Confira os valores antes de encerrar o turno. As movimentações serão consolidadas.
              </div>

              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Fundo de Troco Inicial:</span>
                  <span className="font-mono font-semibold">{formatCurrency(cashRegister.saldoInicial)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Vendas em Dinheiro:</span>
                  <span className="font-mono font-semibold">{formatCurrency(totalCashSales)}</span>
                </div>
                <div className="flex justify-between text-teal-700">
                  <span>Vendas em PIX:</span>
                  <span className="font-mono font-semibold">{formatCurrency(totalPix)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Vendas em Cartão:</span>
                  <span className="font-mono font-semibold">{formatCurrency(totalCard)}</span>
                </div>
                {totalSuprimentos > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Suprimentos (Entradas extras):</span>
                    <span className="font-mono font-semibold">+ {formatCurrency(totalSuprimentos)}</span>
                  </div>
                )}
                {totalSangrias > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Sangrias (Retiradas):</span>
                    <span className="font-mono font-semibold">- {formatCurrency(totalSangrias)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-300 flex justify-between font-bold text-sm text-stone-900">
                  <span>Saldo em Gaveta Esperado:</span>
                  <span className="font-mono text-emerald-700 font-black text-base">
                    {formatCurrency(cashRegister.saldoAtualGaveta)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="confirm-close-cashier-final-btn"
                  onClick={handleCloseRegisterSubmit}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Confirmar e Encerrar Caixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
