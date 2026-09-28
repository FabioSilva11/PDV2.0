import React, { useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { Printer, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Order, PrintJob } from '../../types';

/**
 * DIÁLOGO DE ESPELHO — prévia rica antes de confirmar a produção.
 *
 * Exibe tudo: pedido, conta, lançamento, mesa, cliente, garçom,
 * itens (adicionais / remoções / obs), totais, pagamentos e saldo.
 *
 * Fluxo:
 *  1. Clicar "Espelho" → generateOrderMirror() → abre este modal.
 *  2. Operador confere → clica "Imprimir" → window.print().
 *  3. Confirmar → confirmOrderMirror() → pedido vira 'pronto'.
 *  4. Cancelar → fecha sem alterar nenhum estado.
 */
export const OrderMirrorModal: React.FC = () => {
  const {
    orders,
    selectedMirrorOrderId,
    setSelectedMirrorOrderId,
    confirmOrderMirror,
    printQueue,
    settings,
    currentUser,
  } = useRestaurant();

  const order: Order | undefined = useMemo(
    () => orders.find(o => o.id === selectedMirrorOrderId),
    [orders, selectedMirrorOrderId],
  );

  if (!order) return null;

  const batches = order.impressoes || [];
  const pendingBatch = [...batches]
    .reverse()
    .find(b => (b.espelhoJobId || (b.espelhoJobIds || []).length > 0) && !b.mirrorConfirmed);

  const displayItems = pendingBatch
    ? (pendingBatch.itemsSnapshot?.length
        ? pendingBatch.itemsSnapshot.filter(i => i.status !== 'voided')
        : (pendingBatch.itemIds?.length
            ? order.itens.filter(i => pendingBatch.itemIds!.includes(i.cartItemId) && i.status !== 'voided')
            : order.itens.filter(i => i.status !== 'voided')))
    : order.itens.filter(i => i.status !== 'voided');

  const espelhoJobs: PrintJob[] = pendingBatch
    ? (pendingBatch.espelhoJobIds || [pendingBatch.espelhoJobId])
        .filter(Boolean)
        .map(id => printQueue.find(j => j.id === id))
        .filter(Boolean) as PrintJob[]
    : [];

  const hasFailedJob = espelhoJobs.some(j => j.status === 'falha');
  const hasPendingJob = espelhoJobs.some(j => j.status === 'pendente');
  const allSuccess  = espelhoJobs.length > 0 && espelhoJobs.every(j => j.status === 'sucesso');
  const canConfirm  = !hasFailedJob && pendingBatch !== undefined;

  const pagamentosAtivos = (order.pagamentos || []).filter(p => !p.estornado);

  const handlePrint   = () => window.print();
  const handleConfirm = () => {
    try { confirmOrderMirror(order.id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao confirmar espelho.'); }
  };
  const handleCancel  = () => setSelectedMirrorOrderId(null);

  const headerName = (settings.nomeFantasia || settings.nomeCurto || 'ESTABELECIMENTO').toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mirror-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span id="mirror-modal-title" className="font-bold text-sm">Espelho do Pedido (80mm)</span>
          </div>
          <button id="mirror-close-header-btn" aria-label="Fechar" onClick={handleCancel}
            className="p-1 rounded-lg text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banners de status */}
        {hasFailedJob && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            Falha no roteamento. Corrija as impressoras antes de confirmar.
          </div>
        )}
        {hasPendingJob && !hasFailedJob && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-semibold">
            <Printer className="w-4 h-4 shrink-0 text-amber-600 animate-pulse" />
            Enviando para a impressora… Confirme quando o espelho sair impresso.
          </div>
        )}
        {allSuccess && (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            Espelho impresso com sucesso. Confirme para liberar o pagamento.
          </div>
        )}

        {/* Prévia do papel */}
        <div className="p-6 overflow-y-auto bg-stone-200/50 flex justify-center">
          <div id="order-mirror-preview"
            className="w-[300px] bg-white p-5 rounded shadow-sm border border-stone-300 font-mono text-[11px] leading-tight text-stone-900 select-text">

            {/* Cabeçalho do estabelecimento */}
            <div className="text-center pb-2.5 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="font-bold text-sm tracking-wider uppercase">{headerName}</div>
              {settings.razaoSocial && <div>{settings.razaoSocial}</div>}
              {settings.cnpj && <div>CNPJ: {settings.cnpj}</div>}
            </div>

            {/* Identificação */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="flex justify-between font-bold text-xs">
                <span>ESPELHO #{order.codigoExibicao || order.codigoMesa || order.numero}</span>
                <span>{order.tipo.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[10px]">
                <span>{new Date(order.criadoEm).toLocaleDateString('pt-BR')}</span>
                <span>{new Date(order.criadoEm).toLocaleTimeString('pt-BR')}</span>
              </div>

              {order.contaNumero !== undefined && (
                <div>CONTA: {order.contaNumero}
                  {order.sequencia !== undefined && ` • LANÇAMENTO: ${order.codigoExibicao || order.sequencia}`}
                </div>
              )}
              {order.mesaNumero   && <div className="font-bold">MESA: {order.mesaNumero}</div>}
              {order.nomeCliente  && <div>CLIENTE: {order.nomeCliente}</div>}
              {order.telefoneCliente && <div className="text-stone-600">TEL: {order.telefoneCliente}</div>}
              {order.garcomNome   && <div className="text-stone-600">GARÇOM: {order.garcomNome}</div>}
              {order.tipo === 'delivery' && order.enderecoEntrega && (
                <div className="text-[10px] text-stone-700 pt-0.5">
                  <span className="font-bold">ENTREGA: </span>
                  {order.enderecoEntrega.logradouro}, {order.enderecoEntrega.numero} — {order.enderecoEntrega.bairro}
                </div>
              )}
            </div>

            {/* Itens */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1.5">
              <div className="font-bold text-[10px] uppercase text-stone-500 pb-0.5">ITENS</div>
              {displayItems.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>{it.quantidade}x {it.nome}{it.variacaoNome ? ` (${it.variacaoNome})` : ''}</span>
                    <span>{formatCurrency(it.precoUnitario * it.quantidade)}</span>
                  </div>
                  {it.adicionais && it.adicionais.length > 0 && (
                    <div className="pl-2 text-[10px] text-stone-600">
                      {it.adicionais.map((ad, i) => (
                        <div key={i}>+ {ad.nome}{ad.preco > 0 ? ` (${formatCurrency(ad.preco)})` : ''}</div>
                      ))}
                    </div>
                  )}
                  {it.remocoes && it.remocoes.length > 0 && (
                    <div className="pl-2 text-[10px] text-rose-700 italic">Sem: {it.remocoes.join(', ')}</div>
                  )}
                  {it.observacao && (
                    <div className="pl-2 text-[10px] text-stone-500 italic">Obs: {it.observacao}</div>
                  )}
                </div>
              ))}
              {order.observacoesGerais && (
                <div className="pt-0.5 text-[10px] text-stone-600 italic">OBS GERAL: {order.observacoesGerais}</div>
              )}
            </div>

            {/* Totais financeiros */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span><span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.desconto > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>DESCONTO{order.descontoMotivo ? ` (${order.descontoMotivo})` : ''}:</span>
                  <span>-{formatCurrency(order.desconto)}</span>
                </div>
              )}
              {order.taxaServico > 0 && (
                <div className="flex justify-between"><span>TAXA SERVIÇO:</span><span>{formatCurrency(order.taxaServico)}</span></div>
              )}
              {order.taxaEntrega > 0 && (
                <div className="flex justify-between"><span>TAXA ENTREGA:</span><span>{formatCurrency(order.taxaEntrega)}</span></div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300">
                <span>TOTAL:</span><span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Pagamentos */}
            <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5">
              <div className="font-bold text-[10px] uppercase text-stone-500">PAGAMENTOS:</div>
              {pagamentosAtivos.length === 0
                ? <div className="text-stone-500 italic">Nenhum pagamento registrado</div>
                : pagamentosAtivos.map((p, i) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span>• {p.formaNome} ({p.registradoPor})</span>
                      <span className="font-bold">{formatCurrency(p.valor)}</span>
                    </div>
                  ))
              }
              <div className="flex justify-between font-bold pt-1">
                <span>SALDO RESTANTE:</span><span>{formatCurrency(order.saldoRestante)}</span>
              </div>
            </div>

            {/* Rodapé */}
            <div className="pt-2 text-center text-[10px] text-stone-600 space-y-0.5">
              <div className="font-bold uppercase">Via Confirmação de Produção</div>
              <div>Operador: {currentUser?.nome}</div>
              <div>{settings.nomeAplicacao} v{settings.versaoExibida}</div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-between gap-2 items-center">
          <button id="mirror-cancel-btn" onClick={handleCancel}
            className="px-4 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-lg text-xs font-semibold">
            Cancelar
          </button>
          <div className="flex gap-2">
            <button id="mirror-print-btn" onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Printer className="w-3.5 h-3.5" />Imprimir
            </button>
            <button id="mirror-confirm-btn" onClick={handleConfirm} disabled={!canConfirm}
              title={!canConfirm ? 'Corrija falhas de roteamento antes de confirmar.' : 'Confirmar impressão e liberar pagamento'}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />Confirmar Impressão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
