import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Building2, UserPlus, Settings2, CheckCircle2 } from 'lucide-react';

/**
 * ============================================================
 * ASSISTENTE DE CONFIGURAÇÃO INICIAL (primeira execução)
 * ============================================================
 * Etapa 1: dados do estabelecimento
 * Etapa 2: criação do administrador principal (único)
 * Etapa 3: configurações operacionais básicas
 * Etapa 4: conclusão
 * ============================================================
 */
export const SetupWizard: React.FC = () => {
  const { completeSetup } = useRestaurant();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Etapa 1 — Estabelecimento
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Etapa 2 — Administrador principal
  const [adminNome, setAdminNome] = useState('');
  const [adminUsuario, setAdminUsuario] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [adminSenhaConfirm, setAdminSenhaConfirm] = useState('');

  // Etapa 3 — Operacional
  const [deliveryFee, setDeliveryFee] = useState('0.00');
  const [quickAmounts, setQuickAmounts] = useState('20, 50, 100, 200');
  const [lateMinutes, setLateMinutes] = useState('25');

  const finish = async () => {
    setError('');
    if (adminSenha !== adminSenhaConfirm) {
      setError('As senhas não coincidem.');
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      await completeSetup({
        settings: {
          nomeFantasia: nomeFantasia.trim(),
          razaoSocial: razaoSocial.trim() || nomeFantasia.trim(),
          nomeCurto: nomeFantasia.trim(),
          cnpj: cnpj.trim(),
          telefone: telefone.trim(),
          cidade: cidade.trim(),
          estado: estado.trim().toUpperCase(),
          delivery: { defaultFee: parseFloat(deliveryFee) || 0 },
          cashier: { quickAmounts: quickAmounts.split(',').map(v => parseFloat(v.trim())).filter(v => Number.isFinite(v) && v > 0) },
          operations: { lateOrderThresholdMinutes: parseInt(lateMinutes) || 25, dashboardStartHour: 10, dashboardEndHour: 23, topProductsLimit: 5 },
        },
        admin: { nome: adminNome.trim(), usuario: adminUsuario.trim(), senha: adminSenha },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao concluir a configuração.');
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Dados do Estabelecimento</h1>
            </div>
            <p className="text-xs text-slate-500">Estes dados aparecem nos recibos, comprovantes e PIX. Você pode alterá-los depois em Configurações.</p>
            <input className={inputCls} placeholder="Nome fantasia *" value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} />
            <input className={inputCls} placeholder="Razão social" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} />
              <input className={inputCls} placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input className={`${inputCls} col-span-2`} placeholder="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
              <input className={inputCls} placeholder="UF" maxLength={2} value={estado} onChange={e => setEstado(e.target.value)} />
            </div>
            <button
              type="button"
              id="setup-step1-next"
              disabled={!nomeFantasia.trim()}
              onClick={() => setStep(2)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Administrador Principal</h1>
            </div>
            <p className="text-xs text-slate-500">Este será o único administrador principal do sistema. Ele poderá criar usuários operacionais (gerente, caixa, garçom).</p>
            <input className={inputCls} placeholder="Nome completo *" value={adminNome} onChange={e => setAdminNome(e.target.value)} />
            <input className={inputCls} placeholder="Usuário (login) *" value={adminUsuario} onChange={e => setAdminUsuario(e.target.value)} />
            <input className={inputCls} type="password" placeholder="Senha *" value={adminSenha} onChange={e => setAdminSenha(e.target.value)} />
            <input className={inputCls} type="password" placeholder="Confirmar senha *" value={adminSenhaConfirm} onChange={e => setAdminSenhaConfirm(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 text-slate-600 bg-slate-100 rounded-xl text-sm font-semibold">Voltar</button>
              <button
                type="button"
                id="setup-step2-next"
                disabled={!adminNome.trim() || !adminUsuario.trim() || adminSenha.length < 4}
                onClick={() => {
                  if (adminSenha !== adminSenhaConfirm) { setError('As senhas não coincidem.'); return; }
                  setError('');
                  setStep(3);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Configurações Operacionais</h1>
            </div>
            <p className="text-xs text-slate-500">Valores iniciais. Todos podem ser alterados depois.</p>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Taxa de entrega padrão (R$)</label>
              <input className={inputCls} type="number" step="0.01" min="0" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Valores rápidos do caixa (separados por vírgula)</label>
              <input className={inputCls} value={quickAmounts} onChange={e => setQuickAmounts(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Minutos para pedido atrasado</label>
              <input className={inputCls} type="number" min="1" value={lateMinutes} onChange={e => setLateMinutes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 text-slate-600 bg-slate-100 rounded-xl text-sm font-semibold">Voltar</button>
              <button type="button" id="setup-step3-next" onClick={() => setStep(4)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl">Revisar</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h1 className="text-lg font-bold text-slate-900">Concluir Instalação</h1>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm space-y-1.5 text-slate-700">
              <div><strong>Estabelecimento:</strong> {nomeFantasia}</div>
              <div><strong>Administrador:</strong> {adminNome} ({adminUsuario})</div>
              <div><strong>Taxa de entrega:</strong> R$ {parseFloat(deliveryFee).toFixed(2)}</div>
              <div><strong>Pedido atrasado após:</strong> {lateMinutes} min</div>
            </div>
            {error && <div role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="px-4 py-2.5 text-slate-600 bg-slate-100 rounded-xl text-sm font-semibold">Voltar</button>
              <button
                type="button"
                id="setup-finish-btn"
                disabled={saving}
                onClick={finish}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl"
              >
                {saving ? 'Concluindo…' : 'Concluir e Entrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
