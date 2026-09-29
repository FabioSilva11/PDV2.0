import React, { useMemo } from 'react';
import { X, UtensilsCrossed } from 'lucide-react';
import type { CartItem, Order, PrintJob } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';

interface KitchenTicketPreviewModalProps {
  order: Order | null;
  onClose: () => void;
}

/** Prévia fiel do último lote enviado à cozinha. Não aciona impressão física. */
export const KitchenTicketPreviewModal: React.FC<KitchenTicketPreviewModalProps> = ({ order, onClose }) => {
  const { printQueue, settings, currentUser } = useRestaurant();
  const job = useMemo<PrintJob | undefined>(() => {
    if (!order) return undefined;
    return printQueue.filter(item => item.pedidoId === order.id && item.tipo === 'pedido').at(-1);
  }, [order, printQueue]);
  const items = useMemo<CartItem[]>(() => {
    if (!order) return [];
    const batch = (order.impressoes || []).find(item => item.grupoId === job?.grupoImpressaoId);
    if (batch?.itemsSnapshot?.length) return batch.itemsSnapshot.filter(item => item.status !== 'voided');
    if (batch?.itemIds?.length) return order.itens.filter(item => batch.itemIds!.includes(item.cartItemId) && item.status !== 'voided');
    return order.itens.filter(item => item.status !== 'voided');
  }, [job?.grupoImpressaoId, order]);

  if (!order) return null;
  const headerName = (settings.nomeFantasia || settings.nomeCurto || 'ESTABELECIMENTO').toUpperCase();
  const isAdditional = job?.conteudoTexto.includes('*** ADICIONADO AO PEDIDO ***');

  return (
    <div
      className="fixed inset-0 z-[90] bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kitchen-ticket-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header — igual ao espelho */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-orange-400" />
            <span id="kitchen-ticket-title" className="font-bold text-sm">Via da Cozinha (80mm)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar prévia da cozinha"
            className="p-1 rounded-lg text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-stone-200/50 flex justify-center">
          <div id="kitchen-ticket-preview" className="w-[300px] bg-white p-5 rounded shadow-sm border border-stone-300 font-mono text-[11px] leading-tight text-stone-900 select-text">
            <div className="text-center pb-2.5 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="font-bold text-sm tracking-wider uppercase">{headerName}</div>
              <div className="font-bold text-[10px] uppercase">{isAdditional ? 'Adicionado ao pedido' : 'Via do pedido'}</div>
            </div>
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="flex justify-between font-bold text-xs">
                <span>PEDIDO #{order.codigoExibicao || order.codigoMesa || order.numero}</span>
                <span>{order.tipo.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[10px]">
                <span>{new Date(order.criadoEm).toLocaleDateString('pt-BR')}</span>
                <span>{new Date(order.criadoEm).toLocaleTimeString('pt-BR')}</span>
              </div>
              {order.mesaNumero && <div className="font-bold">MESA: {order.mesaNumero}</div>}
              {!order.mesaNumero && <div>CANAL: {order.canal.toUpperCase()}</div>}
              {order.garcomNome && <div className="text-stone-600">GARÇOM: {order.garcomNome}</div>}
              {order.prioridade === 'urgente' && <div className="font-bold text-rose-700">*** URGENTE ***</div>}
            </div>
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1.5">
              <div className="font-bold text-[10px] uppercase text-stone-500 pb-0.5">ITENS PARA PREPARO</div>
              {items.map((item, index) => (
                <div key={`${item.cartItemId}-${index}`} className="space-y-0.5">
                  <div className="font-semibold">{item.quantidade}x {item.nome}{item.variacaoNome ? ` (${item.variacaoNome})` : ''}</div>
                  {item.adicionais?.map((addon, addonIndex) => <div key={addonIndex} className="pl-2 text-[10px] text-stone-700">+ {addon.nome}</div>)}
                  {item.remocoes?.map((removal, removalIndex) => <div key={removalIndex} className="pl-2 text-[10px] text-rose-700 italic">SEM: {removal}</div>)}
                  {item.observacao && <div className="pl-2 text-[10px] text-stone-600 italic">OBS: {item.observacao}</div>}
                </div>
              ))}
              {order.observacoesGerais && <div className="pt-1 text-[10px] text-stone-700 italic">OBS GERAL: {order.observacoesGerais}</div>}
            </div>
            <div className="pt-2 text-center text-[10px] text-stone-600 space-y-0.5">
              <div className="font-bold uppercase">Produção da Cozinha</div>
              <div>Operador: {currentUser?.nome}</div>
              <div>{settings.nomeAplicacao} v{settings.versaoExibida}</div>
            </div>
          </div>
        </div>

        {/* Rodapé — igual ao espelho */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 text-xs text-stone-500 text-center">
          Prévia somente. Nenhuma impressão física foi enviada.
        </div>
      </div>
    </div>
  );
};
