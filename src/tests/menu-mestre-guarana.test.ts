import { describe, expect, it } from 'vitest';
import { MESTRE_GUARANA_MENU } from '../data/mestreGuarana';
import { INITIAL_MENU } from '../data/seedData';
import { normalizeMenuItem, normalizeCatalogos, DEFAULT_MENU_CATEGORIES, isCategoryAllowedForCatalog, itemMatchesCatalog } from '../data/menuCategories';
import { getMenuCategoryByLegacyName } from '../data/menuCategories';

describe('cardápio Mestre do Guaraná (seed adicional)', () => {
  it('contém 41 lanches (40 sanduíches + Salgados), 74 bebidas, 3 porções e 9 diversos do cardápio físico', () => {
    const lanches = MESTRE_GUARANA_MENU.filter(i => i.categoria === 'Lanches & Burgers');
    const bebidas = MESTRE_GUARANA_MENU.filter(i => i.categoria === 'Sucos de Frutas');
    const porcoes = MESTRE_GUARANA_MENU.filter(i => i.categoria === 'Porções Extras');
    // Diversos = bebidas diversas (5) + Milk Shake/Frozen ('Bebidas') + Sorvete/Doces ('Sobremesas').
    const diversos = MESTRE_GUARANA_MENU.filter(i => ['Bebidas', 'Sobremesas'].includes(i.categoria));
    expect(lanches.length).toBe(41); // 40 sanduíches + Salgados do balcão
    expect(bebidas.length).toBeGreaterThanOrEqual(70);
    expect(porcoes.map(i => i.nome)).toEqual(['Batata Frita', 'Bolinhas de Queijo', 'Nuggets']);
    expect(diversos.length).toBe(9); // 7 'Bebidas' + 2 'Sobremesas'
    expect(MESTRE_GUARANA_MENU.length).toBe(lanches.length + bebidas.length + porcoes.length + diversos.length);
  });

  it('todos os IDs são únicos e prefixados mg-', () => {
    const ids = MESTRE_GUARANA_MENU.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id.startsWith('mg-'))).toBe(true);
  });

  it('cada item declara catalogos explícitos (mínimo 1, únicos) coerentes com sua categoria', () => {
    for (const raw of MESTRE_GUARANA_MENU) {
      const item = normalizeMenuItem(raw);
      const categoria = DEFAULT_MENU_CATEGORIES.find(c => c.id === item.categoriaId);
      expect(categoria).toBeDefined();
      // Lista canônica: nunca vazia, sem duplicatas, sempre valores válidos.
      expect(normalizeCatalogos(item)).toEqual(item.catalogos);
      expect(item.catalogos!.length).toBeGreaterThan(0);
      expect(new Set(item.catalogos).size).toBe(item.catalogos!.length);
      // A categoria precisa estar ativa para cada cardápio onde o item foi ativado.
      for (const c of item.catalogos!) expect(isCategoryAllowedForCatalog(categoria, c)).toBe(true);
      // Lanches do balcão são exclusivos do catálogo LANCHE.
      if (item.categoria === 'Lanches & Burgers') {
        expect(item.catalogos).toEqual(['lanche']);
      } else {
        // Sucos/Porções/Bebidas (categorias compartilhadas) declarados nos DOIS catálogos.
        // Sobremesas avulsas vendidas no balcão ficaram explícitas como LANCHE.
        expect(itemMatchesCatalog(item, item.catalogos![0])).toBe(true);
      }
    }
  });

  it('sucos e porções aparecem nos DOIS catálogos sem duplicar cadastro (catalogos explícitos)', () => {
    const suco = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-suco-acerola')!;
    const porcao = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-por-001')!;
    const lanche = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-lan-01')!;
    for (const catalogo of ['restaurante', 'lanche'] as const) {
      expect(suco.catalogos).toContain(catalogo);
      expect(porcao.catalogos).toContain(catalogo);
      expect(itemMatchesCatalog(suco, catalogo)).toBe(true);
      expect(itemMatchesCatalog(porcao, catalogo)).toBe(true);
    }
    expect(lanche.catalogos).toEqual(['lanche']);
    expect(itemMatchesCatalog(lanche, 'lanche')).toBe(true);
    expect(itemMatchesCatalog(lanche, 'restaurante')).toBe(false);
    // 'Suco de Frutas' e 'Porções Extras' são os produtos duais por natureza
    // (cardápio físico): o mesmo cadastro atende os dois cardápios.
    expect(suco.catalogos).toEqual(['restaurante', 'lanche']);
    expect(porcao.catalogos).toEqual(['restaurante', 'lanche']);

    // 'Refrigerante Lata' do Mestre do Guaraná (R$ 5) também vende no lanche.
    const refrMG = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-div-01')!;
    expect(refrMG.catalogos).toContain('lanche');
    expect(itemMatchesCatalog(refrMG, 'lanche')).toBe(true);
  });

  it('normalizeCatalogos converte legado catalogo único (migração idempotente)', () => {
    expect(normalizeCatalogos({ catalogo: 'lanche' })).toEqual(['lanche']);
    expect(normalizeCatalogos({ catalogo: 'restaurante' })).toEqual(['restaurante']);
    expect(normalizeCatalogos({ catalogos: ['restaurante', 'restaurante', 'lanche'] })).toEqual(['restaurante', 'lanche']);
    expect(normalizeCatalogos({})).toEqual(['restaurante']);
    expect(normalizeCatalogos(undefined)).toEqual(['restaurante']);
    expect(normalizeCatalogos({ catalogos: ['invalid' as any], catalogo: 'lanche' })).toEqual(['lanche']);
    // A categoria NUNCA decide; só o explícito no item conta.
    const sucoRestauranteOnly = normalizeMenuItem({ id: 'x', nome: 'Suco', categoria: 'Sucos de Frutas', catalogo: 'restaurante' });
    expect(sucoRestauranteOnly.catalogos).toEqual(['restaurante']);
    expect(itemMatchesCatalog(sucoRestauranteOnly, 'lanche')).toBe(false);
  });

  it('itens com preço indefinido no cardápio físico ficam com preço 0.00 (editáveis)', () => {
    const indefinidos = ['mg-lan-11', 'mg-lan-38', 'mg-lan-39', 'mg-lan-40', 'mg-div-04', 'mg-div-05', 'mg-div-07', 'mg-div-08', 'mg-div-09', 'mg-div-10'];
    for (const id of indefinidos) {
      const item = MESTRE_GUARANA_MENU.find(i => i.id === id);
      expect(item).toBeDefined();
      expect(item!.preco).toBe(0);
      expect(item!.descricao).toContain('efinir'); // marca explícita para edição
    }
    // Tamanhos não oferecidos ficam desativados até o usuário cadastrar.
    expect(MESTRE_GUARANA_MENU.find(i => i.id === 'mg-div-04')!.disponivel).toBe(false);
    expect(MESTRE_GUARANA_MENU.find(i => i.id === 'mg-div-05')!.disponivel).toBe(false);
  });

  it('bebidas com tamanho têm variações 250/300/400/500 ml com preços do cardápio', () => {
    const guarana = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-gua-001')!;
    expect(guarana.variacoes?.map(v => v.preco)).toEqual([5, 6, 8, 10]);
    const especial = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-gua-022')!;
    expect(especial.variacoes?.map(v => v.nome)).toEqual(['300 ml', '400 ml', '500 ml']);
    expect(especial.variacoes?.map(v => v.preco)).toEqual([6, 8, 10]);
    const superVit = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-sup-001')!;
    expect(superVit.variacoes).toBeUndefined();
    expect(superVit.tamanho).toBe('500 ml');
  });

  it('porções têm variações P/M/G(/GG) com preços do cardápio', () => {
    const batata = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-por-001')!;
    expect(batata.variacoes?.map(v => v.nome)).toEqual(['P', 'M', 'G', 'GG']);
    expect(batata.variacoes?.map(v => v.preco)).toEqual([5, 10, 15, 20]);
    const bolinhas = MESTRE_GUARANA_MENU.find(i => i.id === 'mg-por-002')!;
    expect(bolinhas.variacoes?.map(v => v.nome)).toEqual(['P', 'M', 'G']);
    expect(bolinhas.variacoes?.map(v => v.preco)).toEqual([5, 10, 15]);
  });

  it('INITIAL_MENU agrega o seed novo sem colisão de IDs com o legado', () => {
    const ids = INITIAL_MENU.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const mgCount = INITIAL_MENU.filter(i => i.id.startsWith('mg-')).length;
    expect(mgCount).toBe(MESTRE_GUARANA_MENU.length);
    // Legado permanece intacto (o agrupador de sucos preserva o id do último
    // item de cada sabor: *-500).
    expect(INITIAL_MENU.some(i => i.id === 'prato-1')).toBe(true);
    expect(INITIAL_MENU.some(i => i.id === 'suco-maracuja-500')).toBe(true);
  });

  it('nenhum item do seed novo duplica nome+categoria já existente no legado (exceto refrigerantes homônimos assumidos)', () => {
    // 'Refrigerante Lata' e 'Refrigerante 1 Litro' existem no catálogo Murupi
    // com preços diferentes dos do cardápio Mestre do Guaraná. Os dois foram
    // mantidos de propósito (preços do cardápio físico) e podem ser fundidos
    // pelo usuário na edição do cardápio.
    const homonimosAssumidos = new Set(['refrigerante lata|Bebidas', 'refrigerante 1 litro|Bebidas']);
    const legacyKeys = new Set(
      INITIAL_MENU.filter(i => !i.id.startsWith('mg-')).map(i => `${i.nome.toLowerCase()}|${i.categoria}`)
    );
    const duplicados = MESTRE_GUARANA_MENU.filter(i =>
      legacyKeys.has(`${i.nome.toLowerCase()}|${i.categoria}`) && !homonimosAssumidos.has(`${i.nome.toLowerCase()}|${i.categoria}`)
    );
    expect(duplicados).toEqual([]);
  });
});
