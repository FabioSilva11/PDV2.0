import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Printer, X, Download } from 'lucide-react';

export const ThermalReceiptModal: React.FC = () => {
  const { selectedReceiptOrder, setSelectedReceiptOrder, currentUser } = useRestaurant();

  if (!selectedReceiptOrder) return null;

  const order = selectedReceiptOrder;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header toolbar */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm">Comprovante Térmico (80mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="thermal-print-trigger-btn"
              onClick={handlePrint}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              id="thermal-close-btn"
              onClick={() => setSelectedReceiptOrder(null)}
              className="p-1 rounded-lg text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper receipt preview */}
        <div className="p-6 overflow-y-auto bg-stone-200/50 flex justify-center">
          <div id="thermal-receipt" className="w-[300px] bg-white p-5 rounded shadow-sm border border-stone-300 font-mono text-[11px] leading-tight text-stone-900 select-text">
            {/* Store header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="font-bold text-sm tracking-wider">MURUPI RESTAURANTE</div>
              <div>PDV & LANCHES ARTESANAIS</div>
              <div>CNPJ: 45.892.110/0001-44</div>
              <div>Av. das Nações, 1420 - Centro</div>
              <div>Tel / Whats: (11) 98765-4321</div>
            </div>

            {/* Order info */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>PEDIDO #{order.numero}</span>
                <span>{order.tipo.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[10px]">
                <span>Data: {new Date(order.criadoEm).toLocaleDateString('pt-BR')}</span>
                <span>Hora: {new Date(order.criadoEm).toLocaleTimeString('pt-BR')}</span>
              </div>
              {order.mesaNumero && (
                <div className="font-bold">MESA: {order.mesaNumero}</div>
              )}
              {order.nomeCliente && (
                <div>CLIENTE: {order.nomeCliente}</div>
              )}
              {order.garcomNome && (
                <div className="text-stone-600">ATENDENTE: {order.garcomNome}</div>
              )}
              {order.tipo === 'delivery' && order.enderecoEntrega && (
                <div className="pt-1 text-[10px] text-stone-700">
                  <div className="font-bold">ENDEREÇO DE ENTREGA:</div>
                  <div>{order.enderecoEntrega.logradouro}, {order.enderecoEntrega.numero}</div>
                  <div>{order.enderecoEntrega.bairro} {order.enderecoEntrega.complemento || ''}</div>
                  {order.enderecoEntrega.pontoReferencia && (
                    <div>Ref: {order.enderecoEntrega.pontoReferencia}</div>
                  )}
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1.5">
              <div className="flex justify-between font-bold pb-1 border-b border-stone-200">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {order.itens.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>{it.quantidade}x {it.nome} {it.variacaoNome ? `(${it.variacaoNome})` : ''}</span>
                    <span>{formatCurrency(it.precoUnitario * it.quantidade)}</span>
                  </div>
                  {it.adicionais && it.adicionais.length > 0 && (
                    <div className="pl-2 text-[10px] text-stone-600">
                      {it.adicionais.map((ad, i) => (
                        <div key={i}>+ {ad.nome} ({formatCurrency(ad.preco)})</div>
                      ))}
                    </div>
                  )}
                  {it.remocoes && it.remocoes.length > 0 && (
                    <div className="pl-2 text-[10px] text-rose-700 italic">
                      Sem: {it.remocoes?.join(', ')}
                    </div>
                  )}
                  {it.observacao && (
                    <div className="pl-2 text-[10px] text-stone-500 italic">
                      Obs: {it.observacao}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.desconto > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>DESCONTO {order.descontoMotivo ? `(${order.descontoMotivo})` : ''}:</span>
                  <span>-{formatCurrency(order.desconto)}</span>
                </div>
              )}
              {order.taxaServico > 0 && (
                <div className="flex justify-between">
                  <span>TAXA DE SERVIÇO:</span>
                  <span>{formatCurrency(order.taxaServico)}</span>
                </div>
              )}
              {order.taxaEntrega > 0 && (
                <div className="flex justify-between">
                  <span>TAXA DE ENTREGA:</span>
                  <span>{formatCurrency(order.taxaEntrega)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300">
                <span>TOTAL:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Manual Payments recorded */}
            <div className="py-2 border-b border-dashed border-stone-400 space-y-1">
              <div className="font-bold text-[10px] uppercase text-stone-600">
                PAGAMENTOS INFORMADOS (MANUAL):
              </div>
              {(!order.pagamentos || order.pagamentos.length === 0) ? (
                <div className="text-stone-500 italic">Nenhum pagamento registrado (Pendente)</div>
              ) : (
                (order.pagamentos || []).filter(p => !p.estornado).map((p, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span>• {p.formaNome} ({p.registradoPor})</span>
                    <span className="font-bold">{formatCurrency(p.valor)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold pt-1">
                <span>SALDO RESTANTE:</span>
                <span>{formatCurrency(order.saldoRestante)}</span>
              </div>
            </div>

            {/* Footer message */}
            <div className="pt-3 text-center text-[10px] text-stone-600 space-y-1">
              <div className="font-bold">OBRIGADO PELA PREFERÊNCIA!</div>
              <div>Documento emitido para conferência interna.</div>
              <div>Sistema Murupi SaaS Pro v3.4</div>
              <div>Operador: {currentUser.nome}</div>
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end gap-2">
          <button
            id="close-thermal-receipt-modal-btn"
            onClick={() => setSelectedReceiptOrder(null)}
            className="px-4 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-lg text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
