import React from 'react';
import { Order } from '../../types';
import { formatCurrency, formatFullDate } from '../../utils/formatters';

import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Controls Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-bold">Comprovante de Venda #{order.numero}</span>
          </div>
          <button
            id="receipt-modal-close-btn"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-6 overflow-y-auto bg-stone-100 flex justify-center">
          {/* Thermal Receipt Paper 80mm */}
          <div 
            id="thermal-receipt" 
            className="w-full max-w-[340px] bg-white p-5 shadow-sm rounded-lg text-stone-900 font-mono text-xs leading-tight border border-stone-200"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400 space-y-1">
              <h3 className="font-extrabold text-base tracking-wider uppercase font-serif">
                MURUPI RESTAURANTE
              </h3>
              <p className="text-[10px] text-stone-600">
                COMIDAS REGIONAIS & LANCHES
              </p>
              <p className="text-[10px] text-stone-600">
                CNPJ: 14.882.901/0001-44 - IE: ISENTO
              </p>
              <p className="text-[10px] text-stone-600">
                Porto Velho - RO | Fone: (69) 99321-0000
              </p>
              <div className="text-[9px] text-stone-500 uppercase tracking-widest pt-1">
                *** CUPOM NÃO FISCAL ***
              </div>
            </div>

            {/* Order Info */}
            <div className="py-2.5 border-b border-dashed border-stone-400 text-[11px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>PEDIDO Nº: #{order.numero}</span>
                <span className="uppercase">{order.tipo}</span>
              </div>
              <div className="text-[10px] text-stone-600">
                Data: {formatFullDate(order.criadoEm)}
              </div>
              {order.mesaNumero && (
                <div className="font-bold text-blue-900">
                  MESA: {order.mesaNumero}
                </div>
              )}
              {order.nomeCliente && (
                <div>
                  Cliente: <span className="font-semibold">{order.nomeCliente}</span>
                </div>
              )}
              {order.telefoneCliente && (
                <div>
                  Telefone: <span>{order.telefoneCliente}</span>
                </div>
              )}
              {order.enderecoEntrega && (
                <div className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 mt-1">
                  Endereço: {order.enderecoEntrega.logradouro}, {order.enderecoEntrega.numero} - {order.enderecoEntrega.bairro}
                  {order.enderecoEntrega.complemento ? ` • ${order.enderecoEntrega.complemento}` : ''}
                </div>
              )}
            </div>

            {/* Items Header */}
            <div className="py-1.5 border-b border-slate-300 font-bold text-[10px] flex justify-between uppercase">
              <span className="w-8">Qtd</span>
              <span className="flex-1">Item</span>
              <span className="w-16 text-right">Total</span>
            </div>

            {/* Items list */}
            <div className="py-2 space-y-2 border-b border-dashed border-slate-400">
              {order.itens.map((item, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="flex justify-between">
                    <span className="w-8 font-bold">{item.quantidade}x</span>
                    <span className="flex-1 font-semibold">{item.nome}{item.variacaoNome ? ` (${item.variacaoNome})` : ''}</span>
                    <span className="w-16 text-right font-mono">
                      {formatCurrency(item.precoUnitario * item.quantidade)}
                    </span>
                  </div>
                  {/* Accompaniments */}
                  {item.acompanhamentosEscolhidos && item.acompanhamentosEscolhidos.length > 0 && (
                    <div className="text-[9px] text-slate-600 pl-8 pr-1 mt-0.5">
                      G: {item.acompanhamentosEscolhidos?.join(', ')}
                    </div>
                  )}
                  {item.remocoes && item.remocoes.length > 0 && (
                    <div className="text-[9px] text-rose-700 italic pl-8 pr-1 mt-0.5">
                      Sem: {item.remocoes.join(', ')}
                    </div>
                  )}
                  {/* Observation */}
                  {item.observacao && (
                    <div className="text-[9px] text-sky-800 italic pl-8 pr-1 mt-0.5">
                      Obs: {item.observacao}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 border-b border-dashed border-stone-400 text-[11px] space-y-1">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.desconto > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(order.desconto)}</span>
                </div>
              )}
              {order.taxaEntrega > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Taxa de Entrega:</span>
                  <span>+ {formatCurrency(order.taxaEntrega)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Payment Details — lê o array real de pagamentos */}
            {order.pagamentos && order.pagamentos.filter(p => !p.estornado).length > 0 && (
              <div className="py-2 border-b border-dashed border-stone-400 text-[10px] space-y-1">
                <div className="font-bold text-stone-700 uppercase pb-0.5">Pagamentos:</div>
                {order.pagamentos.filter(p => !p.estornado).map((p, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>• {p.formaNome}:</span>
                      <span className="font-bold">{formatCurrency(p.valor)}</span>
                    </div>
                    {p.formaId === 'dinheiro' && p.valorRecebido != null && (
                      <>
                        <div className="flex justify-between text-stone-600 pl-2">
                          <span>Recebido:</span>
                          <span>{formatCurrency(p.valorRecebido)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-stone-800 pl-2">
                          <span>Troco:</span>
                          <span>{formatCurrency(p.troco ?? 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}


            {/* Footer Message */}
            <div className="pt-4 text-center space-y-1">
              <p className="font-bold text-[11px] text-stone-800">
                O Restaurante Murupi agradece a preferência.
              </p>
              <p className="text-[9px] text-stone-500">
                Volte Sempre! www.murupirestaurante.com.br
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            id="receipt-close-btn"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            id="receipt-print-action-btn"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cupom Não-Fiscal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
