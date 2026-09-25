import { normalizeSearch } from '../utils/business';
import type { MenuCatalog, MenuCategory, MenuItem } from '../types';

export const DEFAULT_MENU_CATEGORIES: MenuCategory[] = [
  { id: 'cat-pratos', nome: 'Pratos principais', catalogos: ['restaurante'], ordem: 1, ativo: true },
  { id: 'cat-entradas', nome: 'Entradas', catalogos: ['restaurante'], ordem: 2, ativo: true },
  { id: 'cat-porcoes', nome: 'Porções', catalogos: ['restaurante', 'lanche'], ordem: 3, ativo: true },
  { id: 'cat-bebidas', nome: 'Bebidas', catalogos: ['restaurante', 'lanche'], ordem: 4, ativo: true },
  { id: 'cat-sucos', nome: 'Sucos de Frutas', catalogos: ['restaurante', 'lanche'], ordem: 5, ativo: true },
  { id: 'cat-sobremesas', nome: 'Sobremesas', catalogos: ['restaurante'], ordem: 6, ativo: true },
  { id: 'cat-combos', nome: 'Combos', catalogos: ['restaurante', 'lanche'], ordem: 7, ativo: true },
  { id: 'cat-hamburgueres', nome: 'Hambúrgueres', catalogos: ['lanche'], ordem: 1, ativo: true },
  { id: 'cat-lanches', nome: 'Lanches & Burgers', catalogos: ['lanche'], ordem: 2, ativo: true },
  { id: 'cat-pizzas', nome: 'Pizzas', catalogos: ['restaurante'], ordem: 3, ativo: true },
];

export const CATEGORY_REGISTRY: Record<string, MenuCategory> = Object.fromEntries(
  DEFAULT_MENU_CATEGORIES.map(c => [c.nome, c])
);

CATEGORY_REGISTRY['Porções Extras'] = CATEGORY_REGISTRY['Porções'];
CATEGORY_REGISTRY['Porções'] = CATEGORY_REGISTRY['Porções'];

export function getCategoryById(id?: string): MenuCategory | undefined {
  if (!id) return undefined;
  return DEFAULT_MENU_CATEGORIES.find(c => c.id === id) || Object.values(CATEGORY_REGISTRY).find(c => c.id === id);
}

export function getMenuCategoryByLegacyName(name?: string): MenuCategory | undefined {
  if (!name) return undefined;
  if (CATEGORY_REGISTRY[name]) return CATEGORY_REGISTRY[name];
  return Object.values(CATEGORY_REGISTRY).find(c => c.nome === name);
}

export function isCategoryAllowedForCatalog(category: MenuCategory | undefined, catalogo: MenuCatalog): boolean {
  return !!category && category.catalogos.includes(catalogo);
}

export function getCategoriesForCatalog(catalogo: MenuCatalog): MenuCategory[] {
  return DEFAULT_MENU_CATEGORIES.filter(c => c.catalogos.includes(catalogo) && c.ativo).sort((a, b) => a.ordem - b.ordem);
}

export function normalizeMenuItem(item: any): MenuItem {
  const legacyName = item?.categoria;
  const existingCat = item?.categoriaId ? getCategoryById(item.categoriaId) : undefined;
  const cat = existingCat || (legacyName ? getMenuCategoryByLegacyName(legacyName) : undefined);

  if (!cat) {
    const name = legacyName || 'Produto';
    const id = item?.categoriaId || `custom-${item?.id || normalizeSearch(name).slice(0, 24)}`;
    const catalogo: MenuCatalog = item?.catalogo || 'restaurante';
    return { ...item, catalogo, categoriaId: id, categoria: name };
  }

  const catalogo: MenuCatalog = item?.catalogo || cat.catalogos[0] || 'restaurante';
  return { ...item, catalogo, categoriaId: cat.id, categoria: cat.nome };
}
