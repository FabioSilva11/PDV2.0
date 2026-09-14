import { MenuItem } from '../types';

export const INITIAL_MENU_ITEMS: MenuItem[] = ([
  // Pratos principais
  {
    id: 'prato-1',
    nome: 'Carne de Sol',
    categoria: 'Pratos principais',
    preco: 23.00,
    disponivel: true,
    descricao: 'Carne de sol artesanal frita na manteiga de garrafa acompanhada de guarnições tradicionais.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-2',
    nome: 'Isca de Carne',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Iscas de carne bovina macias e suculentas grelhadas na chapa.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-3',
    nome: 'Isca de Frango',
    categoria: 'Pratos principais',
    preco: 16.00,
    disponivel: true,
    descricao: 'Tiras de peito de frango temperadas e douradas na perfeição.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-4',
    nome: 'Isca Mista',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Combinação saborosa de iscas de carne bovina e frango grelhadas.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-5',
    nome: 'Strogonoff Carne',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Carne em tiras em molho cremoso especial com champignon.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-6',
    nome: 'Strogonoff Frango',
    categoria: 'Pratos principais',
    preco: 18.00,
    disponivel: true,
    descricao: 'Cubos de frango macios envolvidos em molho cremoso com batata palha.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata palha'
    ]
  },
  {
    id: 'prato-7',
    nome: 'Creme Camarão',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Camarões selecionados em creme aveludado e perfumado.',
    acompanhamentos: [
      'Arroz',
      'Macarrão',
      'Maionese',
      'Farofa',
      'Batata frita'
    ]
  },
  {
    id: 'prato-8',
    nome: 'Macarrão ao molho de Camarão',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Massa fresca envolvida em molho artesanal de camarões frescos.',
    acompanhamentos: []
  },
  {
    id: 'prato-9',
    nome: 'Lasanha de Carne',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Camadas generosas de queijo, massa caseira e carne moída temperada.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-10',
    nome: 'Lasanha de Frango',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Lasanha gratinada ao forno com recheio suculento de frango desfiado.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Batata frita'
    ]
  },
  {
    id: 'prato-11',
    nome: 'Farofa de Jabá com Banana',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Prato típico com carne seca (jabá) desfiada crocante e banana frita.',
    acompanhamentos: [
      'Arroz',
      'Macarrão',
      'Maionese',
      'Salada'
    ]
  },
  {
    id: 'prato-12',
    nome: 'Farofa de Carne seca',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Farofa molhadinha e temperada com carne seca desfiada.',
    acompanhamentos: [
      'Arroz',
      'Macarrão',
      'Maionese',
      'Salada'
    ]
  },
  {
    id: 'prato-13',
    nome: 'Picanha Suína',
    categoria: 'Pratos principais',
    preco: 25.00,
    disponivel: true,
    descricao: 'Corte nobre suíno grelhado, suculento e macio, com feijão tropeiro e macaxeira.',
    acompanhamentos: [
      'Arroz branco',
      'Feijão tropeiro',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Macaxeira frita'
    ]
  },
  {
    id: 'prato-14',
    nome: 'Picanha Chapeada',
    categoria: 'Pratos principais',
    preco: 30.00,
    disponivel: true,
    descricao: 'Picanha bovina premium selada na chapa no ponto certo.',
    acompanhamentos: [
      'Feijão tropeiro',
      'Macarrão',
      'Farofa',
      'Salada crua',
      'Maionese',
      'Fritas'
    ]
  },
  {
    id: 'prato-15',
    nome: 'Frango Chapeado',
    categoria: 'Pratos principais',
    preco: 16.00,
    disponivel: true,
    descricao: 'Filé de frango dourado na chapa com temperos caseiros.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Fritas'
    ]
  },
  {
    id: 'prato-16',
    nome: 'Bife Acebolado',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Bife bovino macio coberto com anéis de cebola caramelizada.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Fritas'
    ]
  },
  {
    id: 'prato-17',
    nome: 'Bife a Cavalo',
    categoria: 'Pratos principais',
    preco: 22.00,
    disponivel: true,
    descricao: 'Bife suculento coberto por ovos fritos com gema mole ou ao ponto.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Fritas'
    ]
  },
  {
    id: 'prato-18',
    nome: 'Costela desfiada',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Costela cozida lentamente até desmanchar, rica em sabor.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Maionese',
      'Salada crua',
      'Fritas'
    ]
  },
  {
    id: 'prato-19',
    nome: 'Fricassê',
    categoria: 'Pratos principais',
    preco: 20.00,
    disponivel: true,
    descricao: 'Fricassê de frango cremoso com milho, requeijão e batata palha crocante.',
    acompanhamentos: [
      'Arroz branco',
      'Macarrão',
      'Farofa',
      'Salada crua',
      'Maionese',
      'Batata palha'
    ]
  },

  // Entradas
  {
    id: 'entrada-1',
    nome: 'Bolinho de Pirarucu',
    categoria: 'Entradas',
    preco: 1.00,
    disponivel: true,
    descricao: 'Bolinho crocante feito com pirarucu da Amazônia temperado na medida (unidade).'
  },
  {
    id: 'entrada-2',
    nome: 'Dadinho de Tapioca',
    categoria: 'Entradas',
    preco: 1.00,
    disponivel: true,
    descricao: 'Dadinho dourado de tapioca e queijo coalho (unidade).'
  },
  {
    id: 'entrada-3',
    nome: 'Bolinha de Queijo',
    categoria: 'Entradas',
    preco: 1.00,
    disponivel: true,
    descricao: 'Salgadinho recheado com queijo derretido irresistível (unidade).'
  },

  // Porções Extras
  {
    id: 'extra-1',
    nome: 'Lasanha (Porção Extra)',
    categoria: 'Porções Extras',
    preco: 15.00,
    disponivel: true,
    descricao: 'Fatia individual extra de lasanha quentinha.'
  },
  {
    id: 'extra-2',
    nome: 'Batata Frita (Porção Extra)',
    categoria: 'Porções Extras',
    preco: 5.00,
    disponivel: true,
    descricao: 'Porção crocante de batata frita sequinha.'
  },
  {
    id: 'extra-3',
    nome: 'Farofa de Carne Seca (Extra)',
    categoria: 'Porções Extras',
    preco: 15.00,
    disponivel: true,
    descricao: 'Porção reforçada de farofa caseira com carne seca.'
  },
  {
    id: 'extra-4',
    nome: 'Farofa de Jabá (Extra)',
    categoria: 'Porções Extras',
    preco: 15.00,
    disponivel: true,
    descricao: 'Porção avulsa da tradicional farofa de jabá.'
  },
  {
    id: 'extra-5',
    nome: 'Maionese Caseira (Extra)',
    categoria: 'Porções Extras',
    preco: 5.00,
    disponivel: true,
    descricao: 'Pote de salada de maionese caseira cremosa.'
  },
  {
    id: 'extra-6',
    nome: 'Feijão Tropeiro (Extra)',
    categoria: 'Porções Extras',
    preco: 5.00,
    disponivel: true,
    descricao: 'Porção avulsa de feijão tropeiro tradicional com couve e bacon.'
  },

  // Sobremesas (preços pré-configurados de mercado, editáveis no sistema)
  {
    id: 'sob-1',
    nome: 'Torta de Maracujá',
    categoria: 'Sobremesas',
    preco: 10.00,
    disponivel: true,
    descricao: 'Mousse de maracujá aerada com calda de frutas frescas.'
  },
  {
    id: 'sob-2',
    nome: 'Torta de Cupuaçu',
    categoria: 'Sobremesas',
    preco: 12.00,
    disponivel: true,
    descricao: 'Torta cremosa artesanal feita com polpa pura de cupuaçu.'
  },
  {
    id: 'sob-3',
    nome: 'Torta de Limão',
    categoria: 'Sobremesas',
    preco: 10.00,
    disponivel: true,
    descricao: 'Creme de limão siciliano equilibrado com merengue tostadinho.'
  },
  {
    id: 'sob-4',
    nome: 'Torta de Sonho de Valsa',
    categoria: 'Sobremesas',
    preco: 12.00,
    disponivel: true,
    descricao: 'Camadas de chocolate, creme e pedaços crocantes de Sonho de Valsa.'
  },
  {
    id: 'sob-5',
    nome: 'Torta de Prestígio',
    categoria: 'Sobremesas',
    preco: 10.00,
    disponivel: true,
    descricao: 'Clássica combinação de coco ralado úmido e cobertura de brigadeiro.'
  },
  {
    id: 'sob-6',
    nome: 'Torta de Chocolate',
    categoria: 'Sobremesas',
    preco: 10.00,
    disponivel: true,
    descricao: 'Bolo fofinho com recheio cremoso e cobertura de ganache meio amargo.'
  },
  {
    id: 'sob-7',
    nome: 'Pudim de Leite Condensado',
    categoria: 'Sobremesas',
    preco: 8.00,
    disponivel: true,
    descricao: 'Fatia de pudim sem furinhos com calda de caramelo dourada.'
  },

  // Sucos de Frutas (100, 300 e 500 ml)
  {
    id: 'suco-maracuja-100',
    nome: 'Suco de Maracujá',
    categoria: 'Sucos de Frutas',
    tamanho: '100 ml',
    preco: 3.00,
    disponivel: true,
    descricao: 'Suco natural batido na hora, refrescante e aromático.'
  },
  {
    id: 'suco-maracuja-300',
    nome: 'Suco de Maracujá', categoria: 'Sucos de Frutas', tamanho: '300 ml', preco: 6.00, disponivel: true,
    descricao: 'Suco natural batido na hora, refrescante e aromático.'
  },
  {
    id: 'suco-maracuja-500',
    nome: 'Suco de Maracujá', categoria: 'Sucos de Frutas', tamanho: '500 ml', preco: 9.00, disponivel: true,
    descricao: 'Suco natural batido na hora, refrescante e aromático.'
  },
  {
    id: 'suco-goiaba-100',
    nome: 'Suco de Goiaba',
    categoria: 'Sucos de Frutas',
    tamanho: '100 ml', preco: 3.00, disponivel: true,
    descricao: 'Suco encorpado da fruta vermelha rica em vitamina C.'
  },
  {
    id: 'suco-goiaba-300',
    nome: 'Suco de Goiaba', categoria: 'Sucos de Frutas', tamanho: '300 ml', preco: 6.00, disponivel: true,
    descricao: 'Suco encorpado da fruta vermelha rica em vitamina C.'
  },
  {
    id: 'suco-goiaba-500',
    nome: 'Suco de Goiaba', categoria: 'Sucos de Frutas', tamanho: '500 ml', preco: 9.00, disponivel: true,
    descricao: 'Suco encorpado da fruta vermelha rica em vitamina C.'
  },
  {
    id: 'suco-cupuacu-100',
    nome: 'Suco de Cupuaçu', categoria: 'Sucos de Frutas', tamanho: '100 ml', preco: 3.00, disponivel: true,
    descricao: 'Suco típico da Amazônia com sabor marcante e cremoso.'
  },
  {
    id: 'suco-cupuacu-300',
    nome: 'Suco de Cupuaçu', categoria: 'Sucos de Frutas', tamanho: '300 ml', preco: 6.00, disponivel: true,
    descricao: 'Suco típico da Amazônia com sabor marcante e cremoso.'
  },
  {
    id: 'suco-cupuacu-500',
    nome: 'Suco de Cupuaçu', categoria: 'Sucos de Frutas', tamanho: '500 ml', preco: 9.00, disponivel: true,
    descricao: 'Suco típico da Amazônia com sabor marcante e cremoso.'
  },
  {
    id: 'suco-graviola-100',
    nome: 'Suco de Graviola', categoria: 'Sucos de Frutas', tamanho: '100 ml', preco: 3.00, disponivel: true,
    descricao: 'Polpa natural de graviola batida bem gelada.'
  },
  {
    id: 'suco-graviola-300',
    nome: 'Suco de Graviola', categoria: 'Sucos de Frutas', tamanho: '300 ml', preco: 6.00, disponivel: true,
    descricao: 'Polpa natural de graviola batida bem gelada.'
  },
  {
    id: 'suco-graviola-500',
    nome: 'Suco de Graviola', categoria: 'Sucos de Frutas', tamanho: '500 ml', preco: 9.00, disponivel: true,
    descricao: 'Polpa natural de graviola batida bem gelada.'
  },
  /*
  {
    id: 'suco-2',
    nome: 'Suco de Goiaba', categoria: 'Sucos de Frutas', tamanho: '400 ml', preco: 7.00,
    disponivel: true,
    descricao: 'Suco encorpado da fruta vermelha rica em vitamina C.'
  },
  {
    id: 'suco-3',
    nome: 'Suco de Cupuaçu',
    categoria: 'Sucos de Frutas',
    tamanho: '400 ml',
    preco: 8.00,
    disponivel: true,
    descricao: 'Suco típico da Amazônia com sabor marcante e cremoso.'
  },
  {
    id: 'suco-4',
    nome: 'Suco de Graviola',
    categoria: 'Sucos de Frutas',
    tamanho: '400 ml',
    preco: 8.00,
    disponivel: true,
    descricao: 'Polpa natural de graviola batida bem gelada.'
  },
  */

  // Bebidas
  {
    id: 'beb-1',
    nome: 'Água Mineral sem gás',
    categoria: 'Bebidas',
    tamanho: '500 ml',
    preco: 3.50,
    disponivel: true,
    descricao: 'Garrafa de água mineral gelada.'
  },
  {
    id: 'beb-2',
    nome: 'Água Mineral com gás',
    categoria: 'Bebidas',
    tamanho: '500 ml',
    preco: 4.00,
    disponivel: true,
    descricao: 'Garrafa de água mineral gaseificada.'
  },
  {
    id: 'beb-3',
    nome: 'Água Tônica',
    categoria: 'Bebidas',
    tamanho: '350 ml',
    preco: 6.00,
    disponivel: true,
    descricao: 'Lata de água tônica antarctica.'
  },
  {
    id: 'beb-4',
    nome: 'Refrigerante Lata',
    categoria: 'Bebidas',
    tamanho: '350 ml',
    preco: 6.00,
    disponivel: true,
    descricao: 'Coca-Cola, Guaraná Antarctica ou Fanta Laranja gelados.'
  },
  {
    id: 'beb-5',
    nome: 'Refrigerante 1 Litro',
    categoria: 'Bebidas',
    tamanho: '1 Litro',
    preco: 10.00,
    disponivel: true,
    descricao: 'Garrafa família 1L para compartilhar.'
  },

  /* Produtos de demonstração removidos: o catálogo agora vem do cardápio Murupi. 
  {
    id: 'lanche-1',
    nome: 'X-Burguer Murupi',
    categoria: 'Lanches & Burgers',
    preco: 22.00,
    disponivel: true,
    descricao: 'Pão brioche, blend bovino artesanal 160g, queijo prato derretido e maionese da casa.'
  },
  {
    id: 'lanche-2',
    nome: 'X-Salada Especial',
    categoria: 'Lanches & Burgers',
    preco: 24.00,
    disponivel: true,
    descricao: 'Hambúrguer artesanal 160g, queijo, alface americana, tomate fresco e maionese especial.'
  },
  {
    id: 'lanche-3',
    nome: 'X-Bacon Supremo',
    categoria: 'Lanches & Burgers',
    preco: 28.00,
    disponivel: true,
    descricao: 'Blend bovino 160g, dobro de queijo cheddar, fatias crocantes de bacon e molho barbecue.'
  },
  {
    id: 'lanche-4',
    nome: 'Misto Quente na Chapa',
    categoria: 'Lanches & Burgers',
    preco: 12.00,
    disponivel: true,
    descricao: 'Pão de forma tostado na manteiga com muito queijo mussarela e presunto de primeira.'
  } */
] as MenuItem[]).filter(item => item.categoria !== 'Lanches & Burgers');

export const INITIAL_TABLES_COUNT = 15;
