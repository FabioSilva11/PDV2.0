// ==========================================
// MÓDULO DE TIPOS GERAIS DO SISTEMA RESTAURANTE SAAS
// ==========================================

export type CategoryType = 
  | 'Hambúrgueres'
  | 'Lanches & Burgers'
  | 'Pizzas'
  | 'Pratos principais'
  | 'Entradas'
  | 'Porções Extras'
  | 'Bebidas'
  | 'Sucos de Frutas'
  | 'Sobremesas'
  | 'Combos';

export type KitchenStation = 'cozinha' | 'chapa' | 'bar' | 'pizza' | 'sobremesa';

export interface IngredientUsage {
  ingredienteId: string;
  nome: string;
  quantidade: number;
  unidade: UnitOfMeasure;
  custoEstimado: number;
}

export interface ProductAddon {
  id: string;
  nome: string;
  preco: number;
  ingredientes?: IngredientUsage[];
}

export interface ProductAddonGroup {
  id: string;
  nome: string; // ex: "Adicionais de Queijo", "Molhos"
  minimo: number;
  maximo: number;
  obrigatorio: boolean;
  opcoes: ProductAddon[];
}

export interface ProductVariation {
  id: string;
  nome: string; // ex: "Pequena", "Média", "Grande" ou "Individual", "Para 2 pessoas"
  preco: number;
  custoEstimado: number;
  disponivel?: boolean;
  quantidade?: number;
  unidade?: string;
}

export interface MenuItem {
  id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  imagem?: string;
  categoria: CategoryType;
  preco: number;
  custoEstimado?: number;
  disponivel: boolean;
  tamanho?: string;
  acompanhamentos?: string[];
  variacoes?: ProductVariation[];
  gruposAdicionais?: ProductAddonGroup[];
  remocoesDisponiveis?: string[]; // ex: ["Sem cebola", "Sem tomate", "Sem molho"]
  fichaTecnica?: IngredientUsage[];
  estacaoProducao?: KitchenStation;
  estoqueControlado?: boolean;
  permiteMeioAMeio?: boolean;
  porPeso?: boolean;
}

export interface CartItemAddon {
  grupoId: string;
  addonId: string;
  nome: string;
  preco: number;
}

export interface CartItem {
  ingredientesConsumidos?: IngredientUsage[];
  cartItemId: string;
  menuItemId: string;
  nome: string;
  variacaoNome?: string;
  precoUnitario: number;
  quantidade: number;
  adicionais?: CartItemAddon[];
  remocoes?: string[];
  observacao: string;
  estacaoProducao: KitchenStation;
  statusProducao?: 'pendente' | 'preparando' | 'pronto';
  acompanhamentosEscolhidos?: string[];
  segundoSaborNome?: string; // Para pizza meio a meio
  segundoSaborPreco?: number;
}

// ------------------------------------------
// PEDIDOS & CANAIS
// ------------------------------------------
export type OrderType = 
  | 'mesa' 
  | 'balcao' 
  | 'retirada' 
  | 'delivery' 
  | 'telefone' 
  | 'whatsapp' 
  | 'manual';

export type OrderStatus = 
  | 'novo'
  | 'confirmado'
  | 'em_preparacao'
  | 'preparando'
  | 'pendente'
  | 'pronto'
  | 'saiu_entrega'
  | 'entregue'
  | 'finalizado'
  | 'cancelado';

export type PaymentStatus = 'pendente' | 'pago_parcial' | 'pago' | 'estornado';

export type PaymentMethodId = 
  | 'dinheiro'
  | 'pix'
  | 'debito'
  | 'credito'
  | 'vale_refeicao'
  | 'vale_alimentacao'
  | 'cortesia'
  | 'fiado'
  | 'outro';

export type PaymentMethod = PaymentMethodId;

export interface PaymentRecord {
  id: string;
  formaId: PaymentMethodId;
  formaNome: string;
  valor: number;
  valorRecebido?: number; // Para cálculo de troco em dinheiro
  troco?: number;
  observacao?: string;
  dataHora: string;
  registradoPor: string; // Nome do funcionário
  estornado?: boolean;
  motivoEstorno?: string;
  estornadoPor?: string;
  estornadoEm?: string;
}

export interface OrderCancellation {
  motivo: string;
  usuario: string;
  dataHora: string;
}

export interface Order {
  operacaoId?: string;
  id: string;
  numero: number;
  tipo: OrderType;
  clienteId?: string;
  nomeCliente?: string;
  telefoneCliente?: string;
  enderecoEntrega?: {
    logradouro: string;
    numero: string;
    bairro: string;
    complemento?: string;
    pontoReferencia?: string;
  };
  mesaNumero?: number;
  comandaNumero?: number;
  garcomNome?: string;
  entregadorNome?: string;
  canal: string; // 'Salão', 'Balcão', 'WhatsApp', 'iFood', 'Telefone'
  criadoEm: string;
  previsaoEntrega?: string;
  itens: CartItem[];
  subtotal: number;
  desconto: number;
  descontoMotivo?: string;
  taxaServico: number; // 10% opcional
  taxaEntrega: number;
  total: number;
  status: OrderStatus;
  statusPagamento: PaymentStatus;
  pagamentos: PaymentRecord[];
  valorTotalPago: number;
  saldoRestante: number;
  observacoesGerais?: string;
  prioridade?: 'normal' | 'urgente';
  cancelamento?: OrderCancellation;
  historicoImpressao?: {
    impressoraNome: string;
    dataHora: string;
    sucesso: boolean;
  }[];
}

// ------------------------------------------
// MESAS & COMANDAS
// ------------------------------------------
export type TableStatus = 'livre' | 'ocupada' | 'reservada' | 'conta' | 'fechando';

export interface Table {
  id: string;
  numero: number;
  capacidade: number;
  status: TableStatus;
  garcomResponsavel?: string;
  clienteNome?: string;
  abertaEm?: string;
  pedidoAtivoId?: string;
  comandasIds?: string[];
  valorAtual: number;
  pessoasSentadas?: number;
  // Posicionamento no editor visual
  posX: number;
  posY: number;
  formato: 'quadrada' | 'redonda' | 'retangular';
  setor: 'Salão Principal' | 'Varanda' | 'Deck Externo' | 'Mezanino';
}

export interface Comanda {
  id: string;
  numero: number;
  clienteNome?: string;
  clienteTelefone?: string;
  mesaNumero?: number;
  limiteConsumo?: number;
  abertaEm: string;
  fechadaEm?: string;
  status: 'aberta' | 'fechada';
  itens: CartItem[];
  total: number;
  garcomNome?: string;
  pagamentoStatus: PaymentStatus;
}

// ------------------------------------------
// CAIXA OPERACIONAL (REGISTRO MANUAL)
// ------------------------------------------
export type CashMovementType = 
  | 'abertura'
  | 'suprimento'
  | 'sangria'
  | 'entrada_manual'
  | 'saida_manual'
  | 'venda_manual'
  | 'fechamento';

export interface CashTransaction {
  id: string;
  tipo: CashMovementType;
  valor: number;
  motivo: string;
  formaPagamento?: PaymentMethodId;
  horario: string;
  pedidoId?: string;
  operador: string;
}

export interface CashRegister {
  id: string;
  aberto: boolean;
  operadorAbertura?: string;
  abertoEm?: string;
  fechadoEm?: string;
  saldoInicial: number;
  saldoAtualGaveta: number; // Dinheiro físico esperado
  transacoes: CashTransaction[];
  fechamentoCego?: {
    dinheiroInformado: number;
    pixInformado: number;
    cartaoInformado: number;
    outrosInformado: number;
    diferencaDinheiro: number;
    observacao?: string;
    conferidoPor: string;
  };
}

// ------------------------------------------
// ESTOQUE & FICHA TÉCNICA & LOTES
// ------------------------------------------
export type UnitOfMeasure = 'un' | 'g' | 'kg' | 'ml' | 'l' | 'cx' | 'pct';

export interface Ingredient {
  id: string;
  codigo: string;
  nome: string;
  unidade: UnitOfMeasure;
  categoria: 'Carnes' | 'Queijos e Laticínios' | 'Panificação' | 'Hortifruti' | 'Bebidas' | 'Molhos & Condimentos' | 'Embalagens';
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueIdeal: number;
  custoMedio: number;
  ultimoPrecoCompra: number;
  fornecedorPadraoId?: string;
}

export type StockMovementType = 'entrada' | 'saida_venda' | 'ajuste' | 'perda' | 'transferencia' | 'inventario';

export interface StockMovement {
  id: string;
  ingredienteId: string;
  tipo: StockMovementType;
  quantidade: number;
  unidade: UnitOfMeasure;
  custoTotal: number;
  motivo: string;
  usuario: string;
  dataHora: string;
}

export interface ProductBatch {
  id: string;
  loteNumero: string;
  produtoOuIngredienteNome: string;
  ingredienteId?: string;
  quantidade: number;
  unidade: UnitOfMeasure;
  dataEntrada: string;
  dataValidade: string;
  fornecedorNome: string;
  statusValidade: 'normal' | 'vence_hoje' | 'vence_amanha' | 'vence_7_dias' | 'vencido';
}

export type StockBatch = ProductBatch;

// ------------------------------------------
// COMPRAS & FORNECEDORES
// ------------------------------------------
export interface Supplier {
  id: string;
  nome: string;
  empresa: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  produtosFornecidos: string[];
  totalComprado: number;
  observacoes?: string;
  categoria?: string;
  contato?: string;
  prazoMedioEntregaDias?: number;
  condicoesPagamento?: string[];
}

export type PurchaseOrderStatus = 'solicitacao' | 'cotacao' | 'pedido' | 'recebido' | 'cancelado';

export interface PurchaseItem {
  ingredienteId: string;
  nome: string;
  quantidade: number;
  unidade: UnitOfMeasure;
  precoUnitario: number;
  precoUltimaCompra: number;
  variacaoPercentual: number; // ex: +22%
  total: number;
}

export interface PurchaseOrder {
  id: string;
  codigo: string;
  fornecedorId: string;
  fornecedorNome: string;
  status: PurchaseOrderStatus;
  itens: PurchaseItem[];
  valorTotal: number;
  dataCriacao: string;
  dataPrevisao?: string;
  dataRecebimento?: string;
  compradorNome: string;
  observacoes?: string;
}

// ------------------------------------------
// DELIVERY & ENTREGADORES
// ------------------------------------------
export interface Courier {
  id: string;
  nome: string;
  telefone: string;
  placaMoto?: string;
  status: 'disponivel' | 'em_rota' | 'indisponivel';
  entregasHoje: number;
  totalGastoTaxas: number;
}

// ------------------------------------------
// CLIENTES (CRM)
// ------------------------------------------
export interface Customer {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  email?: string;
  aniversario?: string; // DD/MM
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    complemento?: string;
    pontoReferencia?: string;
  };
  quantidadePedidos: number;
  totalGasto: number;
  ticketMedio: number;
  ultimoPedidoData?: string;
  produtosFavoritos: string[];
  observacoes?: string;
  // Campos usados pelo fluxo de CRM e delivery.
  cpf?: string;
  enderecos?: {
    id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    complemento?: string;
    referencia?: string;
    principal?: boolean;
  }[];
  totalPedidos?: number;
  ultimoPedidoEm?: string;
  preferencias?: string;
}

// ------------------------------------------
// FUNCIONÁRIOS & PERMISSÕES
// ------------------------------------------
export type UserRole = 
  | 'Administrador'
  | 'Gerente'
  | 'Caixa'
  | 'Garçom'
  | 'Cozinha'
  | 'Estoquista'
  | 'Entregador'
  | 'Gerente Geral'
  | 'Operador de Caixa'
  | 'Garçom / Atendente'
  | 'Chef de Cozinha'
  | 'Pizzaiolo / Chapa'
  | 'Entregador / Courier';

export interface UserPermissions {
  cancelarPedido: boolean;
  cancelarItem?: boolean;
  aplicarDesconto: boolean;
  reabrirCaixa: boolean;
  modificarEstoque: boolean;
  visualizarFinanceiro: boolean;
  reabrirConta: boolean;
  excluirProduto: boolean;
  fecharMesa: boolean;
  estornarPagamento: boolean;
  fechamentoCegoCaixa?: boolean;
}

export interface StaffUser {
  id: string;
  nome: string;
  cargo: UserRole;
  telefone: string;
  usuario: string;
  status: 'ativo' | 'inativo';
  permissoes: UserPermissions;
  pin?: string;
  senha?: string;
  ativo?: boolean;
}

// ------------------------------------------
// AUDITORIA (LOG DE OPERAÇÕES CRÍTICAS)
// ------------------------------------------
export interface AuditLog {
  id: string;
  usuario: string;
  cargo: string;
  acao: string;
  dataHora: string;
  dispositivo: string;
  detalhes: string;
  pedidoNumero?: number;
  valorEnvolvido?: number;
}

// ------------------------------------------
// FINANCEIRO GERENCIAL
// ------------------------------------------
export type FinancialEntryType = 'receita' | 'despesa';

export interface FinancialEntry {
  id: string;
  tipo: FinancialEntryType;
  descricao: string;
  categoria: 'Vendas' | 'Fornecedores' | 'Folha de Pagamento' | 'Aluguel' | 'Energia e Água' | 'Manutenção' | 'Marketing' | 'Impostos' | 'Outros';
  centroCusto: 'Operação Restaurante' | 'Cozinha' | 'Delivery' | 'Administrativo';
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  formaPagamentoPrevista?: string;
  observacoes?: string;
}

// ------------------------------------------
// IMPRESSORAS & ROTEAMENTO
// ------------------------------------------
export type PrinterType = 'rede' | 'usb' | 'bluetooth';

export interface PrinterRoutingRule {
  categoria: CategoryType;
  estacao: KitchenStation;
  impressoraId: string;
}

export interface PrinterDevice {
  id: string;
  nome: string;
  tipo: PrinterType;
  local: string; // ex: 'Cozinha Chapa', 'Balcão Caixa', 'Bar'
  ip: string;
  porta: number;
  modelo: string;
  larguraPapel: '80mm' | '58mm';
  status: 'online' | 'offline' | 'erro';
  ativa: boolean;
  impressoraReservaId?: string;
  ultimaImpressao?: string;
  itensNaFila: number;
}

export type ThermalPrinter = PrinterDevice;

export interface PrintJob {
  id: string;
  impressoraId: string;
  impressoraNome: string;
  pedidoNumero: number;
  titulo: string;
  conteudoTexto: string;
  status: 'sucesso' | 'pendente' | 'falha';
  dataHora: string;
  tentativas: number;
}

// ------------------------------------------
// ALERTAS DA OPERAÇÃO
// ------------------------------------------
export interface SystemAlert {
  id: string;
  tipo: 'estoque_baixo' | 'validade_proxima' | 'pedido_atrasado' | 'impressora_offline' | 'caixa_diferenca' | 'cancelamento_alto' | 'sem_ficha_tecnica';
  titulo: string;
  mensagem: string;
  gravidade: 'alta' | 'media' | 'baixa';
  horario: string;
  lida: boolean;
  linkAcao?: string;
}

// ------------------------------------------
// CONFIGURAÇÕES GLOBAIS E PARÂMETROS SAAS
// ------------------------------------------
export interface SaasPlanInfo {
  nome: string;
  status: 'ativo' | 'trial' | 'expirado';
  validade: string;
  limiteMesas: number;
  limiteComandas: number;
  modulosHabilitados: string[];
  versaoSistema: string;
  unidadeAtual: string;
  cnpjFranqueadora?: string;
  // Alias do formulário de configurações/licenciamento.
  plano?: string;
  validadeLicenca?: string;
  licencaKey?: string;
  modulosAtivos?: Record<string, boolean>;
}

export interface RestaurantSettings {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  mensagemCupom: string;
  quantidadeMesas?: number;
  taxaServico: number;
  fechamentoCego: boolean;
  tempoAlertaAmarelo: number;
  tempoAlertaVermelho: number;
  exigirJustificativaCancelamento: boolean;
  exigirJustificativaDesconto: boolean;
  saas: SaasPlanInfo;
  // Parâmetros operacionais usados pelas telas de Caixa, Cozinha e Segurança.
  taxaServicoPadrao?: number;
  limiteSangriaAlerta?: number;
  tempoAlertaAmareloMinutos?: number;
  tempoAlertaVermelhoMinutos?: number;
  agruparItensIguaisKDS?: boolean;
  bloquearEstornoSemGerente?: boolean;
}

// ------------------------------------------
// FORMAS DE PAGAMENTO MANUAIS (ADMIN)
// ------------------------------------------
export interface ManualPaymentOption {
  id: PaymentMethodId;
  nome: string;
  ativo: boolean;
  permiteTroco: boolean;
  taxaOperacional?: number; // Informativo gerencial
  tipoManual?: PaymentMethodId;
  geraTroco?: boolean;
  instrucaoOperador?: string;
}

// ------------------------------------------
// NAVEGAÇÃO PRINCIPAL DO SISTEMA
// ------------------------------------------
export type AppModule = 
  | 'dashboard'
  | 'pedidos'
  | 'pdv'
  | 'mesas'
  | 'comandas'
  | 'caixa'
  | 'kds'
  | 'cardapio'
  | 'estoque'
  | 'compras'
  | 'fornecedores'
  | 'delivery'
  | 'clientes'
  | 'funcionarios'
  | 'financeiro'
  | 'relatorios'
  | 'impressoras'
  | 'configuracoes'
  | 'auditoria';
