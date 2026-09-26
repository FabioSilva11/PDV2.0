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

export interface ProductAddon {
  id: string;
  nome: string;
  preco: number;
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

export type MenuCatalog = 'restaurante' | 'lanche';

export interface MenuCategory {
  id: string;
  nome: string;
  catalogos: MenuCatalog[];
  ordem: number;
  ativo: boolean;
}

export interface MenuItem {
  id: string;
  codigo?: string;
  catalogo?: MenuCatalog;
  nome: string;
  descricao?: string;
  imagem?: string;
  categoria: CategoryType;
  categoriaId?: string;
  preco: number;
  custoEstimado?: number;
  disponivel: boolean;
  tamanho?: string;
  acompanhamentos?: string[];
  variacoes?: ProductVariation[];
  gruposAdicionais?: ProductAddonGroup[];
  remocoesDisponiveis?: string[]; // ex: ["Sem cebola", "Sem tomate", "Sem molho"]
  estacaoProducao?: KitchenStation;
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
  acompanhamentosEscolhidos?: string[];
  segundoSaborNome?: string; // Para pizza meio a meio
  segundoSaborPreco?: number;
}

// ------------------------------------------
// PEDIDOS & CANAIS
// ------------------------------------------
export type OrderType = 'mesa' | 'balcao' | 'delivery';

export type OrderStatus = 'novo' | 'pronto' | 'entregue' | 'finalizado' | 'cancelado';

// ---------------------------------------------------------------------------
// CONTA / CHECK (atendimento financeiro)
//
// A Conta é a unidade financeiro do atendimento. Ela é diferente da Mesa
// (ocupação física) e do Lançamento/Order (pedido). Regras do projeto:
//
//   MESA  -> ocupação física ATUAL (pode estar livre com conta aberta)
//   CONTA -> atendimento financeiro (aberta / paga / encerrada)
//   ORDER -> lançamento (0.1, 0.2, 0.3...) que PERTENCE a uma conta
//   PAGAMENTO -> baixa financeira independente do espelho
//
// O espelho conclui o PREPARO do lançamento e pode liberar a ocupação da mesa.
// Ele nunca paga, nunca encerra a conta e nunca apaga histórico.
// ---------------------------------------------------------------------------
export type AccountStatus = 'aberta' | 'paga' | 'encerrada';

export type AccountOrigin = 'mesa' | 'balcao' | 'delivery' | 'split' | 'merge' | 'migracao';

export interface AccountClosure {
  usuario: string;
  dataHora: string;
  motivo?: string;
}

export interface Account {
  id: string;
  /** Número comercial da conta (ex.: 0, 1, 2...). */
  numero: number;
  tipo: OrderType;
  nomeCliente?: string;
  telefoneCliente?: string;
  /** Mesa onde a conta foi aberta — preservada mesmo após transferência. */
  mesaOriginalId?: string;
  mesaOriginalNumero?: number;
  /** Mesa atualmente associada. Ausente = conta sem mesa (histórico/libre). */
  mesaAtualId?: string;
  mesaAtualNumero?: number;
  status: AccountStatus;
  abertaEm: string;
  pagaEm?: string;
  encerradaEm?: string;
  encerramento?: AccountClosure;
  /** Soma dos lançamentos (exclui cancelados). */
  total: number;
  valorPago: number;
  saldoRestante: number;
  origem: AccountOrigin;
  /** Conta de origem em split/merge. Nunca apagada. */
  contaPaiId?: string;
  contaFilhaId?: string;
  observacoes?: string;
  criadaPor?: string;
  /** @deprecated legado: use contaId. */
  mesaSessaoId?: string;
  /** @deprecated legado: use numero. */
  mesaSessaoNumero?: number;
}

/** Dados de abertura de um novo atendimento financeiro (conta). */
export interface CreateAccountInput extends Partial<Omit<Account, 'tipo'>> {
  tipo?: OrderType;
  /** Atalho: abre/junta a conta a uma mesa existente. */
  mesaNumero?: number;
  /** Atalho: pessoas sentadas na mesa de abertura. */
  pessoas?: number;
}

/**
 * Entrada de criação de LANÇAMENTO.
 * `novaConta` é a marca de que o operador ESCOLHEU "Criar novo atendimento":
 * é o único jeito de abrir uma conta nova — nunca uma consequência automática
 * de a mesa ter sido liberada pelo espelho.
 */
export interface CreateOrderInput extends Partial<Order> {
  novaConta?: boolean;
}

/** Critérios de busca de contas/checks (nº conta, lançamento, mesa, cliente, valor, status). */
export interface AccountSearchFilters {
  texto?: string;
  contaNumero?: number;
  /** Número do lançamento dentro da conta (1, 2, 3...). */
  sequencia?: number;
  mesaNumero?: number;
  status?: AccountStatus | 'todas';
  /** Faixa do saldo restante. */
  valorMin?: number;
  valorMax?: number;
  somenteComSaldo?: boolean;
}

/** Divisão de conta: itens escolhidos vão para uma nova conta filha. */
export interface AccountSplitInput {
  contaId: string;
  /** Itens (cartItemId) que migram para a nova conta. */
  itemIds: string[];
  nomeCliente?: string;
}

export interface AccountSplitResult {
  contaOrigemId: string;
  contaNovaId: string;
  contaNovaNumero: number;
  lancamentosOrigem: string[];
  lancamentosNovos: string[];
}

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

export interface PrintBatch {
  grupoId: string;
  pedidoJobId?: string;
  pedidoJobIds?: string[];
  pedidoGeradoEm?: string;
  espelhoJobId?: string;
  espelhoJobIds?: string[];
  espelhoGeradoEm?: string;
  tipoOperacao: 'pedido_inicial' | 'pedido_adicional';
  /** IDs dos itens cobertos por esta dupla de vias (pedido + espelho). */
  itemIds?: string[];
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
  // ---------------------------------------------------------------------
  // Conta (check) a que este lançamento pertence. Fonte de verdade.
  // ---------------------------------------------------------------------
  contaId?: string;
  contaNumero?: number;
  /** Sequência do lançamento dentro da conta: 1, 2, 3... (nunca reinicia). */
  sequencia?: number;
  /** Código exibido ao operador: `${contaNumero}.${sequencia}` (ex.: 0.1). */
  codigoExibicao?: string;
  /** Mesa histórica/original do lançamento. */
  mesaNumero?: number;
  mesaOriginalNumero?: number;
  /** @deprecated legado: use contaId. Uma conta pode receber vários lançamentos. */
  mesaSessaoId?: string;
  /** @deprecated legado: use contaNumero. */
  mesaSessaoNumero?: number;
  /** @deprecated legado: use sequencia. */
  mesaPedidoSequencia?: number;
  /** @deprecated legado: use codigoExibicao. */
  codigoMesa?: string;
  garcomNome?: string;
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
  impressoes?: PrintBatch[];
}

// ------------------------------------------
// MESAS & SALÃO
// ------------------------------------------
export type TableStatus = 'livre' | 'ocupada' | 'reservada' | 'conta' | 'fechando';

export interface Customer { id: string; nome: string; telefone?: string; cpf?: string; endereco?: string; observacoes?: string; criadoEm: string; ultimoPedidoEm?: string; totalComprado?: number; }
export type ReservationStatus = 'reservada' | 'confirmada' | 'chegou' | 'cancelada' | 'finalizada';
export interface Reservation { id: string; clienteId?: string; clienteNome: string; telefone?: string; mesaNumero?: number; dataHora: string; pessoas: number; status: ReservationStatus; observacao?: string; criadoPor: string; }
export type UserRole = 'administrador' | 'gerente' | 'caixa' | 'garcom';
export type PermissionKey = 'pdv' | 'pedidos' | 'contas' | 'mesas' | 'caixa' | 'cardapio' | 'clientes' | 'reservas' | 'desconto' | 'cancelamento' | 'reabertura' | 'auditoria' | 'usuarios' | 'impressoras' | 'configuracoes';
export interface UserAccount {
  id: string;
  nome: string;
  usuario: string;
  /** Hash da senha (PBKDF2). NUNCA armazenar senha em texto puro. */
  senhaHash?: string;
  cargo: string;
  perfil: UserRole;
  ativo: boolean;
  /** Exatamente um usuário do sistema pode ter isPrimaryAdmin = true. */
  isPrimaryAdmin?: boolean;
  permissoes: PermissionKey[];
  criadoEm?: string;
  lastLoginAt?: string;
}
export interface AuditLog { id: string; dataHora: string; usuarioId: string; usuarioNome: string; acao: string; entidade: string; entidadeId?: string; detalhes?: string; }

export interface Table {
  id: string;
  numero: number;
  capacidade: number;
  /** Estado físico da mesa. NÃO deriva de saldo de pedidos históricos. */
  status: TableStatus;
  garcomResponsavel?: string;
  clienteNome?: string;
  abertaEm?: string;
  pedidoAtivoId?: string;
  /**
   * Conta atualmente ocupando a mesa. Enquanto existir, a mesa está ocupada.
   * Liberar a mesa limpa este campo — a conta continua existindo.
   */
  contaAtualId?: string;
  contaAtualNumero?: number;
  /** Última conta usada nesta mesa. Apenas histórico: NÃO é ocupação atual. */
  ultimaContaId?: string;
  ultimaContaNumero?: number;
  /** @deprecated legado: use contaAtualId. */
  sessaoAtivaId?: string;
  /** @deprecated legado: use contaAtualNumero. */
  sessaoNumero?: number;
  valorAtual: number;
  pessoasSentadas?: number;
  // Posicionamento no editor visual
  posX: number;
  posY: number;
  formato: 'quadrada' | 'redonda' | 'retangular';
  setor: 'Salão Principal' | 'Varanda' | 'Deck Externo' | 'Mezanino';
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
// IMPRESSORAS & ROTEAMENTO
// ------------------------------------------
export type PrinterType = 'rede' | 'usb' | 'bluetooth';

export type PrinterPurpose = 'pedido' | 'espelho' | 'comprovante' | 'geral';
export type PrintRouteDocument = 'pedido' | 'espelho' | 'comprovante';
export type PrintRouteMode = 'incluir';

export interface PrinterRouteRule {
  id: string;
  nome: string;
  documentos: PrintRouteDocument[];
  catalogos: MenuCatalog[];
  tiposPedido: OrderType[];
  /** @deprecated legado: usar categoriaIds */
  categorias?: CategoryType[];
  /** IDs de MenuCategory (fonte de verdade para roteamento). */
  categoriaIds?: string[];
  estacoes: KitchenStation[];
  prioridade: number;
  modo: PrintRouteMode;
  ativo: boolean;
}

export interface PrinterDevice {
  id: string;
  nome: string;
  tipo: PrinterType;
  local: string; // ex: 'Cozinha', 'Balcão Caixa', 'Bar'
  finalidade: PrinterPurpose;
  regras?: PrinterRouteRule[];
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
  pedidoId?: string;
  grupoImpressaoId?: string;
  tipo: 'pedido' | 'espelho' | 'comprovante' | 'teste';
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
// CONFIGURAÇÃO ÚNICA DO ESTABELECIMENTO
// Fonte de verdade dos dados de identidade e operação.
// Nenhum componente deve conter dados de negócio fixos.
// ------------------------------------------
export interface RestaurantSettings {
  id: 'singleton';
  // Identidade
  nomeFantasia: string;
  razaoSocial: string;
  nomeCurto: string;
  cnpj: string;
  inscricaoEstadual: string;
  telefone: string;
  email: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  logo?: string;
  // Branding / exibição
  nomeAplicacao: string;
  versaoExibida: string;
  rodapeComprovante: string;
  moeda: string;
  locale: string;
  // PIX
  pix: {
    chave: string;
    nomeRecebedor: string;
    cidade: string;
    descricao: string;
  };
  // Configurações operacionais configuráveis
  delivery: {
    /** Taxa de entrega padrão sugerida no PDV. 0 = sem taxa fixa. */
    defaultFee: number;
  };
  cashier: {
    /** Botões de valor rápido no pagamento em dinheiro. */
    quickAmounts: number[];
  };
  operations: {
    /** Minutos para considerar um pedido atrasado. */
    lateOrderThresholdMinutes: number;
    /** Janela operacional do dashboard (horas). */
    dashboardStartHour: number;
    dashboardEndHour: number;
    /** Quantidade de produtos no ranking do dashboard. */
    topProductsLimit: number;
  };
  reservations: {
    defaultGuests: number;
    defaultAdvanceMinutes: number;
  };
  /** Marca que o assistente de primeira execução foi concluído. */
  setupComplete: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ------------------------------------------
// ALERTAS DA OPERAÇÃO
// ------------------------------------------
export interface SystemAlert {
  id: string;
  tipo: 'pedido_atrasado' | 'impressora_offline' | 'caixa_diferenca' | 'cancelamento_alto';
  titulo: string;
  mensagem: string;
  gravidade: 'alta' | 'media' | 'baixa';
  horario: string;
  lida: boolean;
  linkAcao?: string;
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
  | 'contas'
  | 'pdv'
  | 'mesas'
  | 'caixa'
  | 'cardapio'
  | 'impressoras'
  | 'clientes'
  | 'reservas'
  | 'usuarios'
  | 'auditoria'
  | 'configuracoes';

// ==========================================
// PATCH DE EDIÇÃO DE PEDIDO
// Campos que podem ser alterados via editOrder().
// id, numero, status, impressoes e pagamentos
// são imutáveis por esta interface.
// ==========================================
export interface OrderEditPatch {
  /** Nome do cliente (balcão/delivery) */
  nomeCliente?: string;
  /** Telefone de contato */
  telefoneCliente?: string;
  /** Endereço de entrega (somente tipo 'delivery') */
  enderecoEntrega?: Order['enderecoEntrega'];
  /** Observações gerais do pedido */
  observacoesGerais?: string;
  /** Taxa de entrega (somente tipo 'delivery') */
  taxaEntrega?: number;
  /**
   * Lista completa de itens substituindo a atual.
   * O chamador é responsável por passar CartItems válidos
   * (com cartItemId, precoUnitario, quantidade, estacaoProducao).
   */
  itens?: CartItem[];
}
