import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { PrinterDevice } from '../../types';
import { PrinterModal } from './PrinterModal';
import { 
  Printer, 
  Plus, 
  Wifi, 
  Usb, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Layers,
  Settings2,
  Trash2,
  Edit2,
  Bluetooth
} from 'lucide-react';

export const PrintersView: React.FC = () => {
  const { 
    printers = [], 
    togglePrinterStatus, 
    triggerTestPrint,
    reprintJob,
    savePrinter,
    deletePrinter,
    printQueue = [] 
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'impressoras' | 'fila'>('impressoras');
  const [testPrintSuccessId, setTestPrintSuccessId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterDevice | null>(null);

  const handleOpenNew = () => {
    setEditingPrinter(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prn: PrinterDevice) => {
    setEditingPrinter(prn);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente remover a impressora "${nome}"?`)) {
      deletePrinter(id);
    }
  };

  const handleTestPrint = (printerId: string) => {
    triggerTestPrint(printerId);
    setTestPrintSuccessId(printerId);
    setTimeout(() => {
      setTestPrintSuccessId(null);
    }, 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-600" />
            Impressoras Térmicas
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Configure as impressoras e roteie Pedido, Espelho e Comprovante por cardápio, atendimento, categoria e estação.
          </p>
        </div>

        <button
          id="new-printer-btn"
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Impressora
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('impressoras')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'impressoras' 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Dispositivos ({printers.length})
        </button>

        <button
          onClick={() => setActiveTab('fila')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'fila' 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Fila de Impressão ({printQueue.length})
        </button>
      </div>

      {/* Tab: Impressoras */}
      {activeTab === 'impressoras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((p) => {
            const isOnline = p.status === 'online';
            return (
              <div 
                key={p.id}
                className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between hover:border-blue-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-stone-900">{p.nome}</h3>
                        <p className="text-xs text-stone-500 font-medium">{p.local} • {p.larguraPapel} • {p.finalidade === 'pedido' ? 'Pedido' : p.finalidade === 'espelho' ? 'Espelho' : p.finalidade === 'comprovante' ? 'Comprovante' : 'Geral'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePrinterStatus(p.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-colors ${
                        isOnline 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                      title="Clique para alternar status Online / Offline"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </button>
                  </div>

                  {/* Device Specs */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs space-y-1 font-mono text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 font-sans">Protocolo:</span>
                      <span className="font-bold">{p.modelo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 font-sans">Endereço IP/Porta:</span>
                      <span>{p.ip}:{p.porta}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 font-sans">Conexão:</span>
                      <span className="capitalize">{p.tipo}</span>
                    </div>
                  </div>

                  {p.regras?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.regras.filter(r => r.ativo).slice(0, 5).map(r => (
                        <span key={r.id} className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-100 text-[10px] font-semibold text-blue-800">{r.nome}</span>
                      ))}
                      {p.regras.filter(r => r.ativo).length > 5 && <span className="px-2 py-1 rounded-lg bg-stone-50 border border-stone-100 text-[10px] text-stone-500">+{p.regras.filter(r => r.ativo).length - 5}</span>}
                    </div>
                  ) : null}

                  {testPrintSuccessId === p.id && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Comando ESC/POS de teste enviado com sucesso!</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-printer-${p.id}`}
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
                      title="Editar configurações da impressora"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-printer-${p.id}`}
                      onClick={() => handleDelete(p.id, p.nome)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                      title="Excluir impressora"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    id={`test-print-${p.id}`}
                    onClick={() => handleTestPrint(p.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-blue-800 font-bold transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Testar Impressão</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Fila de Impressão */}
      {activeTab === 'fila' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Impressora</th>
                  <th className="py-3 px-4">Pedido / Título</th>
                  <th className="py-3 px-4">Tentativas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {printQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      Nenhum trabalho na fila de impressão no momento.
                    </td>
                  </tr>
                ) : (
                  printQueue.map((job) => (
                    <tr key={job.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-500">{job.dataHora}</td>
                      <td className="py-3 px-4 font-bold text-stone-900">{job.impressoraNome}</td>
                      <td className="py-3 px-4 text-stone-700 font-medium">{job.titulo}</td>
                      <td className="py-3 px-4 font-mono text-stone-500">{job.tentativas}x</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          job.status === 'sucesso' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : job.status === 'pendente' 
                            ? 'bg-sky-100 text-sky-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => reprintJob(job.id)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Reimprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printer Modal */}
      <PrinterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => savePrinter(data)}
        printerToEdit={editingPrinter}
      />
    </div>
  );
};
