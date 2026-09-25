import { 
  MenuItem, 
  Table, 
  Order, 
  PrinterDevice, 
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

export const INITIAL_PRINTERS: PrinterDevice[] = [
  { id: 'prn-1', nome: 'Impressora Cozinha / Chapa', tipo: 'rede', local: 'Cozinha Principal', finalidade: 'espelho', ip: '192.168.1.120', porta: 9100, modelo: 'Epson TM-T20X', larguraPapel: '80mm', status: 'online', ativa: true, itensNaFila: 0, ultimaImpressao: '2026-09-10 12:18:12' },
  { id: 'prn-2', nome: 'Impressora Bar & Bebidas', tipo: 'rede', local: 'Balcão de Chopp & Sucos', finalidade: 'geral', ip: '192.168.1.121', porta: 9100, modelo: 'Bematech MP-4200 TH', larguraPapel: '80mm', status: 'online', ativa: true, itensNaFila: 0, ultimaImpressao: '2026-09-10 12:05:30' },
  { id: 'prn-3', nome: 'Impressora Balcão & Pedido', tipo: 'rede', local: 'Frente de Caixa 01', finalidade: 'pedido', ip: '192.168.1.122', porta: 9100, modelo: 'Epson TM-T88VI', larguraPapel: '80mm', status: 'online', ativa: true, itensNaFila: 0, ultimaImpressao: '2026-09-10 11:41:10' },
  { id: 'prn-4', nome: 'Impressora Forno de Pizzas', tipo: 'rede', local: 'Estação de Pizzas', finalidade: 'geral', ip: '192.168.1.123', porta: 9100, modelo: 'Daruma DR800', larguraPapel: '80mm', status: 'offline', ativa: true, itensNaFila: 1, impressoraReservaId: 'prn-1', ultimaImpressao: '2026-09-10 11:20:45' }
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
