import type { Categoria, Ingrediente, Plato } from './db';

export type TipoValorRegla = 'plato' | 'ingrediente' | 'categoria';

interface Catalogos {
  platos: Plato[];
  ingredientes: Ingrediente[];
  categorias: Categoria[];
}

/** Resuelve el nombre a mostrar de un valor de regla (plato/ingrediente/categoría) por id, en caliente. */
export function resolveValorNombre(
  tipo: TipoValorRegla,
  valorId: string | undefined,
  { platos, ingredientes, categorias }: Catalogos,
): string {
  if (!valorId) return '—';
  if (tipo === 'plato') return platos.find((p) => p.id === valorId)?.nombre ?? '—';
  if (tipo === 'ingrediente') return ingredientes.find((i) => i.id === valorId)?.nombre ?? '—';
  return categorias.find((c) => c.id === valorId)?.nombre ?? '—';
}
