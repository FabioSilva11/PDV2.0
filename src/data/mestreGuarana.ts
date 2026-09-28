/**
 * ============================================================
 * CARDÁPIO "MESTRE DO GUARANÁ" (seed adicional)
 * ============================================================
 * Itens do cardápio físico digitados para o banco:
 *  - Sanduíches/Lanches  -> categoria 'Lanches & Burgers' (catálogo LANCHE);
 *  - Guaranás, Sucos e Vitaminas -> categoria 'Sucos de Frutas'
 *    (MenuCategory 'cat-sucos' atende RESTAURANTE **E** LANCHE);
 *  - Porções -> 'Porções Extras' (também dual-catálogo);
 *  - Bebidas diversas -> 'Bebidas'; salgados/sobremesas avulsas ->
 *    'Lanches & Burgers' / 'Sobremesas' / 'Bebidas' com catálogo LANCHE.
 *
 * Padrões do sistema:
 *  - IDs determinísticos com prefixo 'mg-' (nunca colide com seeds antigos);
 *  - Preço por TAMANHO via `variacoes` (mesmo padrão dos sucos existentes);
 *  - Preço indefinido no cardápio físico = 0.00 (editável depois pela UI);
 *  - Este módulo é SEED: nunca sobrescreve dados reais já persistidos.
 * ============================================================
 */
import type { CategoryType, KitchenStation, MenuCatalog, MenuItem, ProductVariation } from '../types';

/** [ml, preco] */
type SizePreco = [number, number];

const SIZES_250_500: SizePreco[] = [[250, 5.0], [300, 6.0], [400, 8.0], [500, 10.0]];
const SIZES_300_500: SizePreco[] = [[300, 6.0], [400, 8.0], [500, 10.0]];
const SIZES_VITA_ESPECIAL: SizePreco[] = [[250, 6.0], [300, 6.0], [400, 8.0], [500, 10.0]];

const observacaoSuco = ' Adoçado com açúcar; troca por adoçante deve ser pedida antecipadamente.';

/** Lanche (sanduíche) do catálogo LANCHE. */
const lan = (seq: number, nome: string, preco: number, descricao: string): MenuItem => ({
  id: `mg-lan-${String(seq).padStart(2, '0')}`,
  nome,
  categoria: 'Lanches & Burgers',
  catalogos: ['lanche'],
  preco,
  disponivel: true,
  descricao,
  estacaoProducao: 'chapa'
});

/** Bebida da categoria 'Sucos de Frutas' (restaurante + lanche) com variações de ml. */
const bev = (id: string, codigo: string | undefined, nome: string, descricao: string, sizes: SizePreco[]): MenuItem => ({
  id,
  ...(codigo ? { codigo } : {}),
  nome,
  categoria: 'Sucos de Frutas',
  catalogos: ['restaurante', 'lanche'],
  preco: sizes[0][1],
  disponivel: true,
  descricao,
  estacaoProducao: 'bar',
  variacoes: sizes.map(([ml, preco]): ProductVariation => ({
    id: `${id}-${ml}`,
    nome: `${ml} ml`,
    preco,
    custoEstimado: 0,
    disponivel: true,
    quantidade: ml,
    unidade: 'ml'
  }))
});

/** Guarana simples (códigos 001-021 do cardápio). */
const guaranaSimples = (codigo: string, complemento: string, descricao: string): MenuItem =>
  bev(`mg-gua-${codigo}`, codigo, `Guaraná com ${complemento}`, descricao, SIZES_250_500);

/** Guarana especial/super-especial (300/400/500 ml). */
const guaranaEspecial = (codigo: string, nome: string, descricao: string): MenuItem =>
  bev(`mg-gua-${codigo}`, codigo, nome, descricao, SIZES_300_500);

/** Suco de fruta (sabor simples, 250/300/400/500 ml). */
const suco = (codigo: string | undefined, sabor: string): MenuItem =>
  bev(`mg-suco-${sabor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')}`, codigo, `Suco de ${sabor}`, `Suco natural batido na hora.${observacaoSuco}`, SIZES_250_500);

/** Suco especial (mistura de frutas, 300/400/500 ml). */
const sucoEspecial = (codigo: string, nome: string, descricao: string): MenuItem =>
  bev(`mg-sue-${codigo}`, codigo, `Suco Especial ${nome}`, descricao, SIZES_300_500);

/** Vitamina (250/300/400/500 ml). */
const vitamina = (codigo: string, nome: string, descricao: string, especial = false): MenuItem =>
  bev(`mg-vit-${codigo}`, codigo, `Vitamina ${especial ? 'Especial ' : ''}${nome}`, descricao, especial ? SIZES_VITA_ESPECIAL : SIZES_250_500);

const SIZES_PORCAO_PMG: SizePreco[] = [[300, 5.0], [500, 10.0], [700, 15.0]];
const SIZES_PORCAO_PMGG: SizePreco[] = [[300, 5.0], [500, 10.0], [700, 15.0], [1000, 20.0]];
const NOME_PORCAO: Record<number, string> = { 300: 'P', 500: 'M', 700: 'G', 1000: 'GG' };

/** Porção P/M/G(/GG) — atende RESTAURANTE e LANCHE (catalogos explícitos). */
const porcao = (seq: number, nome: string, descricao: string, sizes: SizePreco[]): MenuItem => ({
  id: `mg-por-${String(seq).padStart(3, '0')}`,
  nome,
  categoria: 'Porções Extras',
  catalogos: ['restaurante', 'lanche'],
  preco: sizes[0][1],
  disponivel: true,
  descricao,
  estacaoProducao: 'cozinha',
  variacoes: sizes.map(([gramas, preco]): ProductVariation => ({
    id: `mg-por-${String(seq).padStart(3, '0')}-${NOME_PORCAO[gramas] ?? gramas}`,
    nome: NOME_PORCAO[gramas] ?? `${gramas} g`,
    preco,
    custoEstimado: 0,
    disponivel: true
  }))
});

/** Item diverso (bebida/lanche/sobremesa avulsa) do cardápio físico. */
const diverso = (seq: number, nome: string, preco: number, descricao: string, categoria: CategoryType, estacao: KitchenStation, catalogos?: MenuCatalog[], disponivel = true): MenuItem => ({
  id: `mg-div-${String(seq).padStart(2, '0')}`,
  nome,
  categoria,
  catalogos: catalogos && catalogos.length ? [...catalogos] : ['restaurante'],
  preco,
  disponivel,
  descricao,
  estacaoProducao: estacao
});

export const MESTRE_GUARANA_MENU: MenuItem[] = [
  // ==============================
  // SANDUÍCHES / LANCHES (catálogo LANCHE)
  // Preço 0.00 = indefinido no cardápio físico (editar depois).
  // ==============================
  lan(1, 'Americano', 7.0, 'Ovo, queijo, presunto, alface, tomate e pão de forma.'),
  lan(2, 'Americano Especial', 13.0, '4 pães de forma, 2 ovos, 2 queijos, 2 presuntos, alface e tomate.'),
  lan(3, 'Bauru', 7.0, 'Queijo, presunto, tomate, alface, ovo e pão de hambúrguer.'),
  lan(4, 'Hambúrguer', 5.0, 'Hambúrguer, alface, tomate e pão de hambúrguer.'),
  lan(5, 'Misto', 5.0, 'Queijo, presunto e pão de forma.'),
  lan(6, 'Misto Duplo', 8.0, '2 queijos, 2 presuntos e 3 pães de forma.'),
  lan(7, 'X-Burguer', 6.0, 'Hambúrguer, queijo, alface, tomate e pão de hambúrguer.'),
  lan(8, 'X-Egg', 7.0, 'Hambúrguer, ovo, queijo, alface, tomate e pão de hambúrguer.'),
  lan(9, 'X-Egg Especial', 14.0, '2 hambúrgueres, 2 ovos, 2 queijos, alface, tomate e pão de hambúrguer.'),
  lan(10, 'X-Frango', 8.0, 'Hambúrguer de frango, queijo, alface, tomate e pão de hambúrguer.'),
  lan(11, 'Frango Bagunça', 0.0, 'Hambúrguer de frango, salsicha, ovo, queijo, presunto, alface, tomate e pão de hambúrguer. (Preço a definir no cadastro)'),
  lan(12, 'X-Gatinho', 5.0, 'Ovo, queijo e pão de forma.'),
  lan(13, 'X-Linguiça', 10.0, 'Linguiça de frango, ovo, presunto, queijo, alface, tomate e pão de hambúrguer.'),
  lan(14, 'X-Maionese', 7.0, 'Hambúrguer, presunto, queijo, alface, tomate e pão de hambúrguer.'),
  lan(15, 'X-Salada', 10.0, 'Hambúrguer, presunto, ovo, queijo, alface, tomate e pão de hambúrguer.'),
  lan(16, 'X-Salada Duplo', 20.0, '2 hambúrgueres, 2 presuntos, 2 ovos, 2 queijos, alface, tomate e pão de hambúrguer.'),
  lan(17, 'X-Tudo', 15.0, 'Hambúrguer, presunto, ovo, salsicha, calabresa, bacon e pão de hambúrguer.'),
  lan(18, 'X-Larica', 18.0, 'Linguiça de frango, hambúrguer de frango, hambúrguer de carne, calabresa, queijo, presunto, ovo, alface e tomate.'),
  lan(19, 'X-Bacon', 12.0, 'Ovo, bacon, presunto, queijo, alface e tomate.'),
  lan(20, 'X-Calabresa', 12.0, 'Pão de hambúrguer, calabresa, queijo, presunto, ovo e salada.'),
  lan(21, 'X-Picanha', 28.0, 'Picanha, queijo, alface, tomate, molho especial e pão de hambúrguer.'),
  lan(22, 'X-Costela', 28.0, 'Carne de costela desfiada, queijo, alface, tomate, molho especial e pão de hambúrguer.'),
  lan(23, 'Hambúrguer Artesanal 1', 15.0, 'Hambúrguer artesanal, queijo, bacon, alface, tomate, cebola, pimentão e molho especial.'),
  lan(24, 'Hambúrguer Artesanal 2', 18.0, 'Hambúrguer artesanal, queijo, bacon, alface, tomate, cebola, pimentão, molho especial e batata frita.'),
  lan(25, 'Hambúrguer Artesanal Duplo', 20.0, '2 hambúrgueres artesanais, 2 queijos, bacon, alface, tomate, cebola, pimentão, molho especial e batata frita. (Preço a confirmar no cardápio original)'),
  lan(26, 'Filé a Moda da Casa', 21.0, 'Filé de carne, filé de frango, 2 queijos, alface, tomate, ovos e pão de hambúrguer.'),
  lan(27, 'Filé Tudo', 20.0, 'Filé, hambúrguer, presunto, ovo, salsicha, calabresa e pão de hambúrguer.'),
  lan(28, 'Frango Filé Salada', 14.0, 'Filé de frango, ovo, queijo, presunto, alface, tomate e pão de hambúrguer.'),
  lan(29, 'Filé', 13.0, 'Filé, queijo, alface, tomate e pão de hambúrguer.'),
  lan(30, 'Filé Bagunça', 21.0, 'Filé, salsicha de frango, queijo, presunto, alface, tomate e pão de hambúrguer.'),
  lan(31, 'Filé Egg', 14.0, 'Filé, queijo, ovo, alface, tomate e pão de hambúrguer.'),
  lan(32, 'Filé Salada', 15.0, 'Filé, queijo, presunto, alface, ovo, tomate e pão de hambúrguer.'),
  lan(33, 'Filé Burguer', 15.0, 'Hambúrguer, filé, queijo, alface, tomate e pão de hambúrguer.'),
  lan(34, 'Frango Filé', 12.0, 'Filé de frango, queijo, alface, tomate e pão de hambúrguer.'),
  lan(35, 'Banana Egg', 8.0, 'Banana, ovo, queijo, alface, tomate e pão de hambúrguer.'),
  lan(36, 'Banana Burguer', 7.0, 'Hambúrguer, banana, queijo, alface, tomate e pão de hambúrguer.'),
  lan(37, 'Calabresa', 12.0, 'Calabresa, ovo, queijo, apresuntado, alface, tomate e pão de hambúrguer.'),
  lan(38, 'Kikão Simples', 0.0, 'Lanche da casa. (Preço ilegível no cardápio original — definir no cadastro)'),
  lan(39, 'Kikão Especial', 0.0, 'Lanche especial da casa. (Preço ilegível no cardápio original — definir no cadastro)'),
  lan(40, 'Brotinho', 0.0, 'Lanche brotinho da casa. (Preço não informado no cardápio original — definir no cadastro)'),

  // ==============================
  // GUARANÁS SIMPLES (250/300/400/500 ml — R$ 5/6/8/10)
  // ==============================
  guaranaSimples('001', 'Acerola', 'Xarope de guaraná, acerola, leite em pó e guaraná em pó.'),
  guaranaSimples('002', 'Açaí', 'Xarope de guaraná, açaí e guaraná em pó.'),
  guaranaSimples('003', 'Abacate', 'Xarope de guaraná, abacate, leite em pó e guaraná em pó.'),
  guaranaSimples('004', 'Abacaxi', 'Xarope de guaraná, abacaxi, leite em pó e guaraná em pó.'),
  guaranaSimples('005', 'Banana', 'Xarope de guaraná, banana, leite em pó e guaraná em pó.'),
  guaranaSimples('006', 'Cupuaçu', 'Xarope de guaraná, cupuaçú, leite em pó e guaraná em pó.'),
  guaranaSimples('007', 'Goiaba', 'Xarope de guaraná, goiaba, leite em pó e guaraná em pó.'),
  guaranaSimples('008', 'Graviola', 'Xarope de guaraná, graviola, leite em pó e guaraná em pó.'),
  guaranaSimples('009', 'Mel e Limão', 'Xarope de guaraná, mel de abelha, limão, leite em pó e guaraná em pó.'),
  guaranaSimples('010', 'Laranja', 'Xarope de guaraná, laranja, leite em pó e guaraná em pó.'),
  guaranaSimples('011', 'Manga', 'Xarope de guaraná, manga, leite em pó e guaraná em pó.'),
  guaranaSimples('012', 'Maracujá', 'Xarope de guaraná, maracujá, leite em pó e guaraná em pó.'),
  guaranaSimples('013', 'Aveia', 'Xarope de guaraná, aveia, leite em pó e guaraná em pó.'),
  guaranaSimples('014', 'Castanha de Cajú', 'Xarope de guaraná, castanha de cajú, leite em pó e guaraná em pó.'),
  guaranaSimples('015', 'Farinha Láctea', 'Xarope de guaraná, farinha láctea, leite em pó e guaraná em pó.'),
  guaranaSimples('016', 'Granola', 'Xarope de guaraná, granola, leite em pó e guaraná em pó.'),
  guaranaSimples('017', 'Leite', 'Xarope de guaraná, leite em pó e guaraná em pó.'),
  guaranaSimples('018', 'Mixto', 'Xarope de guaraná, amendoim, castanha de cajú, aveia, leite em pó e guaraná em pó.'),
  guaranaSimples('019', 'Chocolate', 'Xarope de guaraná, chocolate, leite em pó e guaraná em pó.'),
  guaranaSimples('020', 'Taperebá', 'Xarope de guaraná, taperebá, leite em pó e guaraná em pó.'),
  guaranaSimples('021', 'Chocpu', 'Xarope de guaraná, chocolate, cupuaçú, catuaba, leite em pó e guaraná em pó.'),

  // ==============================
  // GUARANÁS ESPECIAIS (300/400/500 ml — R$ 6/8/10)
  // ==============================
  guaranaEspecial('022', 'Guaraná Enermestre', 'Xarope de guaraná, banana, açaí, marapuama, leite em pó e guaraná em pó.'),
  guaranaEspecial('023', 'Guaraná Cris', 'Xarope de guaraná, farinha láctea, catuaba, abacaxi, leite em pó e guaraná em pó.'),
  guaranaEspecial('024', 'Guaraná Gisela', 'Xarope de guaraná, amendoim, chocolate, marapuama, leite em pó e guaraná em pó.'),
  guaranaEspecial('025', 'Guaraná Salada', 'Xarope de guaraná, farinha láctea, banana, mamão, leite em pó e guaraná em pó.'),
  guaranaEspecial('026', 'Guaraná Cenouranja', 'Xarope de guaraná, cenoura, laranja, catuaba, leite em pó e guaraná em pó.'),
  guaranaEspecial('027', 'Guaraná Aceranja', 'Xarope de guaraná, acerola, laranja, marapuama, leite em pó e guaraná em pó.'),

  // ==============================
  // GUARANÁS SUPER ESPECIAIS (300/400/500 ml — R$ 6/8/10)
  // ==============================
  guaranaEspecial('028', 'Guaraná Turbomestre', 'Xarope de guaraná, catuaba, mirantã, marapuama, granola, amendoim, ovo de codorna, castanha de caju, açaí, leite em pó e guaraná em pó.'),
  guaranaEspecial('029', 'Guaraná Overdose', 'Xarope de guaraná, catuaba, mirantã, marapuama, granola, ovo de codorna, banana, açaí e guaraná em pó.'),
  guaranaEspecial('030', 'Guaraná Embananado', 'Xarope de guaraná, catuaba, mirantã, amendoim, aveia, ovo de codorna, castanha de caju, banana, leite em pó e guaraná em pó.'),
  guaranaEspecial('031', 'Guaraná Completo', 'Xarope de guaraná, catuaba, mirantã, marapuama e granola. (Descrição parcial no cardápio original)'),
  guaranaEspecial('032', 'Guaraná Fulminante', 'Xarope de guaraná, catuaba, mirantã, marapuama, farinha láctea, abacate, amendoim, leite em pó e guaraná em pó. (Lançamento)'),
  guaranaEspecial('033', 'Guaraná Pedreira', 'Xarope de guaraná, catuaba, mirantã, marapuama, beterraba, aveia, ovo de codorna, banana, açaí, leite em pó e guaraná em pó. (Lançamento)'),

  // ==============================
  // SUCOS DE FRUTAS — sabores novos (250/300/400/500 ml — R$ 5/6/8/10)
  // Maracujá, Goiaba, Cupuaçu e Graviola já existem no seed legado.
  // Servem para RESTAURANTE e LANCHE (categoria 'cat-sucos').
  // ==============================
  suco('034', 'Acerola'),
  suco('035', 'Abacaxi'),
  suco('039', 'Jenipapo'),
  suco('040', 'Manga'),
  suco('042', 'Taperebá'),
  suco('043', 'Mamão'),
  suco('044', 'Maçã'),
  suco('045', 'Limão'),
  suco(undefined, 'Laranja'),

  // ==============================
  // SUCOS ESPECIAIS (300/400/500 ml — R$ 6/8/10)
  // ==============================
  sucoEspecial('046', 'Laranja com Acerola', 'Laranja, acerola e leite em pó.'),
  sucoEspecial('047', 'Laranja com Mamão', 'Laranja, mamão e leite em pó.'),
  sucoEspecial('048', 'Laranja com Beterraba', 'Laranja, beterraba e leite em pó.'),
  sucoEspecial('049', 'Laranja com Banana', 'Laranja, banana e leite em pó.'),
  sucoEspecial('050', 'Laranja com Abacaxi', 'Laranja, abacaxi e leite em pó.'),
  sucoEspecial('051', 'Cupuaçu com Laranja', 'Cupuaçú, laranja e leite em pó.'),
  sucoEspecial('052', 'Acerola com Açaí', 'Acerola, açaí e leite em pó.'),
  sucoEspecial('053', 'Aveia com Maracujá', 'Aveia, maracujá e leite em pó.'),
  sucoEspecial('054', 'Jenipapo com Beterraba', 'Genipapo, beterraba e leite em pó.'),
  sucoEspecial('055', 'Limão com Laranja', 'Limão, laranja e leite em pó.'),
  sucoEspecial('056', 'Cenoura com Maçã e Laranja', 'Cenoura, maçã, laranja e leite em pó.'),
  sucoEspecial('057', 'Laranja com Manga', 'Laranja, manga e leite em pó.'),
  sucoEspecial('058', 'Mamão com Goiaba', 'Mamão, goiaba e leite em pó.'),
  sucoEspecial('059', 'Laranja com Maracujá', 'Laranja, maracujá e leite em pó.'),
  sucoEspecial('060', 'Laranja com Açaí', 'Laranja, açaí e leite em pó.'),

  // ==============================
  // VITAMINAS SIMPLES (250/300/400/500 ml — R$ 5/6/8/10)
  // ==============================
  vitamina('061', 'de Banana com Aveia', 'Banana, aveia e leite em pó.'),
  vitamina('062', 'de Abacate com Farinha Láctea', 'Abacate, farinha láctea e leite em pó.'),
  vitamina('063', 'de Mamão com Neston', 'Mamão, neston e leite em pó.'),
  vitamina('064', 'de Maçã com Neston', 'Maçã, neston e leite em pó.'),

  // ==============================
  // VITAMINAS ESPECIAIS (250/300/400/500 ml — R$ 6/6/8/10)
  // ==============================
  vitamina('065', 'Banana com Abacate', 'Banana, neston, aveia, abacate e leite em pó.', true),
  vitamina('066', 'Abacate com Mamão', 'Abacate, aveia, mamão, neston e leite em pó.', true),
  vitamina('067', 'Mamão com Banana', 'Mamão, farinha láctea, aveia, banana, leite em pó.', true),
  vitamina('068', 'Maçã com Mamão', 'Maçã, farinha láctea, mamão, neston e leite em pó.', true),
  vitamina('069', 'Beterraba com Banana', 'Beterraba, aveia, banana, neston e leite em pó.', true),
  vitamina('070', 'Maçã com Banana', 'Maçã, banana, aveia, farinha láctea e leite em pó.', true),

  // ==============================
  // SUPER VITAMINADAS (tamanho único 500 ml — R$ 10)
  // ==============================
  {
    id: 'mg-sup-001',
    nome: 'Super Vitamina Banana com Abacate',
    categoria: 'Sucos de Frutas',
    catalogos: ['restaurante', 'lanche'],
    tamanho: '500 ml',
    preco: 10.0,
    disponivel: true,
    descricao: 'Banana, neston, abacate, mamão, aveia, farinha láctea e leite em pó.',
    estacaoProducao: 'bar'
  },
  {
    id: 'mg-sup-002',
    nome: 'Super Vitamina Abacate com Mel',
    categoria: 'Sucos de Frutas',
    catalogos: ['restaurante', 'lanche'],
    tamanho: '500 ml',
    preco: 10.0,
    disponivel: true,
    descricao: 'Abacate, banana, mamão, mel de abelha e leite em pó.',
    estacaoProducao: 'bar'
  },
  {
    id: 'mg-sup-003',
    nome: 'Super Vitamina Mamão com Maçã',
    categoria: 'Sucos de Frutas',
    catalogos: ['restaurante', 'lanche'],
    tamanho: '500 ml',
    preco: 10.0,
    disponivel: true,
    descricao: 'Mamão, neston, banana, farinha láctea, aveia, maçã e leite em pó.',
    estacaoProducao: 'bar'
  },
  {
    id: 'mg-sup-004',
    nome: 'Super Vitamina Açaí com Laranja',
    categoria: 'Sucos de Frutas',
    catalogos: ['restaurante', 'lanche'],
    tamanho: '500 ml',
    preco: 10.0,
    disponivel: true,
    descricao: 'Açaí, neston, cenoura, beterraba, laranja e leite em pó.',
    estacaoProducao: 'bar'
  },

  // ==============================
  // PORÇÕES (categoria 'Porções Extras' — atende RESTAURANTE e LANCHE)
  // Tamanhos P/M/G(/GG) do cardápio físico.
  // ==============================
  porcao(1, 'Batata Frita', 'Porção de batata frita sequinha e crocante.', SIZES_PORCAO_PMGG),
  porcao(2, 'Bolinhas de Queijo', 'Porção de bolinhas de queijo douradas.', SIZES_PORCAO_PMG),
  porcao(3, 'Nuggets', 'Porção de nuggets de frango crocantes.', SIZES_PORCAO_PMG),

  // ==============================
  // BEBIDAS DIVERSAS (categoria 'Bebidas' — dual-catálogo pela categoria)
  // 'Refrigerante Lata' e 'Refrigerante 1 Litro' já existem no catálogo
  // Murupi legado; os itens abaixo são os do Mestre do Guaraná (preços
  // próprios) e ficam separados para edição independente.
  // ==============================
  diverso(1, 'Refrigerante Lata', 5.0, 'Lata 350 ml gelada. (Homônimo do item legado a R$ 6,00 — editável aqui)', 'Bebidas', 'bar', ['restaurante', 'lanche']),
  diverso(2, 'Refrigerante 1 Litro', 6.0, 'Garrafa 1 litro. Cardápio físico lista R$ 6/8/10 sem detalhar as variações — ajuste aqui se necessário.', 'Bebidas', 'bar', ['restaurante', 'lanche']),
  diverso(3, 'Água Mineral 300 ml', 2.0, 'Água mineral natural gelada.', 'Bebidas', 'bar', ['restaurante', 'lanche']),
  diverso(4, 'Água Mineral 500 ml', 0.0, 'Tamanho não oferecido no cardápio original. (Preço a definir caso passe a oferecer)', 'Bebidas', 'bar', ['restaurante', 'lanche'], false),
  diverso(5, 'Água Mineral 1 Litro', 0.0, 'Tamanho não oferecido no cardápio original. (Preço a definir caso passe a oferecer)', 'Bebidas', 'bar', ['restaurante', 'lanche'], false),

  // ==============================
  // DIVERSOS DO BALCÃO (lanches e sobremesas avulsas)
  // Preço 0.00 = indefinido no cardápio físico (editar depois).
  // Kikão Simples/Especial e Brotinho estão na lista de lanches (mg-lan-38/39/40).
  // ==============================
  diverso(6, 'Salgados', 5.0, 'Salgados do balcão (coxinhas, risoles etc.) por unidade.', 'Lanches & Burgers', 'chapa', ['lanche']),
  diverso(7, 'Sorvete', 0.0, 'Sorvete do balcão. (Preço não informado no cardápio original — definir no cadastro)', 'Sobremesas', 'sobremesa', ['lanche']),
  diverso(8, 'Doces', 0.0, 'Bolo de Chocolate, Tortas, Pudim e Trufas. (Preço não informado no cardápio original — definir no cadastro)', 'Sobremesas', 'sobremesa', ['lanche']),
  diverso(9, 'Milk Shake', 0.0, 'Milk shake batido na hora. (Preço não informado no cardápio original — definir no cadastro)', 'Bebidas', 'bar', ['restaurante', 'lanche']),
  diverso(10, 'Frozen', 0.0, 'Frozen de frutas. (Preço não informado no cardápio original — definir no cadastro)', 'Bebidas', 'bar', ['restaurante', 'lanche'])
];
