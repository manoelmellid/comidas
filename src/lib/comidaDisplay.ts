import type { Comida } from './db';

export type ComidaDisplayVariant = 'vacio' | 'especial' | 'eliminado' | 'no_elaborar' | 'fallido' | 'normal';

export interface ComidaDisplay {
  texto: string;
  variant: ComidaDisplayVariant;
}

/** Resuelve el texto y la variante visual de un slot de comida — compartido por DayCard y HoyScreen. */
export function resolveComidaDisplay(
  comida: Comida | undefined,
  getPlatoNombre: (platoId: string) => string,
): ComidaDisplay {
  if (!comida) return { texto: 'Añadir', variant: 'vacio' };
  if (comida.generado === 'no_elaborar') return { texto: 'No elaborar', variant: 'no_elaborar' };
  if (comida.generado === 'fallido') return { texto: 'No generado', variant: 'fallido' };
  if (comida.especial) {
    return { texto: comida.tags.length ? `Fuera · ${comida.tags.join(', ')}` : 'Fuera', variant: 'especial' };
  }
  if (comida.platoId) {
    const nombre = getPlatoNombre(comida.platoId);
    return { texto: nombre, variant: nombre === '(eliminado)' ? 'eliminado' : 'normal' };
  }
  return { texto: 'Añadir', variant: 'vacio' };
}
