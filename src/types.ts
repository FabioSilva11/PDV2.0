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
  mesaNumero?: number;
  /** Sessão da mesa: uma mesa pode receber vários pedidos sequenciais (ex.: 1.0, 1.1, 1.2). */
  mesaSessaoId?: string;
  mesaSessaoNumero?: number;
  mesaPedidoSequencia?: number;
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
export type PermissionKey = 'pdv' | 'pedidos' | 'mesas' | 'caixa' | 'cardapio' | 'clientes' | 'reservas' | 'desconto' | 'cancelamento' | 'reabertura' | 'auditoria' | 'usuarios' | 'impressoras' | 'configuracoes';
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
  status: TableStatus;
  garcomResponsavel?: string;
  clienteNome?: string;
  abertaEm?: string;
  pedidoAtivoId?: string;
  /** Identifica a sessão aberta atualmente; os pedidos antigos continuam no histórico. */
  sessaoAtivaId?: string;
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
