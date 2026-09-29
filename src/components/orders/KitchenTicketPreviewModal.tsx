import React, { useMemo } from 'react';
import { X, UtensilsCrossed } from 'lucide-react';
import type { Order } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';

interface KitchenTicketPreviewModalProps {
  order: Order | null;
  onClose: () => void;
}

/** Prévia fiel do último lote enviado à cozinha. Não aciona impressão física. */
export const KitchenTicketPreviewModal: React.FC<KitchenTicketPreviewModalProps> = ({ order, onClose }) => {
  const { printQueue } = useRestaurant();
  const content = useMemo(() => {
    if (!order) return '';
    const jobs = printQueue.filter(job => job.pedidoId === order.id && job.tipo === 'pedido');
    return jobs[jobs.length - 1]?.conteudoTexto || 'Nenhuma via de cozinha foi preparada para este pedido.';
  }, [order, printQueue]);

  if (!order) return null;

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
            <span id="kitchen-ticket-title" className="font-bold text-sm">Via da Cozinha</span>
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

        {/* Prévia — mesma estrutura do ticket 80mm do espelho */}
        <div className="p-6 overflow-y-auto bg-stone-200/50 flex justify-center">
          <div
            id="kitchen-ticket-preview"
            className="w-[300px] bg-white p-5 rounded shadow-sm border border-stone-300 font-mono text-[11px] leading-tight text-stone-900 select-text whitespace-pre-wrap"
          >
            {content}
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
