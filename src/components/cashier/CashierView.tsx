import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { cashPayments } from '../../utils/reports';
import {
  CircleDollarSign,
  Wallet,
  Lock,
  Unlock,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  QrCode,
  Banknote,
  ClipboardCheck,
  ArrowRight,
  Receipt
} from 'lucide-react';
import type { PendenciaFechamento } from '../../types';

/**
 * FLUXO & CONTROLE DE CAIXA — referência do TURNO operacional.
 *
 * Fluxo do fechamento (regra 15/40): VALIDAR → CONFIRMAR → FECHAR.
 *  1. "Fechar Caixa" abre a CONFERÊNCIA (somente leitura);
 *  2. pendências/inconsistências são listadas com ações para localizá-las
 *     ("Ver Central de Pedidos" / "Ver Contas") e o fechamento é BLOQUEADO;
 *  3. tudo conferido => "Conferência concluída" libera o fechamento efetivo.
 *
 * Entrada Manual e Saída Manual foram REMOVIDOS do fluxo operacional.
 * Registros antigos desses tipos seguem visíveis no histórico (auditoria).
 */
export const CashierView: React.FC = () => {
  const {
    cashRegister,
    openCashRegister,
    closeCashRegister,
    orders,
    validarPendenciasFechamento,
    conferenciaFechamento,
    turnoAtualId,
    setActiveModule
  } = useRestaurant();

  const [openAmount, setOpenAmount] = useState<string>('0.00');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedSummary, setClosedSummary] = useState<boolean>(false);

  const transacoes = cashRegister?.transacoes || [];
  const conferencia = useMemo(() => conferenciaFechamento(), [conferenciaFechamento]);
  const pendencias: PendenciaFechamento[] = validarPendenciasFechamento();

  const totalPix = cashPayments(cashRegister, ['pix']);
  const totalCard = cashPayments(cashRegister, ['debito', 'credito']);
  const totalCashSales = cashPayments(cashRegister, ['dinheiro']);
  const totalSalesAll = totalPix + totalCard + totalCashSales;

  // Legado — apenas para exibição no resumo (nunca criáveis)
  const totalSaidasManuais = transacoes
    .filter(t => t.tipo === 'saida_manual')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalEntradasManuais = transacoes
    .filter(t => t.tipo === 'entrada_manual')
    .reduce((acc, t) => acc + t.valor, 0);

  const handleOpenCash = (e: React.FormEvent) => {
    e.preventDefault();
    openCashRegister(parseFloat(openAmount) || 0);
  };

  const handleCloseRegisterSubmit = () => {
    closeCashRegister();
    setShowCloseModal(false);
    setClosedSummary(true);
  };

  const tipoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      abertura: 'Abertura',
      fechamento: 'Fechamento',
      venda: 'Venda',
      venda_manual: 'Venda manual',
      entrada_manual: 'Entrada manual',
      saida_manual: 'Saída manual',
      suprimento: 'Suprimento',
      sangria: 'Sangria',
    };
    return map[tipo] ?? tipo;
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
            O caixa controla o turno operacional — abertura inicia o turno, fechamento encerra após conferência
            {turnoAtualId ? ` • Turno ${turnoAtualId}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cashRegister.aberto ? (
            <button
              type="button"
              id="cashier-close-shift-btn"
              onClick={() => setShowCloseModal(true)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Fechar Caixa</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>Caixa Fechado</span>
            </div>
          )}
        </div>
      </div>

      {/* Abertura de caixa */}
      {!cashRegister.aberto && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mx-auto">
            <Unlock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif text-stone-900">Abertura de Caixa</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Confirmar a abertura INICIA UM NOVO TURNO operacional, isolado do anterior. O histórico é preservado.
            </p>
          </div>
          <form onSubmit={handleOpenCash} className="space-y-4 pt-2">
            <div className="max-w-xs mx-auto">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Fundo de Troco Inicial (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  id="open-cash-amount-input"
                  value={openAmount}
                  onChange={e => setOpenAmount(e.target.value)}
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

      {/* Métricas do turno */}
      {cashRegister.aberto && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Gaveta (Dinheiro Físico)</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Banknote className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-emerald-700">{formatCurrency(cashRegister.saldoAtualGaveta)}</div>
              <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Fundo inicial:</span>
                <span className="font-mono">{formatCurrency(cashRegister.saldoInicial)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Recebido em PIX</span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><QrCode className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-teal-700">{formatCurrency(totalPix)}</div>
              <p className="text-[11px] text-stone-500 mt-1">Depósito direto em conta bancária</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Cartões (Déb./Créd.)</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><CreditCard className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-blue-700">{formatCurrency(totalCard)}</div>
              <p className="text-[11px] text-stone-500 mt-1">Operações registradas no POS</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Faturamento do Turno</span>
              <div className="p-2 bg-sky-50 text-blue-600 rounded-xl"><Wallet className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-blue-800">{formatCurrency(totalSalesAll)}</div>
              <p className="text-[11px] text-stone-500 mt-1">Soma de todas as vendas do caixa</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de pendências */}
      {cashRegister.aberto && pendencias.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-amber-900">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Existem pedidos/contas pendentes neste turno ({pendencias.length}).</p>
              <p>As pendências precisam ser resolvidas antes da conferência de fechamento.</p>
            </div>
          </div>
          <button
            type="button"
            id="cashier-ver-pendencias-central-btn"
            onClick={() => setActiveModule('pedidos')}
            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
          >
            Ver Central de Pedidos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Histórico de movimentações */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm font-serif text-stone-900">Histórico de Movimentações do Caixa</h3>
            <p className="text-xs text-stone-500">Registro cronológico das movimentações e recebimentos do caixa.</p>
          </div>
          <span className="text-xs font-mono font-semibold text-stone-500">{transacoes.length} lançamentos</span>
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
              {transacoes.map(tx => {
                const isLegacy = tx.tipo === 'suprimento' || tx.tipo === 'sangria' ||
                  tx.tipo === 'entrada_manual' || tx.tipo === 'saida_manual';
                const isNegative = tx.tipo === 'sangria' || tx.tipo === 'saida_manual';
                return (
                  <tr key={tx.id} className={`hover:bg-stone-50/60 transition-colors ${isLegacy ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-mono text-stone-500">{formatDateTime(tx.horario)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tx.tipo === 'venda' || tx.tipo === 'venda_manual' ? 'bg-emerald-100 text-emerald-800' :
                        tx.tipo === 'abertura' ? 'bg-sky-100 text-sky-800' :
                        tx.tipo === 'fechamento' ? 'bg-stone-300 text-stone-800' :
                        isNegative ? 'bg-rose-100 text-rose-800' :
                        'bg-stone-200 text-stone-700'
                      }`}>
                        {tipoLabel(tx.tipo)}{isLegacy ? ' (legado)' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900">{tx.motivo}</td>
                    <td className="py-3 px-4 text-stone-600 capitalize">{tx.formaPagamento || '-'}</td>
                    <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${isNegative ? 'text-rose-600' : 'text-stone-900'}`}>
                      {isNegative ? `- ${formatCurrency(tx.valor)}` : formatCurrency(tx.valor)}
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

      {/* Modal de CONFERÊNCIA & Fechamento */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-sky-400" />
                Conferência & Fechamento de Caixa
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Inconsistências financeiras */}
              {conferencia.temInconsistencia && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Existem inconsistências financeiras — o fechamento está BLOQUEADO.
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    {conferencia.inconsistencias.map((p, i) => <li key={i}>{p.descricao}</li>)}
                  </ul>
                  <p className="text-[11px]">Corrija ou estorne pelos fluxos corretos antes de fechar o caixa.</p>
                </div>
              )}

              {/* Pendências */}
              {!conferencia.temInconsistencia && !conferencia.limpo && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    FECHAMENTO NÃO CONFERIDO — existem pedidos/contas pendentes.
                  </p>
                  <p className="font-semibold">
                    {conferencia.pedidosPendentes.length} lançamento(s) pendente(s) • {conferencia.contasPendentes.length} conta(s) aberta(s) • Total pendente: {formatCurrency(conferencia.totalPendente)}
                  </p>
                  <ul className="space-y-1 font-mono text-[11px]">
                    {conferencia.itens.filter(p => p.tipo !== 'inconsistencia_financeira').map((p, i) => <li key={i}>{p.descricao}</li>)}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      id="conferencia-ver-central-btn"
                      onClick={() => { setShowCloseModal(false); setActiveModule('pedidos'); }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" /> Ver Central de Pedidos
                    </button>
                    <button
                      type="button"
                      id="conferencia-ver-contas-btn"
                      onClick={() => { setShowCloseModal(false); setActiveModule('contas'); }}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ver Contas
                    </button>
                  </div>
                </div>
              )}

              {/* Tudo conferido */}
              {conferencia.limpo && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Conferência concluída. Nenhum pedido ou conta pendente.
                  </p>
                </div>
              )}

              {/* Resumo financeiro */}
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
                {/* Legado: exibe apenas se houver registros históricos */}
                {totalEntradasManuais > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>Entradas manuais (histórico):</span>
                    <span className="font-mono font-semibold">+ {formatCurrency(totalEntradasManuais)}</span>
                  </div>
                )}
                {totalSaidasManuais > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>Saídas manuais (histórico):</span>
                    <span className="font-mono font-semibold">- {formatCurrency(totalSaidasManuais)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-300 flex justify-between font-bold text-sm text-stone-900">
                  <span>Saldo em Gaveta Esperado:</span>
                  <span className="font-mono text-emerald-700 font-black text-base">{formatCurrency(cashRegister.saldoAtualGaveta)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="confirm-close-cashier-final-btn"
                  onClick={handleCloseRegisterSubmit}
                  disabled={!conferencia.limpo}
                  title={conferencia.limpo ? 'Fechar o caixa' : 'Resolva as pendências antes de fechar'}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md"
                >
                  {conferencia.limpo ? 'Confirmar e Encerrar Caixa' : 'Fechamento Bloqueado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumo pós-fechamento */}
      {closedSummary && !cashRegister.aberto && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
          <span className="font-bold">Caixa encerrado após conferência. Histórico e auditoria preservados.</span>
          <button type="button" onClick={() => setClosedSummary(false)} className="underline">OK</button>
        </div>
      )}
    </div>
  );
};
