import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../utils/formatters';
import { AuditLog } from '../../types';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText, 
  AlertTriangle,
  RotateCcw,
  Percent,
  Trash2,
  DollarSign
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const { auditLogs } = useRestaurant();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('todas');

  const filtered = auditLogs.filter(log => {
    const matchSearch = 
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.justificativa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.pedidoNumero && log.pedidoNumero.toString().includes(searchTerm)) ||
      (log.mesaNumero && log.mesaNumero.toString().includes(searchTerm));

    const matchAction = actionFilter === 'todas' || log.acao === actionFilter;

    return matchSearch && matchAction;
  });

  const getActionBadge = (acao: string) => {
    switch (acao) {
      case 'cancelamento_pedido':
        return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">Cancelamento Pedido</span>;
      case 'cancelamento_item':
        return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">Cancelamento Item</span>;
      case 'desconto_aplicado':
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Desconto Concedido</span>;
      case 'estorno_pagamento':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">Estorno Pagamento</span>;
      case 'reabertura_conta':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">Reabertura de Conta</span>;
      case 'sangria_caixa':
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Sangria Caixa</span>;
      case 'suprimento_caixa':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Suprimento Caixa</span>;
      case 'abertura_caixa':
        return <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">Abertura Caixa</span>;
      case 'fechamento_caixa':
        return <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 font-bold text-[10px]">Fechamento Caixa</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px]">{acao}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Auditoria de Ações Críticas & Segurança
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Rastreamento irrevogável de cancelamentos, descontos, estornos e movimentações financeiras
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 self-start sm:self-auto">
          {auditLogs.length} eventos auditados
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por funcionário, motivo, pedido ou mesa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500 font-semibold">Tipo de Ação:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-700 font-medium focus:outline-none"
          >
            <option value="todas">Todas as ações</option>
            <option value="cancelamento_pedido">Cancelamento de Pedido</option>
            <option value="cancelamento_item">Cancelamento de Item</option>
            <option value="desconto_aplicado">Desconto Aplicado</option>
            <option value="estorno_pagamento">Estorno de Pagamento</option>
            <option value="reabertura_conta">Reabertura de Conta</option>
            <option value="sangria_caixa">Sangria de Caixa</option>
            <option value="suprimento_caixa">Suprimento de Caixa</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Operador / Cargo</th>
                <th className="py-3 px-4">Ação Realizada</th>
                <th className="py-3 px-4">Módulo / Origem</th>
                <th className="py-3 px-4">Valores (Antes → Depois)</th>
                <th className="py-3 px-4">Justificativa / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                    {new Date(log.dataHora).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 font-bold text-stone-800">
                    <div>{log.usuario}</div>
                    <div className="text-[10px] text-stone-400 font-normal">{log.cargo}</div>
                  </td>
                  <td className="py-3 px-4">
                    {getActionBadge(log.acao)}
                  </td>
                  <td className="py-3 px-4 capitalize text-stone-700">
                    <div>{log.modulo}</div>
                    {log.pedidoNumero && (
                      <div className="text-[10px] text-amber-700 font-bold font-mono">
                        Pedido #{log.pedidoNumero} {log.mesaNumero ? `(Mesa ${log.mesaNumero})` : ''}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-stone-700 whitespace-nowrap">
                    {log.valorAntes !== undefined && log.valorDepois !== undefined ? (
                      <span>
                        {formatCurrency(log.valorAntes)} → <strong className="text-stone-900">{formatCurrency(log.valorDepois)}</strong>
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-700 max-w-xs">
                    <span className="italic font-medium">"{log.justificativa}"</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
