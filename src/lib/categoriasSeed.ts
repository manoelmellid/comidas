import type { Categoria } from './db';

/** Lista de partida de categorías de plato, con ids slug estables. Editable desde Ajustes. */
export const CATEGORIAS_SEED: Categoria[] = [
  { id: 'carne', nombre: 'Carne' },
  { id: 'pescado', nombre: 'Pescado' },
  { id: 'marisco', nombre: 'Marisco' },
  { id: 'verdura', nombre: 'Verdura' },
  { id: 'legumbre', nombre: 'Legumbre' },
  { id: 'cereal', nombre: 'Cereal' },
  { id: 'lacteo', nombre: 'Lácteo' },
  { id: 'huevo', nombre: 'Huevo' },
  { id: 'fruta', nombre: 'Fruta' },
  { id: 'otros', nombre: 'Otros' },
];

/** Id de fallback para platos creados antes de que la categoría fuera obligatoria. */
export const CATEGORIA_FALLBACK_ID = 'otros';
