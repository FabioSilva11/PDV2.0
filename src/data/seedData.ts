import { 
  MenuItem, 
  Table, 
  Order, 
  Comanda, 
  Courier, 
  PrinterDevice, 
  PrinterRoutingRule, 
  SystemAlert, 
  ManualPaymentOption, 
  CashRegister
} from '../types';
import { INITIAL_MENU_ITEMS } from './initialMenu';

export const INITIAL_MANUAL_PAYMENTS: ManualPaymentOption[] = [
  { id: 'dinheiro', nome: 'Dinheiro em Espécie', ativo: true, permiteTroco: true },
  { id: 'pix', nome: 'Pix (Informado Manualmente)', ativo: true, permiteTroco: false },
  { id: 'debito', nome: 'Cartão de Débito (POS Físico)', ativo: true, permiteTroco: false },
  { id: 'credito', nome: 'Cartão de Crédito (POS Físico)', ativo: true, permiteTroco: false },
  { id: 'vale_refeicao', nome: 'Vale-Refeição (VR / Sodexo / Ticket)', ativo: true, permiteTroco: false },
  { id: 'vale_alimentacao', nome: 'Vale-Alimentação (VA)', ativo: true, permiteTroco: false },
  { id: 'cortesia', nome: 'Cortesia da Casa / Gerência', ativo: true, permiteTroco: false },
  { id: 'fiado', nome: 'Fiado / Convênio Corporativo', ativo: true, permiteTroco: false },
  { id: 'outro', nome: 'Outro Meio Manual', ativo: true, permiteTroco: false },
];

const LEGACY_INITIAL_MENU: MenuItem[] = [
  {
    id: 'prod-1',
    codigo: 'BUR01',
    nome: 'Burguer Clássico Murupi',
    descricao: 'Blend bovino 180g na chapa, queijo cheddar inglês derretido, cebola caramelizada e maionese defumada no pão brioche.',
    categoria: 'Hambúrgueres',
    preco: 36.00,
    custoEstimado: 12.80,
    disponivel: true,
    estacaoProducao: 'chapa',
    
    remocoesDisponiveis: ['Sem cebola caramelizada', 'Sem queijo cheddar', 'Sem maionese defumada'],
    gruposAdicionais: [
      {
        id: 'grp-1',
        nome: 'Turbine seu lanche',
        minimo: 0,
        maximo: 3,
        obrigatorio: false,
        opcoes: [
          { id: 'add-1', nome: 'Bacon crocante extra', preco: 6.00 },
          { id: 'add-2', nome: 'Queijo cheddar duplo', preco: 5.00 },
          { id: 'add-3', nome: 'Ovo frito caipira', preco: 4.00 },
          { id: 'add-4', nome: 'Picles de pepino artesanal', preco: 3.50 }
        ]
      }
    ]
  },
  {
    id: 'prod-2',
    codigo: 'BUR02',
    nome: 'Burguer Bacon Monster',
    descricao: 'Dois hambúrgueres artesanais 180g, camadas generosas de bacon crocante, barbecue rústico e cheddar cremoso.',
    categoria: 'Hambúrgueres',
    preco: 46.00,
    custoEstimado: 18.50,
    disponivel: true,
    estacaoProducao: 'chapa',
    
    remocoesDisponiveis: ['Sem barbecue', 'Sem molho cheddar'],
    gruposAdicionais: [
      {
        id: 'grp-2',
        nome: 'Ponto da Carne',
        minimo: 1,
        maximo: 1,
        obrigatorio: true,
        opcoes: [
          { id: 'pt-1', nome: 'Ao ponto para mal', preco: 0.00 },
          { id: 'pt-2', nome: 'Ao ponto da casa', preco: 0.00 },
          { id: 'pt-3', nome: 'Bem passado', preco: 0.00 }
        ]
      }
    ]
  },
  {
    id: 'prod-3',
    codigo: 'PIZ01',
    nome: 'Pizza Calabresa Especial & Cebola Roxa',
    descricao: 'Massa de fermentação lenta 48h, molho pelati italiano, muçarela premium, fatias de calabresa defumada e orégano fresco.',
    categoria: 'Pizzas',
    preco: 62.00,
    custoEstimado: 17.00,
    disponivel: true,
    estacaoProducao: 'pizza',
    
    permiteMeioAMeio: true,
    variacoes: [
      { id: 'piz-var-m', nome: 'Média (6 fatias)', preco: 54.00, custoEstimado: 14.00 },
      { id: 'piz-var-g', nome: 'Grande (8 fatias)', preco: 64.00, custoEstimado: 17.50 },
      { id: 'piz-var-f', nome: 'Família (12 fatias)', preco: 78.00, custoEstimado: 22.00 }
    ],
    remocoesDisponiveis: ['Sem cebola roxa', 'Sem azeitonas pretas', 'Sem orégano']
  },
  {
    id: 'prod-4',
    codigo: 'PIZ02',
    nome: 'Pizza Quatro Queijos Nobres',
    descricao: 'Muçarela, Catupiry legítimo, Gorgonzola cremoso e Parmesão gratinado com fios de azeite trufado.',
    categoria: 'Pizzas',
    preco: 68.00,
    custoEstimado: 21.00,
    disponivel: true,
    estacaoProducao: 'pizza',
    
    permiteMeioAMeio: true,
    variacoes: [
      { id: 'piz4-var-m', nome: 'Média (6 fatias)', preco: 60.00, custoEstimado: 17.00 },
      { id: 'piz4-var-g', nome: 'Grande (8 fatias)', preco: 72.00, custoEstimado: 21.50 }
    ]
  },
  {
    id: 'prod-5',
    codigo: 'PRT01',
    nome: 'Carne de Sol Chapeada Completa',
    descricao: 'Carne de sol maturada e grelhada na manteiga de garrafa, acompanhada de baião de dois, macaxeira frita, paçoca e vinagrete.',
    categoria: 'Pratos principais',
    preco: 84.00,
    custoEstimado: 26.50,
    disponivel: true,
    estacaoProducao: 'cozinha',
    
    tamanho: 'Para 2 a 3 pessoas'
  },
  {
    id: 'prod-6',
    codigo: 'PRT02',
    nome: 'Filé Parmegiana ao Molho Rústico',
    descricao: 'Filé mignon bovino empanado e gratinado com molho de tomates frescos e muçarela, acompanhado de arroz e batatas rústicas.',
    categoria: 'Pratos principais',
    preco: 72.00,
    custoEstimado: 24.00,
    disponivel: true,
    estacaoProducao: 'cozinha',
    
    variacoes: [
      { id: 'parm-1', nome: 'Individual', preco: 48.00, custoEstimado: 16.00 },
      { id: 'parm-2', nome: 'Para 2 pessoas', preco: 78.00, custoEstimado: 25.50 }
    ]
  },
  {
    id: 'prod-7',
    codigo: 'POR01',
    nome: 'Dadinhos de Tapioca com Geleia de Pimenta',
    descricao: '12 dadinhos crocantes de queijo coalho e tapioca granulada com geleia caseira picante.',
    categoria: 'Entradas',
    preco: 32.00,
    custoEstimado: 9.50,
    disponivel: true,
    estacaoProducao: 'cozinha',
    
  },
  {
    id: 'prod-8',
    codigo: 'POR02',
    nome: 'Batata Rústica com Cheddar e Bacon',
    descricao: '400g de batatas selecionadas, temperadas com páprica e sal grosso, cobertas com molho cheddar e farofa de bacon.',
    categoria: 'Porções Extras',
    preco: 34.00,
    custoEstimado: 10.20,
    disponivel: true,
    estacaoProducao: 'chapa',
    
  },
  {
    id: 'prod-9',
    codigo: 'BEB01',
    nome: 'Chopp Pilsen Artesanal 500ml',
    descricao: 'Chopp puro malte servido na caneca ultracongelada.',
    categoria: 'Bebidas',
    preco: 14.00,
    custoEstimado: 4.20,
    disponivel: true,
    estacaoProducao: 'bar',
    
  },
  {
    id: 'prod-10',
    codigo: 'BEB02',
    nome: 'Suco Natural de Cupuaçu 500ml',
    descricao: 'Fruta fresca batida na hora com ou sem açúcar.',
    categoria: 'Sucos de Frutas',
    preco: 12.00,
    custoEstimado: 3.50,
    disponivel: true,
    estacaoProducao: 'bar',
    
    remocoesDisponiveis: ['Sem açúcar', 'Pouco gelo', 'Sem gelo']
  },
  {
    id: 'prod-11',
    codigo: 'BEB03',
    nome: 'Refrigerante Lata 350ml',
    descricao: 'Coca-Cola, Guaraná Antarctica ou Zero Açúcar.',
    categoria: 'Bebidas',
    preco: 7.50,
    custoEstimado: 2.90,
    disponivel: true,
    estacaoProducao: 'bar',
    
  },
  {
    id: 'prod-12',
    codigo: 'SOB01',
    nome: 'Petit Gâteau de Chocolate Belga',
    descricao: 'Bolinho quente com recheio cremoso e bola de sorvete de baunilha com calda de frutas vermelhas.',
    categoria: 'Sobremesas',
    preco: 24.00,
    custoEstimado: 6.80,
    disponivel: true,
    estacaoProducao: 'sobremesa',
    
  },
  {
    id: 'prod-13',
    codigo: 'CMB01',
    nome: 'Combo Burguer + Fritas + Refrigerante',
    descricao: 'Burguer Clássico Murupi + Porção individual de fritas sequinhas + 1 Refrigerante lata.',
    categoria: 'Combos',
    preco: 48.00,
    custoEstimado: 16.50,
    disponivel: true,
    estacaoProducao: 'chapa',
    
  }
];

// O catálogo oficial do Murupi é mantido em initialMenu.ts. Sucos com volumes
// diferentes são agrupados em um único produto com variações de preço/status.
const juiceItems = INITIAL_MENU_ITEMS.filter(item => item.categoria === 'Sucos de Frutas');
const nonJuiceItems = INITIAL_MENU_ITEMS.filter(item => item.categoria !== 'Sucos de Frutas');
const groupedJuices: MenuItem[] = Array.from(new Map(juiceItems.map(item => [item.nome, item])).values()).map(item => ({
  ...item,
  tamanho: undefined,
  preco: 5,
  variacoes: [
    { id: `${item.id}-100`, nome: '100 ml', preco: 5, custoEstimado: 0, disponivel: true, quantidade: 100, unidade: 'ml' },
    { id: `${item.id}-200`, nome: '200 ml', preco: 6, custoEstimado: 0, disponivel: true, quantidade: 200, unidade: 'ml' },
    { id: `${item.id}-300`, nome: '300 ml', preco: 8, custoEstimado: 0, disponivel: true, quantidade: 300, unidade: 'ml' },
    { id: `${item.id}-400`, nome: '400 ml', preco: 10, custoEstimado: 0, disponivel: true, quantidade: 400, unidade: 'ml' }
  ]
}));
export const INITIAL_MENU: MenuItem[] = [...nonJuiceItems, ...groupedJuices];

export const INITIAL_TABLES: Table[] = [
  { id: 'tbl-1', numero: 1, capacidade: 4, status: 'ocupada', garcomResponsavel: 'Lucas Silva', clienteNome: 'Dr. Roberto', abertaEm: '2026-09-10T11:45:00', valorAtual: 148.00, pessoasSentadas: 3, posX: 30, posY: 40, formato: 'quadrada', setor: 'Salão Principal' },
  { id: 'tbl-2', numero: 2, capacidade: 4, status: 'conta', garcomResponsavel: 'Lucas Silva', clienteNome: 'Família Souza', abertaEm: '2026-09-10T11:20:00', valorAtual: 215.00, pessoasSentadas: 4, posX: 140, posY: 40, formato: 'quadrada', setor: 'Salão Principal' },
  { id: 'tbl-3', numero: 3, capacidade: 2, status: 'livre', posX: 250, posY: 40, formato: 'redonda', setor: 'Salão Principal', valorAtual: 0 },
  { id: 'tbl-4', numero: 4, capacidade: 6, status: 'ocupada', garcomResponsavel: 'Mariana Costa', clienteNome: 'Mesa da Diretoria', abertaEm: '2026-09-10T12:05:00', valorAtual: 340.00, pessoasSentadas: 5, posX: 30, posY: 140, formato: 'retangular', setor: 'Salão Principal' },
  { id: 'tbl-5', numero: 5, capacidade: 4, status: 'livre', posX: 140, posY: 140, formato: 'quadrada', setor: 'Salão Principal', valorAtual: 0 },
  { id: 'tbl-6', numero: 6, capacidade: 4, status: 'reservada', clienteNome: 'Reserva Aniversário Paula 19h', posX: 250, posY: 140, formato: 'quadrada', setor: 'Salão Principal', valorAtual: 0 },
  { id: 'tbl-7', numero: 7, capacidade: 2, status: 'livre', posX: 30, posY: 240, formato: 'redonda', setor: 'Salão Principal', valorAtual: 0 },
  { id: 'tbl-8', numero: 8, capacidade: 8, status: 'ocupada', garcomResponsavel: 'Mariana Costa', clienteNome: 'Turma do Futebol', abertaEm: '2026-09-10T11:55:00', valorAtual: 420.00, pessoasSentadas: 7, posX: 140, posY: 240, formato: 'retangular', setor: 'Salão Principal' },
  { id: 'tbl-9', numero: 9, capacidade: 4, status: 'livre', posX: 370, posY: 40, formato: 'quadrada', setor: 'Varanda', valorAtual: 0 },
  { id: 'tbl-10', numero: 10, capacidade: 4, status: 'ocupada', garcomResponsavel: 'Lucas Silva', clienteNome: 'Juliana e Amigas', abertaEm: '2026-09-10T12:15:00', valorAtual: 86.00, pessoasSentadas: 2, posX: 480, posY: 40, formato: 'quadrada', setor: 'Varanda' },
  { id: 'tbl-11', numero: 11, capacidade: 2, status: 'livre', posX: 370, posY: 140, formato: 'redonda', setor: 'Varanda', valorAtual: 0 },
  { id: 'tbl-12', numero: 12, capacidade: 4, status: 'fechando', garcomResponsavel: 'Mariana Costa', clienteNome: 'Casal Barreto', abertaEm: '2026-09-10T11:30:00', valorAtual: 110.00, pessoasSentadas: 2, posX: 480, posY: 140, formato: 'quadrada', setor: 'Varanda' },
  { id: 'tbl-13', numero: 13, capacidade: 6, status: 'livre', posX: 30, posY: 350, formato: 'retangular', setor: 'Deck Externo', valorAtual: 0 },
  { id: 'tbl-14', numero: 14, capacidade: 4, status: 'livre', posX: 150, posY: 350, formato: 'quadrada', setor: 'Deck Externo', valorAtual: 0 },
  { id: 'tbl-15', numero: 15, capacidade: 4, status: 'livre', posX: 270, posY: 350, formato: 'quadrada', setor: 'Deck Externo', valorAtual: 0 },
  { id: 'tbl-16', numero: 16, capacidade: 2, status: 'livre', posX: 390, posY: 350, formato: 'redonda', setor: 'Deck Externo', valorAtual: 0 }
];

export const INITIAL_COMANDAS: Comanda[] = [
  {
    id: 'cmd-1',
    numero: 101,
    clienteNome: 'Dr. Roberto',
    clienteTelefone: '(11) 98765-4321',
    mesaNumero: 1,
    limiteConsumo: 300.00,
    abertaEm: '2026-09-10T11:45:00',
    status: 'aberta',
    garcomNome: 'Lucas Silva',
    pagamentoStatus: 'pendente',
    total: 148.00,
    itens: [
      { cartItemId: 'c1', menuItemId: 'prod-1', nome: 'Burguer Clássico Murupi', precoUnitario: 36.00, quantidade: 2, adicionais: [{ grupoId: 'grp-1', addonId: 'add-1', nome: 'Bacon crocante extra', preco: 6.00 }], remocoes: [], observacao: 'Pão bem selado', estacaoProducao: 'chapa' },
      { cartItemId: 'c2', menuItemId: 'prod-9', nome: 'Chopp Pilsen Artesanal 500ml', precoUnitario: 14.00, quantidade: 5, adicionais: [], remocoes: [], observacao: 'Caneca bem gelada', estacaoProducao: 'bar' }
    ]
  },
  {
    id: 'cmd-2',
    numero: 102,
    clienteNome: 'Mariana Lima (Comanda Individual)',
    clienteTelefone: '(11) 99123-8877',
    mesaNumero: 1, // Segunda comanda na mesa 1!
    limiteConsumo: 150.00,
    abertaEm: '2026-09-10T12:00:00',
    status: 'aberta',
    garcomNome: 'Lucas Silva',
    pagamentoStatus: 'pendente',
    total: 44.00,
    itens: [
      { cartItemId: 'c3', menuItemId: 'prod-7', nome: 'Dadinhos de Tapioca com Geleia de Pimenta', precoUnitario: 32.00, quantidade: 1, adicionais: [], remocoes: [], observacao: '', estacaoProducao: 'cozinha' },
      { cartItemId: 'c4', menuItemId: 'prod-10', nome: 'Suco Natural de Cupuaçu 500ml', precoUnitario: 12.00, quantidade: 1, adicionais: [], remocoes: ['Sem açúcar'], observacao: '', estacaoProducao: 'bar' }
    ]
  },
  {
    id: 'cmd-3',
    numero: 205,
    clienteNome: 'Carlos Eduardo (Balcão Rápido)',
    limiteConsumo: 200.00,
    abertaEm: '2026-09-10T12:20:00',
    status: 'aberta',
    garcomNome: 'Ana Paula (Caixa)',
    pagamentoStatus: 'pendente',
    total: 48.00,
    itens: [
      { cartItemId: 'c5', menuItemId: 'prod-13', nome: 'Combo Burguer + Fritas + Refrigerante', precoUnitario: 48.00, quantidade: 1, adicionais: [], remocoes: [], observacao: 'Refrigerante Coca Zero', estacaoProducao: 'chapa' }
    ]
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    numero: 1001,
    tipo: 'mesa',
    mesaNumero: 2,
    garcomNome: 'Lucas Silva',
    canal: 'Salão',
    criadoEm: '2026-09-10T11:20:00',
    status: 'pronto',
    statusPagamento: 'pendente',
    subtotal: 215.00,
    desconto: 0,
    taxaServico: 0,
    taxaEntrega: 0,
    total: 215.00,
    valorTotalPago: 0,
    saldoRestante: 215.00,
    pagamentos: [],
    itens: [
      { cartItemId: 'it-1', menuItemId: 'prod-5', nome: 'Carne de Sol Chapeada Completa', precoUnitario: 84.00, quantidade: 1, adicionais: [], remocoes: [], observacao: 'Manteiga de garrafa à parte', estacaoProducao: 'cozinha', statusProducao: 'pronto' },
      { cartItemId: 'it-2', menuItemId: 'prod-3', nome: 'Pizza Calabresa Especial', variacaoNome: 'Grande (8 fatias)', precoUnitario: 64.00, quantidade: 1, adicionais: [], remocoes: ['Sem cebola roxa'], observacao: 'Bem dourada', estacaoProducao: 'pizza', statusProducao: 'pronto' },
      { cartItemId: 'it-3', menuItemId: 'prod-9', nome: 'Chopp Pilsen Artesanal 500ml', precoUnitario: 14.00, quantidade: 4, adicionais: [], remocoes: [], observacao: '', estacaoProducao: 'bar', statusProducao: 'pronto' },
      { cartItemId: 'it-4', menuItemId: 'prod-11', nome: 'Refrigerante Lata 350ml', precoUnitario: 7.50, quantidade: 1, adicionais: [], remocoes: [], observacao: 'Guaraná Zero', estacaoProducao: 'bar', statusProducao: 'pronto' }
    ]
  },
  {
    id: 'ord-1002',
    numero: 1002,
    tipo: 'delivery',
    clienteId: 'cli-1',
    nomeCliente: 'Julio Cesar Santos',
    telefoneCliente: '(11) 98765-0011',
    canal: 'WhatsApp',
    enderecoEntrega: {
      logradouro: 'Rua das Palmeiras',
      numero: '450',
      bairro: 'Jardins',
      complemento: 'Apto 82 Bloco B',
      pontoReferencia: 'Próximo ao Parque Central'
    },
    taxaEntrega: 8.00,
    subtotal: 106.00,
    desconto: 6.00,
    descontoMotivo: 'Cupom de fidelidade WhatsApp',
    taxaServico: 0,
    total: 108.00,
    criadoEm: '2026-09-10T12:05:00',
    previsaoEntrega: '2026-09-10T12:45:00',
    status: 'em_preparacao',
    statusPagamento: 'pago',
    valorTotalPago: 108.00,
    saldoRestante: 0,
    prioridade: 'normal',
    entregadorNome: 'Diego Motoboy',
    pagamentos: [
      {
        id: 'pg-1',
        formaId: 'pix',
        formaNome: 'Pix (Informado Manualmente)',
        valor: 108.00,
        dataHora: '2026-09-10T12:06:15',
        registradoPor: 'Ana Paula (Caixa)',
        observacao: 'Cliente enviou comprovante no WhatsApp às 12h06'
      }
    ],
    itens: [
      { cartItemId: 'it-5', menuItemId: 'prod-2', nome: 'Burguer Bacon Monster', precoUnitario: 46.00, quantidade: 2, adicionais: [{ grupoId: 'grp-2', addonId: 'pt-2', nome: 'Ao ponto da casa', preco: 0 }], remocoes: [], observacao: 'Cortar ao meio', estacaoProducao: 'chapa', statusProducao: 'preparando' },
      { cartItemId: 'it-6', menuItemId: 'prod-11', nome: 'Refrigerante Lata 350ml', precoUnitario: 7.50, quantidade: 2, adicionais: [], remocoes: [], observacao: '1 Coca normal, 1 Coca Zero', estacaoProducao: 'bar', statusProducao: 'pronto' }
    ]
  },
  {
    id: 'ord-1003',
    numero: 1003,
    tipo: 'balcao',
    nomeCliente: 'Beatriz Martins',
    canal: 'Balcão',
    criadoEm: '2026-09-10T12:18:00',
    status: 'novo',
    statusPagamento: 'pendente',
    subtotal: 48.00,
    desconto: 0,
    taxaServico: 0,
    taxaEntrega: 0,
    total: 48.00,
    valorTotalPago: 0,
    saldoRestante: 48.00,
    pagamentos: [],
    prioridade: 'urgente',
    itens: [
      { cartItemId: 'it-7', menuItemId: 'prod-13', nome: 'Combo Burguer + Fritas + Refrigerante', precoUnitario: 48.00, quantidade: 1, adicionais: [], remocoes: ['Sem cebola'], observacao: 'Cliente tem pressa', estacaoProducao: 'chapa', statusProducao: 'pendente' }
    ]
  },
  {
    id: 'ord-1000',
    numero: 1000,
    tipo: 'mesa',
    mesaNumero: 7,
    garcomNome: 'Mariana Costa',
    canal: 'Salão',
    criadoEm: '2026-09-10T10:50:00',
    status: 'finalizado',
    statusPagamento: 'pago',
    subtotal: 120.00,
    desconto: 0,
    taxaServico: 12.00,
    taxaEntrega: 0,
    total: 132.00,
    valorTotalPago: 132.00,
    saldoRestante: 0,
    pagamentos: [
      {
        id: 'pg-2',
        formaId: 'dinheiro',
        formaNome: 'Dinheiro em Espécie',
        valor: 50.00,
        valorRecebido: 50.00,
        troco: 0,
        dataHora: '2026-09-10T11:40:10',
        registradoPor: 'Ana Paula (Caixa)',
        observacao: 'Parte em notas de R$ 50'
      },
      {
        id: 'pg-3',
        formaId: 'credito',
        formaNome: 'Cartão de Crédito (POS Físico)',
        valor: 82.00,
        dataHora: '2026-09-10T11:41:05',
        registradoPor: 'Ana Paula (Caixa)',
        observacao: 'Passado no cartão Nubank cliente'
      }
    ],
    itens: [
      { cartItemId: 'it-8', menuItemId: 'prod-6', nome: 'Filé Parmegiana ao Molho Rústico', variacaoNome: 'Para 2 pessoas', precoUnitario: 78.00, quantidade: 1, adicionais: [], remocoes: [], observacao: '', estacaoProducao: 'cozinha', statusProducao: 'pronto' },
      { cartItemId: 'it-9', menuItemId: 'prod-10', nome: 'Suco Natural de Cupuaçu 500ml', precoUnitario: 12.00, quantidade: 2, adicionais: [], remocoes: [], observacao: '', estacaoProducao: 'bar', statusProducao: 'pronto' },
      { cartItemId: 'it-10', menuItemId: 'prod-9', nome: 'Chopp Pilsen Artesanal 500ml', precoUnitario: 14.00, quantidade: 2, adicionais: [], remocoes: [], observacao: '', estacaoProducao: 'bar', statusProducao: 'pronto' }
    ]
  }
];

export const INITIAL_COURIERS: Courier[] = [
  { id: 'mot-1', nome: 'Diego Motoboy', telefone: '(11) 95332-6655', placaMoto: 'BRA-3K49', status: 'em_rota', entregasHoje: 7, totalGastoTaxas: 56.00 },
  { id: 'mot-2', nome: 'Thiago Pereira', telefone: '(11) 94221-7788', placaMoto: 'SPX-8H20', status: 'disponivel', entregasHoje: 5, totalGastoTaxas: 40.00 },
  { id: 'mot-3', nome: 'Marcelo Ribeiro', telefone: '(11) 93110-8899', placaMoto: 'FAL-1A55', status: 'disponivel', entregasHoje: 4, totalGastoTaxas: 32.00 }
];

export const INITIAL_PRINTERS: PrinterDevice[] = [
  { id: 'prn-1', nome: 'Impressora Cozinha / Chapa', tipo: 'rede', local: 'Cozinha Principal', ip: '192.168.1.120', porta: 9100, modelo: 'Epson TM-T20X', larguraPapel: '80mm', status: 'online', ativa: true, itensNaFila: 0, ultimaImpressao: '2026-09-10 12:18:12' },
  { id: 'prn-2', nome: 'Impressora Bar & Bebidas', tipo: 'rede', local: 'Balcão de Chopp & Sucos', ip: '192.168.1.121', porta: 9100, modelo: 'Bematech MP-4200 TH', larguraPapel: '80mm', status: 'online', ativa: true, itensNaFila: 0, ultimaImpressao: '2026-09-10 12:05:30' },
  { id: 'prn-3', nome: 'Impressora Balcão & Cupom Fiscal', tipo: 'rede', local: 'Frente de Caixa 01', ip: '192.168.1.122', porta: 9100, modelo: 'Epson TM-T88VI', larguraPapel: '80mm', status: 'online', ativa: true, itensNaFila: 0, ultimaImpressao: '2026-09-10 11:41:10' },
  { id: 'prn-4', nome: 'Impressora Forno de Pizzas', tipo: 'rede', local: 'Estação de Pizzas', ip: '192.168.1.123', porta: 9100, modelo: 'Daruma DR800', larguraPapel: '80mm', status: 'offline', ativa: true, itensNaFila: 1, impressoraReservaId: 'prn-1', ultimaImpressao: '2026-09-10 11:20:45' }
];

export const INITIAL_PRINTER_ROUTING: PrinterRoutingRule[] = [
  { categoria: 'Hambúrgueres', estacao: 'chapa', impressoraId: 'prn-1' },
  { categoria: 'Pratos principais', estacao: 'cozinha', impressoraId: 'prn-1' },
  { categoria: 'Porções Extras', estacao: 'chapa', impressoraId: 'prn-1' },
  { categoria: 'Pizzas', estacao: 'pizza', impressoraId: 'prn-4' },
  { categoria: 'Bebidas', estacao: 'bar', impressoraId: 'prn-2' },
  { categoria: 'Sucos de Frutas', estacao: 'bar', impressoraId: 'prn-2' },
  { categoria: 'Sobremesas', estacao: 'sobremesa', impressoraId: 'prn-1' }
];

export const INITIAL_ALERTS: SystemAlert[] = [
  { id: 'alt-3', tipo: 'impressora_offline', titulo: 'Impressora Forno de Pizzas Offline', mensagem: 'Sem comunicação no IP 192.168.1.123. Os pedidos estão sendo redirecionados para a Cozinha Chapa.', gravidade: 'media', horario: '11:22', lida: false, linkAcao: 'impressoras' }
];

export const INITIAL_CASH_REGISTER: CashRegister = {
  id: 'csh-today-01',
  aberto: true,
  operadorAbertura: 'Ana Paula Ferreira',
  abertoEm: '2026-09-10T09:30:00',
  saldoInicial: 200.00,
  saldoAtualGaveta: 350.00, // Saldo inicial (200) + Suprimento (100) + Venda Dinheiro (50)
  transacoes: [
    { id: 'tx-1', tipo: 'abertura', valor: 200.00, motivo: 'Fundo de troco inicial do turno', horario: '2026-09-10T09:30:00', operador: 'Ana Paula Ferreira' },
    { id: 'tx-2', tipo: 'suprimento', valor: 100.00, motivo: 'Reforço de moedas e notas miúdas', horario: '2026-09-10T10:05:00', operador: 'Ana Paula Ferreira' },
    { id: 'tx-3', tipo: 'venda_manual', valor: 50.00, motivo: 'Recebimento em dinheiro Pedido #1000', formaPagamento: 'dinheiro', horario: '2026-09-10T11:40:10', pedidoId: 'ord-1000', operador: 'Ana Paula Ferreira' }
  ]
};
