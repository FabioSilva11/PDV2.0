import React, { useState, useEffect } from 'react';
import { PrinterDevice, PrinterType } from '../../types';
import { X, Save, Printer, Wifi, Usb, Bluetooth } from 'lucide-react';

interface PrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (printer: PrinterDevice) => void;
  printerToEdit?: PrinterDevice | null;
}

export const PrinterModal: React.FC<PrinterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  printerToEdit
}) => {
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('Cozinha Chapa');
  const [tipo, setTipo] = useState<PrinterType>('rede');
  const [ip, setIp] = useState('192.168.1.200');
  const [porta, setPorta] = useState(9100);
  const [modelo, setModelo] = useState('Epson TM-T20X (ESC/POS)');
  const [larguraPapel, setLarguraPapel] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    if (printerToEdit) {
      setNome(printerToEdit.nome);
      setLocal(printerToEdit.local);
      setTipo(printerToEdit.tipo);
      setIp(printerToEdit.ip);
      setPorta(printerToEdit.porta);
      setModelo(printerToEdit.modelo);
      setLarguraPapel(printerToEdit.larguraPapel);
    } else {
      setNome('');
      setLocal('Cozinha Chapa');
      setTipo('rede');
      setIp('192.168.1.200');
      setPorta(9100);
      setModelo('Epson TM-T20X (ESC/POS)');
      setLarguraPapel('80mm');
    }
  }, [printerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const updated: PrinterDevice = {
      id: printerToEdit?.id || `prn-${Date.now()}`,
      nome: nome.trim(),
      local: local.trim(),
      tipo,
      ip: ip.trim(),
      porta: Number(porta) || 9100,
      modelo: modelo.trim(),
      larguraPapel,
      status: printerToEdit?.status || 'online',
      ativa: true,
      itensNaFila: printerToEdit?.itensNaFila || 0
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-base">
              {printerToEdit ? 'Editar Impressora' : 'Nova Impressora Térmica'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Nome de Identificação *</label>
            <input
              type="text"
              required
              placeholder="Ex: Impressora Cozinha Quente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Setor / Local</label>
              <select
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Cozinha Chapa">Cozinha Chapa / Lanches</option>
                <option value="Cozinha Pizzas">Cozinha Forno / Pizzas</option>
                <option value="Balcão Caixa">Balcão Caixa (Cupom Fiscal)</option>
                <option value="Bar & Bebidas">Bar & Bebidas</option>
                <option value="Expedição Delivery">Expedição Delivery</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Tipo de Conexão</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as PrinterType)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="rede">Rede Ethernet / Wi-Fi (TCP/IP)</option>
                <option value="usb">USB Direta</option>
                <option value="bluetooth">Bluetooth</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-stone-700">Endereço IP / Porta</label>
              <input
                type="text"
                placeholder="192.168.1.200"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Porta</label>
              <input
                type="number"
                placeholder="9100"
                value={porta}
                onChange={(e) => setPorta(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Modelo / Protocolo</label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Epson TM-T20X (ESC/POS)">Epson TM-T20X (ESC/POS)</option>
                <option value="Bematech MP-4200 TH">Bematech MP-4200 TH</option>
                <option value="Daruma DR800">Daruma DR800</option>
                <option value="Elgin i9 ESC/POS">Elgin i9 ESC/POS</option>
                <option value="Generic ESC/POS 80mm">Genérica ESC/POS 80mm</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Largura da Bobina</label>
              <select
                value={larguraPapel}
                onChange={(e) => setLarguraPapel(e.target.value as '80mm' | '58mm')}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="80mm">80mm (Padrão Cozinha/Mesa)</option>
                <option value="58mm">58mm (Bobina Estreita)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Impressora</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
