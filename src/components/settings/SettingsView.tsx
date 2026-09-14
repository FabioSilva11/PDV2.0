import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { PaymentMethodId, ManualPaymentOption, RestaurantSettings } from '../../types';
import { 
  Settings, 
  Building2, 
  DollarSign, 
  Clock, 
  Shield, 
  Utensils, 
  CheckCircle2, 
  Plus, 
  Trash2,
  Save,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  Store,
  CreditCard
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    configureTableCount,
    resetSettingsToDefaults, 
    paymentOptions = [], 
    updatePaymentOptions,
    togglePaymentOption,
    addPaymentOption,
    orders,
    customers,
    menu,
    ingredients,
    financialEntries
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'geral' | 'saas' | 'pagamentos' | 'caixa' | 'cozinha' | 'seguranca'>('geral');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local form state initialized from context
  const [nomeFantasia, setNomeFantasia] = useState(settings?.nomeFantasia || '');
  const [razaoSocial, setRazaoSocial] = useState(settings?.razaoSocial || '');
  const [cnpj, setCnpj] = useState(settings?.cnpj || '');
  const [telefone, setTelefone] = useState(settings?.telefone || '');
  const [endereco, setEndereco] = useState(settings?.endereco || '');
  const [mensagemCupom, setMensagemCupom] = useState(settings?.mensagemCupom || '');
  const [quantidadeMesas, setQuantidadeMesas] = useState(String(settings?.quantidadeMesas ?? 16));

  // Caixa & Operação
  const [fechamentoCego, setFechamentoCego] = useState(settings?.fechamentoCego ?? true);
  const [taxaServicoPadrao, setTaxaServicoPadrao] = useState(settings?.taxaServicoPadrao?.toString() || '10');
  const [limiteSangriaAlerta, setLimiteSangriaAlerta] = useState(settings?.limiteSangriaAlerta?.toString() || '800');

  // Cozinha & KDS
  const [tempoAlertaAmarelo, setTempoAlertaAmarelo] = useState(settings?.tempoAlertaAmareloMinutos?.toString() || '15');
  const [tempoAlertaVermelho, setTempoAlertaVermelho] = useState(settings?.tempoAlertaVermelhoMinutos?.toString() || '25');
  const [agruparItensIguaisKDS, setAgruparItensIguaisKDS] = useState(settings?.agruparItensIguaisKDS ?? true);

  // Segurança
  const [exigirJustificativaCancelamento, setExigirJustificativaCancelamento] = useState(settings?.exigirJustificativaCancelamento ?? true);
  const [exigirJustificativaDesconto, setExigirJustificativaDesconto] = useState(settings?.exigirJustificativaDesconto ?? true);
  const [bloquearEstornoSemGerente, setBloquearEstornoSemGerente] = useState(settings?.bloquearEstornoSemGerente ?? true);

  // SaaS
  const [unidadeAtual, setUnidadeAtual] = useState(settings?.saas?.unidadeAtual || 'Matriz - Centro');
  const [modulosAtivos, setModulosAtivos] = useState(settings?.saas?.modulosAtivos || {
    mesas: true,
    comandas: true,
    kds: true,
    delivery: true,
    estoque: true,
    financeiro: true,
    crm: true
  });

  // Modal / Form to add new manual payment method
  const [newPaymentName, setNewPaymentName] = useState('');
  const [newPaymentTroco, setNewPaymentTroco] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  // Synchronize when settings change in context
  useEffect(() => {
    if (settings) {
      setNomeFantasia(settings.nomeFantasia || '');
      setRazaoSocial(settings.razaoSocial || '');
      setCnpj(settings.cnpj || '');
      setTelefone(settings.telefone || '');
      setEndereco(settings.endereco || '');
      setMensagemCupom(settings.mensagemCupom || '');
      setQuantidadeMesas(String(settings.quantidadeMesas ?? 16));
      setFechamentoCego(settings.fechamentoCego ?? true);
      setTaxaServicoPadrao(settings.taxaServicoPadrao?.toString() || '10');
      setLimiteSangriaAlerta(settings.limiteSangriaAlerta?.toString() || '800');
      setTempoAlertaAmarelo(settings.tempoAlertaAmareloMinutos?.toString() || '15');
      setTempoAlertaVermelho(settings.tempoAlertaVermelhoMinutos?.toString() || '25');
      setAgruparItensIguaisKDS(settings.agruparItensIguaisKDS ?? true);
      setExigirJustificativaCancelamento(settings.exigirJustificativaCancelamento ?? true);
      setExigirJustificativaDesconto(settings.exigirJustificativaDesconto ?? true);
      setBloquearEstornoSemGerente(settings.bloquearEstornoSemGerente ?? true);
      setUnidadeAtual(settings.saas?.unidadeAtual || 'Matriz - Centro');
      if (settings.saas?.modulosAtivos) {
        setModulosAtivos(settings.saas.modulosAtivos);
      }
    }
  }, [settings]);

  const handleSave = () => {
    const tableCount = Math.max(1, Math.floor(Number(quantidadeMesas) || 1));
    const updatedSettings: Partial<RestaurantSettings> = {
      nomeFantasia: nomeFantasia.trim(),
      razaoSocial: razaoSocial.trim(),
      cnpj: cnpj.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      mensagemCupom: mensagemCupom.trim(),
      quantidadeMesas: tableCount,
      taxaServicoPadrao: Number(taxaServicoPadrao) || 10,
      fechamentoCego,
      limiteSangriaAlerta: Number(limiteSangriaAlerta) || 800,
      tempoAlertaAmareloMinutos: Number(tempoAlertaAmarelo) || 15,
      tempoAlertaVermelhoMinutos: Number(tempoAlertaVermelho) || 25,
      agruparItensIguaisKDS,
      exigirJustificativaCancelamento,
      exigirJustificativaDesconto,
      bloquearEstornoSemGerente,
      saas: {
        nome: settings?.saas?.nome || 'Murupi Pro Enterprise',
        plano: settings?.saas?.plano || 'Murupi Pro Enterprise',
        validade: settings?.saas?.validade || '31/12/2026',
        validadeLicenca: settings?.saas?.validadeLicenca || '31/12/2026',
        licencaKey: settings?.saas?.licencaKey || 'MRP-ENTERPRISE-PRO-9988-X7',
        status: 'ativo',
        unidadeAtual: unidadeAtual.trim(),
        limiteMesas: settings?.saas?.limiteMesas || 50,
        limiteComandas: settings?.saas?.limiteComandas || 200,
        modulosHabilitados: settings?.saas?.modulosHabilitados || Object.keys(modulosAtivos).filter(key => modulosAtivos[key]),
        versaoSistema: settings?.saas?.versaoSistema || '3.0',
        modulosAtivos
      }
    };

    updateSettings(updatedSettings);
    configureTableCount(tableCount);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddManualPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentName.trim()) return;

    const newId = `manual-${newPaymentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` as PaymentMethodId;
    const newOption: ManualPaymentOption = {
      id: newId,
      nome: newPaymentName.trim(),
      ativo: true,
      permiteTroco: newPaymentTroco,
      tipoManual: 'dinheiro',
      geraTroco: newPaymentTroco,
      instrucaoOperador: 'Registrar valor conferido pelo operador em caixa'
    };

    addPaymentOption(newOption);
    setNewPaymentName('');
    setNewPaymentTroco(false);
    setIsAddingPayment(false);
  };

  const handleExportBackup = () => {
    const backupData = {
      versao: '3.0',
      dataExportacao: new Date().toISOString(),
      restaurante: settings,
      pedidos: orders,
      clientes: customers,
      cardapio: menu,
      estoque: ingredients,
      financeiro: financialEntries,
      formasPagamento: paymentOptions
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sistema_murupi_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (window.confirm('Atenção: Deseja realmente restaurar as configurações padrão de fábrica do sistema?')) {
      resetSettingsToDefaults();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const toggleModulo = (key: keyof typeof modulosAtivos) => {
    setModulosAtivos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-600" />
            Configurações Globais & Gestão SaaS
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Parâmetros operacionais dinâmicos, licença SaaS multi-unidade, regras de caixa e formas de pagamento manuais
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="reset-settings-btn"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            title="Restaurar parâmetros padrão"
          >
            <RotateCcw className="w-4 h-4 text-stone-500" />
            <span>Padrões</span>
          </button>

          <button
            id="save-settings-top-btn"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configurações salvas e aplicadas em tempo real em todos os terminais do restaurante!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('geral')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'geral' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Dados do Estabelecimento
        </button>

        <button
          onClick={() => setActiveTab('saas')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'saas' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Plano SaaS & Multi-Unidade</span>
        </button>

        <button
          onClick={() => setActiveTab('pagamentos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pagamentos' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Formas de Pagamento Manual ({paymentOptions.length})
        </button>

        <button
          onClick={() => setActiveTab('caixa')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'caixa' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Caixa & Fechamento Cego
        </button>

        <button
          onClick={() => setActiveTab('cozinha')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'cozinha' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          KDS & Prazos
        </button>

        <button
          onClick={() => setActiveTab('seguranca')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'seguranca' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Segurança & Auditoria
        </button>
      </div>

      {/* Tab: Geral */}
      {activeTab === 'geral' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            Identificação do Estabelecimento & Cupom Térmico
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-600 mb-1">Nome Fantasia (Exibido no Cabeçalho):</label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-600 mb-1">Razão Social:</label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-600 mb-1">CNPJ do Restaurante:</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-600 mb-1">Telefone / WhatsApp Comercial:</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-600 mb-1">Quantidade de mesas do estabelecimento:</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantidadeMesas}
                onChange={(e) => setQuantidadeMesas(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="mt-1 text-[11px] text-stone-400">Define quantas mesas aparecem no salão e ficam disponíveis para abrir contas.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-600 mb-1">Endereço Completo do Ponto:</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-600 mb-1">Mensagem de Rodapé do Cupom de Mesa e Térmica:</label>
              <textarea
                rows={2}
                value={mensagemCupom}
                onChange={(e) => setMensagemCupom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Plano SaaS & Multi-Unidade */}
      {activeTab === 'saas' && (
        <div className="space-y-4">
          {/* SaaS Status Card */}
          <div className="bg-gradient-to-br from-amber-900 to-stone-900 rounded-2xl p-6 text-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 border border-amber-400 text-amber-200 text-[11px] font-extrabold uppercase tracking-wider">
                    Plano Ativo
                  </span>
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Licença Regular
                  </span>
                </div>
                <h3 className="text-xl font-black mt-1 text-amber-50">{settings?.saas?.plano || 'Murupi Pro Enterprise'}</h3>
                <p className="text-xs text-stone-300 mt-0.5">
                  Assinatura Cloud • Validade até {settings?.saas?.validadeLicenca || '31/12/2026'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-right">
                <span className="text-[10px] text-stone-300 uppercase tracking-wider block">Chave da Licença</span>
                <span className="font-mono text-xs text-amber-200 font-bold">{settings?.saas?.licencaKey || 'MRP-ENTERPRISE-PRO-9988-X7'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-stone-400 block text-[10px]">Capacidade Mesas</span>
                <strong className="text-amber-200 font-bold text-sm">Até {settings?.saas?.limiteMesas || 50} mesas</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-stone-400 block text-[10px]">Comandas Eletrônicas</span>
                <strong className="text-amber-200 font-bold text-sm">Até {settings?.saas?.limiteComandas || 200} simultâneas</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-stone-400 block text-[10px]">Terminais Simultâneos</span>
                <strong className="text-amber-200 font-bold text-sm">Ilimitados</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-stone-400 block text-[10px]">Backups em Nuvem</span>
                <strong className="text-emerald-400 font-bold text-sm">Automático & Diário</strong>
              </div>
            </div>
          </div>

          {/* Unidade / Filial Switcher */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-600" />
              Gestão de Unidade / Filial Ativa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Identificação da Unidade em Operação:</label>
                <input
                  type="text"
                  value={unidadeAtual}
                  onChange={(e) => setUnidadeAtual(e.target.value)}
                  placeholder="Ex: Unidade Matriz - Centro, Filial Shopping, etc."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Altera a identificação da unidade exibida na barra superior e nos relatórios.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Alternar Rápido de Filial:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUnidadeAtual('Matriz - Centro')}
                    className={`px-3 py-2 rounded-xl font-bold text-xs flex-1 transition-all ${
                      unidadeAtual === 'Matriz - Centro' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Matriz Centro
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnidadeAtual('Filial 02 - Zona Sul')}
                    className={`px-3 py-2 rounded-xl font-bold text-xs flex-1 transition-all ${
                      unidadeAtual === 'Filial 02 - Zona Sul' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    Filial 02 Sul
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Módulos do Sistema SaaS */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Módulos SaaS Contratados & Habilitados
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {[
                { key: 'mesas', label: 'Gestão de Mesas & Salão' },
                { key: 'comandas', label: 'Comandas Individuais' },
                { key: 'kds', label: 'KDS Cozinha & Expedição' },
                { key: 'delivery', label: 'Delivery & Entregadores' },
                { key: 'estoque', label: 'Estoque, Ficha Técnica & CMV' },
                { key: 'financeiro', label: 'Financeiro, DRE & Contas' },
                { key: 'crm', label: 'CRM Clientes & Fidelidade' },
              ].map(m => (
                <label
                  key={m.key}
                  className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <span className="font-semibold text-stone-800">{m.label}</span>
                  <input
                    type="checkbox"
                    checked={modulosAtivos[m.key as keyof typeof modulosAtivos]}
                    onChange={() => toggleModulo(m.key as keyof typeof modulosAtivos)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Backup do Sistema */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-600" />
                  Cópia de Segurança & Exportação JSON
                </h3>
                <p className="text-xs text-stone-500">
                  Baixe todos os dados do restaurante (pedidos, clientes, estoque e configurações) em arquivo JSON seguro.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Backup Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Pagamentos Manuais */}
      {activeTab === 'pagamentos' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Formas de Pagamento Manual Habilitadas
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                O sistema opera sem gateways automáticos. Os operadores recebem e conferem manualmente na maquininha externa ou em espécie.
              </p>
            </div>

            <button
              onClick={() => setIsAddingPayment(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Meio Manual</span>
            </button>
          </div>

          {/* Form to add new payment option */}
          {isAddingPayment && (
            <form onSubmit={handleAddManualPayment} className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-amber-900">Novo Meio de Pagamento Manual</strong>
                <button
                  type="button"
                  onClick={() => setIsAddingPayment(false)}
                  className="text-stone-400 hover:text-stone-600 text-xs"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nome da Forma (Ex: Vale Refeição VR, Cheque, Fiado):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Vale Refeição VR"
                    value={newPaymentName}
                    onChange={(e) => setNewPaymentName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="new-pay-troco"
                    checked={newPaymentTroco}
                    onChange={(e) => setNewPaymentTroco(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <label htmlFor="new-pay-troco" className="font-semibold text-stone-700 cursor-pointer">
                    Habilitar cálculo de troco (como dinheiro em espécie)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPayment(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold"
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-stone-100">
            {paymentOptions.map((opt) => (
              <div key={opt.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-stone-800">{opt.nome}</div>
                  <div className="text-[11px] text-stone-500">
                    {opt.geraTroco ? 'Permite cálculo de troco em espécie' : 'Valor exato conferido na maquininha externa'}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opt.ativo}
                    onChange={() => togglePaymentOption(opt.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Regras de Caixa */}
      {activeTab === 'caixa' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            Conferência & Fechamento Cego
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <strong className="text-stone-800 text-sm block">Exigir Fechamento Cego de Caixa</strong>
                <p className="text-stone-500 mt-0.5">
                  O operador não enxerga o saldo esperado pelo sistema no momento do encerramento. Ele deve contar e digitar as notas, moedas e filipetas de cartão manualmente para evitar fraudes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={fechamentoCego}
                onChange={(e) => setFechamentoCego(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 mt-1 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <strong className="text-stone-800 text-sm block">Taxa de Serviço Sugerida (%)</strong>
                <p className="text-stone-500">Taxa adicionada opcionalmente às contas de salão e mesas.</p>
              </div>
              <input
                type="number"
                value={taxaServicoPadrao}
                onChange={(e) => setTaxaServicoPadrao(e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg border border-stone-300 font-bold text-center"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <strong className="text-stone-800 text-sm block">Limite de Dinheiro em Gaveta p/ Sangria (R$)</strong>
                <p className="text-stone-500">Gera alerta para o operador recolher notas da gaveta quando ultrapassado.</p>
              </div>
              <input
                type="number"
                value={limiteSangriaAlerta}
                onChange={(e) => setLimiteSangriaAlerta(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-stone-300 font-bold text-center font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Cozinha / KDS */}
      {activeTab === 'cozinha' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Alertas de Tempo de Preparo na Cozinha
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <label className="block font-bold text-amber-900">Alerta de Atenção (Amarelo):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempoAlertaAmarelo}
                  onChange={(e) => setTempoAlertaAmarelo(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-lg border border-amber-300 font-bold bg-white"
                />
                <span className="text-amber-800 font-medium">minutos após o pedido</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <label className="block font-bold text-rose-900">Alerta Crítico / Atraso (Vermelho):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempoAlertaVermelho}
                  onChange={(e) => setTempoAlertaVermelho(e.target.value)}
                  className="w-24 px-3 py-1.5 rounded-lg border border-rose-300 font-bold bg-white"
                />
                <span className="text-rose-800 font-medium">minutos após o pedido</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
            <div>
              <strong className="text-stone-800 text-sm block">Agrupar Itens Idênticos nos Painéis da Cozinha</strong>
              <p className="text-stone-500">Agrupa múltiplos pedidos iguais para preparo em lote pelos cozinheiros.</p>
            </div>
            <input
              type="checkbox"
              checked={agruparItensIguaisKDS}
              onChange={(e) => setAgruparItensIguaisKDS(e.target.checked)}
              className="w-5 h-5 rounded text-amber-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Tab: Segurança & Auditoria */}
      {activeTab === 'seguranca' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            Regras de Rastreabilidade e Auditoria
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <strong className="text-stone-800 text-sm block">Exigir Justificativa em Cancelamentos</strong>
                <p className="text-stone-500">Obrigatório registrar o motivo de descarte ou erro de lançamento.</p>
              </div>
              <input
                type="checkbox"
                checked={exigirJustificativaCancelamento}
                onChange={(e) => setExigirJustificativaCancelamento(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <strong className="text-stone-800 text-sm block">Exigir Justificativa em Descontos</strong>
                <p className="text-stone-500">Registra o operador e a razão da concessão de cortesia ou desconto.</p>
              </div>
              <input
                type="checkbox"
                checked={exigirJustificativaDesconto}
                onChange={(e) => setExigirJustificativaDesconto(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <strong className="text-stone-800 text-sm block">Bloquear Estorno de Pagamento sem PIN de Gerente</strong>
                <p className="text-stone-500">Impede que operadores de caixa desfaçam pagamentos sem autorização gerencial.</p>
              </div>
              <input
                type="checkbox"
                checked={bloquearEstornoSemGerente}
                onChange={(e) => setBloquearEstornoSemGerente(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
