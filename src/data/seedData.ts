import { 
  MenuItem, 
  Ingredient, 
  ProductBatch, 
  Table, 
  Order, 
  Comanda, 
  StaffUser, 
  Customer, 
  Supplier, 
  PurchaseOrder, 
  Courier, 
  PrinterDevice, 
  PrinterRoutingRule, 
  AuditLog, 
  FinancialEntry, 
  SystemAlert, 
  ManualPaymentOption, 
  CashRegister,
  RestaurantSettings
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

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'ing-1', codigo: 'ING001', nome: 'Hambúrguer Bovino Artesanal 180g', unidade: 'un', categoria: 'Carnes', estoqueAtual: 85, estoqueMinimo: 30, estoqueIdeal: 120, custoMedio: 6.80, ultimoPrecoCompra: 7.10 },
  { id: 'ing-2', codigo: 'ING002', nome: 'Pão de Brioche Selado', unidade: 'un', categoria: 'Panificação', estoqueAtual: 92, estoqueMinimo: 40, estoqueIdeal: 150, custoMedio: 1.90, ultimoPrecoCompra: 2.05 },
  { id: 'ing-3', codigo: 'ING003', nome: 'Queijo Cheddar Fatiado', unidade: 'kg', categoria: 'Queijos e Laticínios', estoqueAtual: 4.8, estoqueMinimo: 3.0, estoqueIdeal: 10.0, custoMedio: 42.00, ultimoPrecoCompra: 44.50 },
  { id: 'ing-4', codigo: 'ING004', nome: 'Queijo Muçarela Ralado', unidade: 'kg', categoria: 'Queijos e Laticínios', estoqueAtual: 14.5, estoqueMinimo: 8.0, estoqueIdeal: 25.0, custoMedio: 38.00, ultimoPrecoCompra: 39.90 },
  { id: 'ing-5', codigo: 'ING005', nome: 'Bacon em Tiras Crocante', unidade: 'kg', categoria: 'Carnes', estoqueAtual: 3.2, estoqueMinimo: 5.0, estoqueIdeal: 12.0, custoMedio: 48.00, ultimoPrecoCompra: 52.00 }, // Crítico
  { id: 'ing-6', codigo: 'ING006', nome: 'Massa Artesanal de Pizza (Farinha 00)', unidade: 'un', categoria: 'Panificação', estoqueAtual: 45, estoqueMinimo: 20, estoqueIdeal: 80, custoMedio: 3.50, ultimoPrecoCompra: 3.60 },
  { id: 'ing-7', codigo: 'ING007', nome: 'Molho de Tomate Pelati Italiano', unidade: 'l', categoria: 'Molhos & Condimentos', estoqueAtual: 18.0, estoqueMinimo: 10.0, estoqueIdeal: 35.0, custoMedio: 14.50, ultimoPrecoCompra: 15.00 },
  { id: 'ing-8', codigo: 'ING008', nome: 'Filé Mignon Bovino', unidade: 'kg', categoria: 'Carnes', estoqueAtual: 11.2, estoqueMinimo: 8.0, estoqueIdeal: 22.0, custoMedio: 68.00, ultimoPrecoCompra: 72.00 },
  { id: 'ing-9', codigo: 'ING009', nome: 'Carne de Sol Regional Curada', unidade: 'kg', categoria: 'Carnes', estoqueAtual: 16.0, estoqueMinimo: 10.0, estoqueIdeal: 30.0, custoMedio: 49.00, ultimoPrecoCompra: 51.50 },
  { id: 'ing-10', codigo: 'ING010', nome: 'Mandioca / Macaxeira para Fritura', unidade: 'kg', categoria: 'Hortifruti', estoqueAtual: 22.0, estoqueMinimo: 15.0, estoqueIdeal: 40.0, custoMedio: 5.20, ultimoPrecoCompra: 5.40 },
  { id: 'ing-11', codigo: 'ING011', nome: 'Batata Pré-Frita Congelada 9mm', unidade: 'pct', categoria: 'Hortifruti', estoqueAtual: 8, estoqueMinimo: 12, estoqueIdeal: 30, custoMedio: 19.80, ultimoPrecoCompra: 21.00 }, // Crítico
  { id: 'ing-12', codigo: 'ING012', nome: 'Cerveja Artesanal IPA 500ml', unidade: 'un', categoria: 'Bebidas', estoqueAtual: 48, estoqueMinimo: 24, estoqueIdeal: 96, custoMedio: 9.50, ultimoPrecoCompra: 9.80 },
  { id: 'ing-13', codigo: 'ING013', nome: 'Polpa de Cupuaçu Puro', unidade: 'kg', categoria: 'Hortifruti', estoqueAtual: 9.0, estoqueMinimo: 6.0, estoqueIdeal: 20.0, custoMedio: 18.00, ultimoPrecoCompra: 19.50 },
  { id: 'ing-14', codigo: 'ING014', nome: 'Embalagem Térmica Hamburgueria Kraft', unidade: 'un', categoria: 'Embalagens', estoqueAtual: 180, estoqueMinimo: 100, estoqueIdeal: 400, custoMedio: 1.10, ultimoPrecoCompra: 1.15 },
];

export const INITIAL_BATCHES: ProductBatch[] = [
  { id: 'lot-1', loteNumero: 'LT-2026-0901', produtoOuIngredienteNome: 'Bacon em Tiras Crocante', ingredienteId: 'ing-5', quantidade: 3.2, unidade: 'kg', dataEntrada: '2026-09-01', dataValidade: '2026-09-12', fornecedorNome: 'Frigorífico Sul Carnes', statusValidade: 'vence_amanha' },
  { id: 'lot-2', loteNumero: 'LT-2026-0828', produtoOuIngredienteNome: 'Filé Mignon Bovino', ingredienteId: 'ing-8', quantidade: 11.2, unidade: 'kg', dataEntrada: '2026-08-28', dataValidade: '2026-09-16', fornecedorNome: 'Frigorífico Sul Carnes', statusValidade: 'vence_7_dias' },
  { id: 'lot-3', loteNumero: 'LT-2026-0905', produtoOuIngredienteNome: 'Queijo Cheddar Fatiado', ingredienteId: 'ing-3', quantidade: 4.8, unidade: 'kg', dataEntrada: '2026-09-05', dataValidade: '2026-09-10', fornecedorNome: 'Laticínios Serra Bella', statusValidade: 'vence_hoje' },
  { id: 'lot-4', loteNumero: 'LT-2026-0908', produtoOuIngredienteNome: 'Carne de Sol Regional Curada', ingredienteId: 'ing-9', quantidade: 16.0, unidade: 'kg', dataEntrada: '2026-09-08', dataValidade: '2026-09-28', fornecedorNome: 'Distribuidora Carnes do Sertão', statusValidade: 'normal' },
  { id: 'lot-5', loteNumero: 'LT-2026-0820', produtoOuIngredienteNome: 'Molho Especial de Ervas', quantidade: 2.0, unidade: 'l', dataEntrada: '2026-08-20', dataValidade: '2026-09-08', fornecedorNome: 'Produção Interna', statusValidade: 'vencido' },
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
    estoqueControlado: true,
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
    ],
    fichaTecnica: [
      { ingredienteId: 'ing-1', nome: 'Hambúrguer Bovino 180g', quantidade: 1, unidade: 'un', custoEstimado: 6.80 },
      { ingredienteId: 'ing-2', nome: 'Pão de Brioche', quantidade: 1, unidade: 'un', custoEstimado: 1.90 },
      { ingredienteId: 'ing-3', nome: 'Queijo Cheddar', quantidade: 0.04, unidade: 'kg', custoEstimado: 1.68 }
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
    estoqueControlado: true,
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
    estoqueControlado: true,
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
    estoqueControlado: true,
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
    estoqueControlado: true,
    tamanho: 'Para 2 a 3 pessoas',
    fichaTecnica: [
      { ingredienteId: 'ing-9', nome: 'Carne de Sol Regional', quantidade: 0.5, unidade: 'kg', custoEstimado: 24.50 },
      { ingredienteId: 'ing-10', nome: 'Macaxeira para Fritura', quantidade: 0.3, unidade: 'kg', custoEstimado: 1.56 }
    ]
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
    estoqueControlado: true,
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
    estoqueControlado: false
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
    estoqueControlado: true
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
    estoqueControlado: true
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
    estoqueControlado: true,
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
    estoqueControlado: true
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
    estoqueControlado: false
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
    estoqueControlado: true
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

export const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'usr-1',
    nome: 'Carlos Mendes',
    cargo: 'Administrador',
    telefone: '(11) 99887-1100',
    usuario: 'admin',
    senha: 'admin1',
    status: 'ativo',
    permissoes: {
      cancelarPedido: true,
      aplicarDesconto: true,
      reabrirCaixa: true,
      modificarEstoque: true,
      visualizarFinanceiro: true,
      reabrirConta: true,
      excluirProduto: true,
      fecharMesa: true,
      estornarPagamento: true
    }
  },
  {
    id: 'usr-2',
    nome: 'Renata Albuquerque',
    cargo: 'Gerente',
    telefone: '(11) 99776-2211',
    usuario: 'gerente.renata',
    status: 'ativo',
    permissoes: {
      cancelarPedido: true,
      aplicarDesconto: true,
      reabrirCaixa: true,
      modificarEstoque: true,
      visualizarFinanceiro: true,
      reabrirConta: true,
      excluirProduto: false,
      fecharMesa: true,
      estornarPagamento: true
    }
  },
  {
    id: 'usr-3',
    nome: 'Ana Paula Ferreira',
    cargo: 'Caixa',
    telefone: '(11) 98665-3322',
    usuario: 'caixa.anapaula',
    status: 'ativo',
    permissoes: {
      cancelarPedido: false,
      aplicarDesconto: false,
      reabrirCaixa: false,
      modificarEstoque: false,
      visualizarFinanceiro: false,
      reabrirConta: false,
      excluirProduto: false,
      fecharMesa: true,
      estornarPagamento: false
    }
  },
  {
    id: 'usr-4',
    nome: 'Lucas Silva',
    cargo: 'Garçom',
    telefone: '(11) 97554-4433',
    usuario: 'garcom.lucas',
    status: 'ativo',
    permissoes: {
      cancelarPedido: false,
      aplicarDesconto: false,
      reabrirCaixa: false,
      modificarEstoque: false,
      visualizarFinanceiro: false,
      reabrirConta: false,
      excluirProduto: false,
      fecharMesa: false,
      estornarPagamento: false
    }
  },
  {
    id: 'usr-5',
    nome: 'Chef Marcos Silveira',
    cargo: 'Cozinha',
    telefone: '(11) 96443-5544',
    usuario: 'cozinha.marcos',
    status: 'ativo',
    permissoes: {
      cancelarPedido: false,
      aplicarDesconto: false,
      reabrirCaixa: false,
      modificarEstoque: true,
      visualizarFinanceiro: false,
      reabrirConta: false,
      excluirProduto: false,
      fecharMesa: false,
      estornarPagamento: false
    }
  },
  {
    id: 'usr-6',
    nome: 'Diego Motoboy',
    cargo: 'Entregador',
    telefone: '(11) 95332-6655',
    usuario: 'delivery.diego',
    status: 'ativo',
    permissoes: {
      cancelarPedido: false,
      aplicarDesconto: false,
      reabrirCaixa: false,
      modificarEstoque: false,
      visualizarFinanceiro: false,
      reabrirConta: false,
      excluirProduto: false,
      fecharMesa: false,
      estornarPagamento: false
    }
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cli-1',
    nome: 'Julio Cesar Santos',
    telefone: '(11) 98765-0011',
    whatsapp: '(11) 98765-0011',
    email: 'julio.santos@email.com',
    aniversario: '15/10',
    endereco: { logradouro: 'Rua das Palmeiras', numero: '450', bairro: 'Jardins', complemento: 'Apto 82 Bloco B', pontoReferencia: 'Próximo ao Parque Central' },
    quantidadePedidos: 14,
    totalGasto: 1480.00,
    ticketMedio: 105.71,
    ultimoPedidoData: '2026-09-10T12:05:00',
    produtosFavoritos: ['Burguer Bacon Monster', 'Refrigerante Lata 350ml'],
    observacoes: 'Cliente VIP. Sempre pede bacon bem crocante e entrega rápida.'
  },
  {
    id: 'cli-2',
    nome: 'Dr. Roberto Magalhães',
    telefone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: 'dr.roberto@clinica.com.br',
    aniversario: '04/04',
    endereco: { logradouro: 'Av. Brigadeiro Luis Antonio', numero: '2800', bairro: 'Bela Vista' },
    quantidadePedidos: 28,
    totalGasto: 4320.00,
    ticketMedio: 154.28,
    ultimoPedidoData: '2026-09-10T11:45:00',
    produtosFavoritos: ['Burguer Clássico Murupi', 'Chopp Pilsen Artesanal 500ml'],
    observacoes: 'Gosta de sentar na Mesa 1 ou 4 no almoço.'
  },
  {
    id: 'cli-3',
    nome: 'Camila Fernandes',
    telefone: '(11) 99443-8899',
    whatsapp: '(11) 99443-8899',
    email: 'camila.fernandes@design.com',
    aniversario: '22/09',
    endereco: { logradouro: 'Rua Augusta', numero: '1200', bairro: 'Consolação', complemento: 'Conjunto 401' },
    quantidadePedidos: 9,
    totalGasto: 675.00,
    ticketMedio: 75.00,
    ultimoPedidoData: '2026-09-08T19:30:00',
    produtosFavoritos: ['Pizza Calabresa Especial', 'Suco Natural de Cupuaçu 500ml'],
    observacoes: 'Prefere massa de pizza bem fina e crocante.'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    nome: 'Frigorífico Sul Carnes Ltda',
    empresa: 'Sul Carnes Distribuidora',
    cnpj: '45.892.110/0001-44',
    telefone: '(11) 3214-5500',
    whatsapp: '(11) 98822-1144',
    email: 'vendas@sulcarnes.com.br',
    endereco: 'Rodovia dos Bandeirantes, km 38 - Galpão 4',
    produtosFornecidos: ['Hambúrguer Bovino 180g', 'Bacon em Tiras Crocante', 'Filé Mignon Bovino'],
    totalComprado: 48500.00,
    observacoes: 'Entrega pontual às terças e sextas-feiras pela manhã.'
  },
  {
    id: 'sup-2',
    nome: 'Laticínios Serra Bella',
    empresa: 'Serra Bella Alimentos',
    cnpj: '18.742.990/0001-82',
    telefone: '(11) 4560-2233',
    whatsapp: '(11) 99112-7788',
    email: 'comercial@serrabella.ind.br',
    endereco: 'Estrada das Colinas, 120 - Serra Negra/SP',
    produtosFornecidos: ['Queijo Cheddar Fatiado', 'Queijo Muçarela Ralado', 'Catupiry Legítimo'],
    totalComprado: 32400.00,
    observacoes: 'Exige pedido mínimo de R$ 800,00.'
  },
  {
    id: 'sup-3',
    nome: 'Distribuidora Carnes do Sertão',
    empresa: 'Do Sertão Comércio de Carnes',
    cnpj: '09.332.100/0001-19',
    telefone: '(11) 2990-1122',
    whatsapp: '(11) 98334-9900',
    email: 'pedidos@carnesdosertao.com',
    endereco: 'Rua do Mercado, 45 - Feira Central',
    produtosFornecidos: ['Carne de Sol Regional Curada', 'Manteiga de Garrafa Pura', 'Queijo Coalho'],
    totalComprado: 19800.00,
    observacoes: 'Produto regional artesanal de excelente aceitação.'
  }
];

export const INITIAL_PURCHASES: PurchaseOrder[] = [
  {
    id: 'po-101',
    codigo: 'OC-2026-089',
    fornecedorId: 'sup-1',
    fornecedorNome: 'Frigorífico Sul Carnes Ltda',
    status: 'recebido',
    dataCriacao: '2026-09-02',
    dataRecebimento: '2026-09-04',
    compradorNome: 'Carlos Mendes',
    valorTotal: 1845.00,
    itens: [
      {
        ingredienteId: 'ing-1',
        nome: 'Hambúrguer Bovino Artesanal 180g',
        quantidade: 150,
        unidade: 'un',
        precoUnitario: 7.10,
        precoUltimaCompra: 6.80,
        variacaoPercentual: 4.4,
        total: 1065.00
      },
      {
        ingredienteId: 'ing-5',
        nome: 'Bacon em Tiras Crocante',
        quantidade: 15,
        unidade: 'kg',
        precoUnitario: 52.00,
        precoUltimaCompra: 42.60,
        variacaoPercentual: 22.0, // Exemplo pedido no prompt (+22%)
        total: 780.00
      }
    ],
    observacoes: 'Variação de +22% no bacon justificada por escassez de matéria-prima suína no mercado.'
  },
  {
    id: 'po-102',
    codigo: 'OC-2026-092',
    fornecedorId: 'sup-2',
    fornecedorNome: 'Laticínios Serra Bella',
    status: 'pedido',
    dataCriacao: '2026-09-08',
    dataPrevisao: '2026-09-12',
    compradorNome: 'Renata Albuquerque',
    valorTotal: 960.00,
    itens: [
      {
        ingredienteId: 'ing-3',
        nome: 'Queijo Cheddar Fatiado',
        quantidade: 10,
        unidade: 'kg',
        precoUnitario: 44.50,
        precoUltimaCompra: 42.00,
        variacaoPercentual: 5.9,
        total: 445.00
      },
      {
        ingredienteId: 'ing-4',
        nome: 'Queijo Muçarela Ralado',
        quantidade: 15,
        unidade: 'kg',
        precoUnitario: 39.90,
        precoUltimaCompra: 38.00,
        variacaoPercentual: 5.0,
        total: 515.00
      }
    ],
    observacoes: 'Aguardando entrega na sexta-feira pela manhã.'
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

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', usuario: 'João Silva (Gerente)', cargo: 'Gerente', acao: 'Remoção de pagamento manual', dataHora: '2026-09-10 11:15:30', dispositivo: 'Terminal Caixa 01 (Chrome/Windows)', detalhes: 'Removeu pagamento manual de R$ 70,00 registrado por engano no pedido #1000', pedidoNumero: 1000, valorEnvolvido: 70.00 },
  { id: 'aud-2', usuario: 'Carlos Mendes (Admin)', cargo: 'Administrador', acao: 'Aplicação de desconto especial', dataHora: '2026-09-10 11:35:10', dispositivo: 'Tablet Gerência (Safari/iPad)', detalhes: 'Aplicou desconto de 10% (R$ 15,00) em comanda de cliente corporativo', valorEnvolvido: 15.00 },
  { id: 'aud-3', usuario: 'Ana Paula Ferreira', cargo: 'Caixa', acao: 'Suprimento de troco de caixa', dataHora: '2026-09-10 10:05:00', dispositivo: 'Terminal Caixa 01', detalhes: 'Entrada manual de R$ 100,00 em moedas e notas miúdas para troco', valorEnvolvido: 100.00 },
  { id: 'aud-4', usuario: 'Carlos Mendes (Admin)', cargo: 'Administrador', acao: 'Ajuste manual de estoque', dataHora: '2026-09-09 23:10:00', dispositivo: 'Desktop Escritório', detalhes: 'Ajuste de perda por quebra de 2 garrafas de Cerveja IPA', valorEnvolvido: 19.00 }
];

export const INITIAL_FINANCIAL: FinancialEntry[] = [
  { id: 'fin-1', tipo: 'receita', descricao: 'Faturamento Vendas Balcão e Salão Turno Almoço', categoria: 'Vendas', centroCusto: 'Operação Restaurante', valor: 2840.00, dataVencimento: '2026-09-10', dataPagamento: '2026-09-10', status: 'pago', formaPagamentoPrevista: 'Múltiplas' },
  { id: 'fin-2', tipo: 'despesa', descricao: 'Pagamento Fornecedor Sul Carnes - Boleto 089/26', categoria: 'Fornecedores', centroCusto: 'Cozinha', valor: 1845.00, dataVencimento: '2026-09-14', status: 'pendente', formaPagamentoPrevista: 'Boleto Bancário' },
  { id: 'fin-3', tipo: 'despesa', descricao: 'Conta de Energia Elétrica Enel Distribuição', categoria: 'Energia e Água', centroCusto: 'Operação Restaurante', valor: 1420.00, dataVencimento: '2026-09-20', status: 'pendente' },
  { id: 'fin-4', tipo: 'despesa', descricao: 'Aluguel do Ponto Comercial Imobiliária Central', categoria: 'Aluguel', centroCusto: 'Administrativo', valor: 4500.00, dataVencimento: '2026-09-05', dataPagamento: '2026-09-05', status: 'pago', formaPagamentoPrevista: 'TED' },
  { id: 'fin-5', tipo: 'despesa', descricao: 'Embalagens Kraft para Delivery e Sacolas', categoria: 'Fornecedores', centroCusto: 'Delivery', valor: 650.00, dataVencimento: '2026-09-12', status: 'pendente' }
];

export const INITIAL_ALERTS: SystemAlert[] = [
  { id: 'alt-1', tipo: 'estoque_baixo', titulo: 'Estoque Crítico: Bacon em Tiras', mensagem: 'Restam apenas 3.2 kg no estoque (mínimo cadastrado é 5.0 kg). Providencie compra.', gravidade: 'alta', horario: '10:00', lida: false, linkAcao: 'compras' },
  { id: 'alt-2', tipo: 'validade_proxima', titulo: 'Lote Vencendo Hoje: Queijo Cheddar', mensagem: 'Lote LT-2026-0905 (4.8 kg) vence hoje 10/09/2026. Priorize o consumo na chapa.', gravidade: 'alta', horario: '08:30', lida: false, linkAcao: 'estoque' },
  { id: 'alt-3', tipo: 'impressora_offline', titulo: 'Impressora Forno de Pizzas Offline', mensagem: 'Sem comunicação no IP 192.168.1.123. Os pedidos estão sendo redirecionados para a Cozinha Chapa.', gravidade: 'media', horario: '11:22', lida: false, linkAcao: 'impressoras' },
  { id: 'alt-4', tipo: 'estoque_baixo', titulo: 'Estoque Baixo: Batata Congelada', mensagem: 'Apenas 8 pacotes disponíveis (mínimo recomendado: 12 pacotes).', gravidade: 'media', horario: '11:40', lida: false, linkAcao: 'estoque' }
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

export const INITIAL_SETTINGS: RestaurantSettings = {
  nomeFantasia: 'Murupi Restaurante & Lanches',
  razaoSocial: 'Murupi Alimentos & Gastronomia LTDA',
  cnpj: '45.892.110/0001-44',
  telefone: '(11) 98765-4321',
  endereco: 'Av. das Nações, 1420 - Centro - São Paulo, SP',
  mensagemCupom: 'Obrigado pela preferência! Volte sempre ao Restaurante Murupi. WiFi: MurupiGuest / Senha: saborartesanal',
  quantidadeMesas: 16,
  taxaServico: 10,
  fechamentoCego: true,
  tempoAlertaAmarelo: 15,
  tempoAlertaVermelho: 25,
  exigirJustificativaCancelamento: true,
  exigirJustificativaDesconto: true,
  saas: {
    nome: 'Plano Murupi SaaS Pro',
    status: 'ativo',
    validade: '2027-12-31',
    limiteMesas: 50,
    limiteComandas: 150,
    modulosHabilitados: [
      'pdv', 'mesas', 'comandas', 'caixa', 'kds', 'delivery', 
      'cardapio', 'estoque', 'compras', 'fornecedores', 
      'clientes', 'funcionarios', 'financeiro', 'relatorios', 'impressoras', 'auditoria'
    ],
    versaoSistema: 'v3.5.0 SaaS Pro Cloud',
    unidadeAtual: 'Matriz - São Paulo (Loja 01)',
    cnpjFranqueadora: '12.345.678/0001-90'
  }
};
