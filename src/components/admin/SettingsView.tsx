import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Settings2, Save, Check } from 'lucide-react';

/**
 * Tela de Configurações do Estabelecimento — edita RestaurantSettings
 * (identidade, PIX, taxas, quick amounts e limites operacionais).
 */
export const SettingsView: React.FC = () => {
  const { settings, saveSettings, hasPermission } = useRestaurant();
  const canEdit = hasPermission('configuracoes') || hasPermission('usuarios');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nomeFantasia: settings.nomeFantasia,
    razaoSocial: settings.razaoSocial,
    cnpj: settings.cnpj,
    inscricaoEstadual: settings.inscricaoEstadual,
    telefone: settings.telefone,
    email: settings.email,
    logradouro: settings.logradouro,
    numero: settings.numero,
    bairro: settings.bairro,
    cidade: settings.cidade,
    estado: settings.estado,
    cep: settings.cep,
    rodapeComprovante: settings.rodapeComprovante,
    pixChave: settings.pix.chave,
    pixNome: settings.pix.nomeRecebedor,
    pixCidade: settings.pix.cidade,
    deliveryFee: String(settings.delivery.defaultFee),
    quickAmounts: settings.cashier.quickAmounts.join(', '),
    lateMinutes: String(settings.operations.lateOrderThresholdMinutes),
    dashStart: String(settings.operations.dashboardStartHour),
    dashEnd: String(settings.operations.dashboardEndHour),
    topProducts: String(settings.operations.topProductsLimit),
  });

  const set = (patch: Partial<typeof form>) => { setForm(prev => ({ ...prev, ...patch })); setSaved(false); };

  const handleSave = () => {
    saveSettings({
      nomeFantasia: form.nomeFantasia.trim(),
      razaoSocial: form.razaoSocial.trim(),
      nomeCurto: form.nomeFantasia.trim(),
      cnpj: form.cnpj.trim(),
      inscricaoEstadual: form.inscricaoEstadual.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      cep: form.cep.trim(),
      rodapeComprovante: form.rodapeComprovante.trim(),
      pix: {
        chave: form.pixChave.trim(),
        nomeRecebedor: form.pixNome.trim(),
        cidade: form.pixCidade.trim(),
        descricao: settings.pix.descricao,
      },
      delivery: { defaultFee: parseFloat(form.deliveryFee) || 0 },
      cashier: { quickAmounts: form.quickAmounts.split(',').map(v => parseFloat(v.trim())).filter(v => Number.isFinite(v) && v > 0) },
      operations: {
        lateOrderThresholdMinutes: parseInt(form.lateMinutes) || settings.operations.lateOrderThresholdMinutes,
        dashboardStartHour: parseInt(form.dashStart) || settings.operations.dashboardStartHour,
        dashboardEndHour: parseInt(form.dashEnd) || settings.operations.dashboardEndHour,
        topProductsLimit: parseInt(form.topProducts) || settings.operations.topProductsLimit,
      },
    });
    setSaved(true);
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none';
  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2"><Settings2 className="w-6 h-6 text-blue-600" />Configurações do Estabelecimento</h2>
          <p className="text-xs text-slate-500">Dados usados em recibos, PIX, PDV e dashboard. Nada fica fixo no código.</p>
        </div>
        <button
          type="button"
          id="settings-save-btn"
          onClick={handleSave}
          disabled={!canEdit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {!canEdit && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">Você não tem permissão para alterar a configuração.</div>}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Nome fantasia</label><input className={inputCls} value={form.nomeFantasia} onChange={e => set({ nomeFantasia: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Razão social</label><input className={inputCls} value={form.razaoSocial} onChange={e => set({ razaoSocial: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>CNPJ</label><input className={inputCls} value={form.cnpj} onChange={e => set({ cnpj: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Inscrição estadual</label><input className={inputCls} value={form.inscricaoEstadual} onChange={e => set({ inscricaoEstadual: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Telefone</label><input className={inputCls} value={form.telefone} onChange={e => set({ telefone: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>E-mail</label><input className={inputCls} value={form.email} onChange={e => set({ email: e.target.value })} disabled={!canEdit} /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="col-span-2"><label className={labelCls}>Logradouro</label><input className={inputCls} value={form.logradouro} onChange={e => set({ logradouro: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Número</label><input className={inputCls} value={form.numero} onChange={e => set({ numero: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Bairro</label><input className={inputCls} value={form.bairro} onChange={e => set({ bairro: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>CEP</label><input className={inputCls} value={form.cep} onChange={e => set({ cep: e.target.value })} disabled={!canEdit} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Cidade</label><input className={inputCls} value={form.cidade} onChange={e => set({ cidade: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>UF</label><input className={inputCls} maxLength={2} value={form.estado} onChange={e => set({ estado: e.target.value })} disabled={!canEdit} /></div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Comprovante & PIX</h3>
        <div><label className={labelCls}>Rodapé do comprovante</label><input className={inputCls} value={form.rodapeComprovante} onChange={e => set({ rodapeComprovante: e.target.value })} disabled={!canEdit} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>Chave PIX</label><input className={inputCls} value={form.pixChave} onChange={e => set({ pixChave: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Nome do recebedor PIX</label><input className={inputCls} value={form.pixNome} onChange={e => set({ pixNome: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Cidade do recebedor PIX</label><input className={inputCls} value={form.pixCidade} onChange={e => set({ pixCidade: e.target.value })} disabled={!canEdit} /></div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Operacional</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div><label className={labelCls}>Taxa entrega (R$)</label><input className={inputCls} type="number" step="0.01" min="0" value={form.deliveryFee} onChange={e => set({ deliveryFee: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Pedido atrasado (min)</label><input className={inputCls} type="number" min="1" value={form.lateMinutes} onChange={e => set({ lateMinutes: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Dashboard início (h)</label><input className={inputCls} type="number" min="0" max="23" value={form.dashStart} onChange={e => set({ dashStart: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Dashboard fim (h)</label><input className={inputCls} type="number" min="0" max="23" value={form.dashEnd} onChange={e => set({ dashEnd: e.target.value })} disabled={!canEdit} /></div>
          <div><label className={labelCls}>Top produtos</label><input className={inputCls} type="number" min="1" value={form.topProducts} onChange={e => set({ topProducts: e.target.value })} disabled={!canEdit} /></div>
        </div>
        <div>
          <label className={labelCls}>Valores rápidos do caixa (separados por vírgula)</label>
          <input className={inputCls} value={form.quickAmounts} onChange={e => set({ quickAmounts: e.target.value })} disabled={!canEdit} />
        </div>
      </section>
    </div>
  );
};
