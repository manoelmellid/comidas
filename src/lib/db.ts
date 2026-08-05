import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { CATEGORIAS_SEED, CATEGORIA_FALLBACK_ID } from './categoriasSeed';

export type TipoComida = 'comida' | 'cena';
export type Especial = 'fuera';

/** Canonical ingredient catalog entry — shared across platos so it can be referenced by id everywhere. */
export interface Ingrediente {
  id: string;
  nombre: string;
  categoriaId: string;
}

export interface PlatoIngrediente {
  ingredienteId: string;
  cantidad: string;
}

export type TipoPlato = 'comida' | 'cena' | 'ambas';

export interface Plato {
  id: string;
  nombre: string;
  ingredientes: PlatoIngrediente[];
  notas: string;
  tipo: TipoPlato;
}

/** One row per (fecha, tipo) slot. `id` is the deterministic key `${fecha}__${tipo}`. */
export interface Comida {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: TipoComida;
  platoId: string | null;
  especial: Especial | null;
  /** Free-text tags for especiales (e.g. ["Empanada", "Croquetas"]). */
  tags: string[];
  /** Set by el Generador cuando procesa el slot sin dejar un plato asignado. */
  generado?: 'no_elaborar' | 'fallido';
}

export interface Categoria {
  id: string;
  nombre: string;
}

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
export type TipoReglaDiaria = 'ninguna' | 'no_elaborar' | 'plato' | 'ingrediente' | 'categoria';
export type ModoRegla = 'forzar' | 'prohibir';

/** Plantilla recurrente por día de la semana, no por fecha. `id` es la clave determinista `${diaSemana}__${tipoComida}`. */
export interface ReglaDiaria {
  id: string;
  diaSemana: DiaSemana;
  tipoComida: TipoComida;
  tipo: TipoReglaDiaria;
  valorId?: string;
  modo?: ModoRegla;
}

export type TipoObjetivoGlobal = 'plato' | 'ingrediente' | 'categoria';
export type ModoGlobal = 'exacto' | 'minimo' | 'maximo';
export type AplicaGlobal = 'comida' | 'cena' | 'ambas';

export interface ReglaGlobal {
  id: string;
  tipo: TipoObjetivoGlobal;
  valorId: string;
  dias: number;
  modo: ModoGlobal;
  aplica: AplicaGlobal;
}

export interface Preferencias {
  id: 'main';
  semanasAtras: number;
}

interface ComidasDB extends DBSchema {
  platos: {
    key: string;
    value: Plato;
  };
  comidas: {
    key: string;
    value: Comida;
    indexes: { 'by-fecha': string };
  };
  ingredientes: {
    key: string;
    value: Ingrediente;
  };
  categorias: {
    key: string;
    value: Categoria;
  };
  reglasDiarias: {
    key: string;
    value: ReglaDiaria;
  };
  reglasGlobales: {
    key: string;
    value: ReglaGlobal;
  };
  preferencias: {
    key: string;
    value: Preferencias;
  };
}

const DB_NAME = 'comidas-db';
const DB_VERSION = 2;
const PREFERENCIAS_ID = 'main';

let dbPromise: Promise<IDBPDatabase<ComidasDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ComidasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ComidasDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('platos')) {
          db.createObjectStore('platos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('comidas')) {
          const store = db.createObjectStore('comidas', { keyPath: 'id' });
          store.createIndex('by-fecha', 'fecha');
        }
        if (!db.objectStoreNames.contains('ingredientes')) {
          db.createObjectStore('ingredientes', { keyPath: 'id' });
        }
        let categoriasEsNueva = false;
        if (!db.objectStoreNames.contains('categorias')) {
          db.createObjectStore('categorias', { keyPath: 'id' });
          categoriasEsNueva = true;
        }
        if (!db.objectStoreNames.contains('reglasDiarias')) {
          db.createObjectStore('reglasDiarias', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reglasGlobales')) {
          db.createObjectStore('reglasGlobales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('preferencias')) {
          db.createObjectStore('preferencias', { keyPath: 'id' });
        }

        if (categoriasEsNueva) {
          const categoriasStore = transaction.objectStore('categorias');
          await Promise.all(CATEGORIAS_SEED.map((categoria) => categoriasStore.put(categoria)));
        }

        // Ingredientes creados antes de que la categoría fuera obligatoria: rellenar con el fallback.
        const ingredientesStore = transaction.objectStore('ingredientes');
        let cursor = await ingredientesStore.openCursor();
        while (cursor) {
          if (!cursor.value.categoriaId) {
            await cursor.update({ ...cursor.value, categoriaId: CATEGORIA_FALLBACK_ID });
          }
          cursor = await cursor.continue();
        }
      },
    });
  }
  return dbPromise;
}

export function comidaId(fecha: string, tipo: TipoComida): string {
  return `${fecha}__${tipo}`;
}

export function reglaDiariaId(diaSemana: DiaSemana, tipoComida: TipoComida): string {
  return `${diaSemana}__${tipoComida}`;
}

export function newId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Platos
// ---------------------------------------------------------------------------

export async function getAllPlatos(): Promise<Plato[]> {
  const db = await getDB();
  return db.getAll('platos');
}

export async function savePlato(plato: Plato): Promise<void> {
  const db = await getDB();
  await db.put('platos', plato);
}

export async function deletePlato(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('platos', id);
}

// ---------------------------------------------------------------------------
// Ingredientes (catálogo compartido, referenciado por Plato.ingredientes)
// ---------------------------------------------------------------------------

export async function getAllIngredientes(): Promise<Ingrediente[]> {
  const db = await getDB();
  return db.getAll('ingredientes');
}

export async function saveIngrediente(ingrediente: Ingrediente): Promise<void> {
  const db = await getDB();
  await db.put('ingredientes', ingrediente);
}

export async function deleteIngrediente(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('ingredientes', id);
}

// ---------------------------------------------------------------------------
// Comidas (asignación de platos a fechas)
// ---------------------------------------------------------------------------

export async function getComidasEnRango(fechaInicio: string, fechaFin: string): Promise<Comida[]> {
  const db = await getDB();
  const range = IDBKeyRange.bound(fechaInicio, fechaFin);
  return db.getAllFromIndex('comidas', 'by-fecha', range);
}

export async function getAllComidas(): Promise<Comida[]> {
  const db = await getDB();
  return db.getAll('comidas');
}

export async function setComida(comida: Comida): Promise<void> {
  const db = await getDB();
  await db.put('comidas', comida);
}

export async function clearComida(fecha: string, tipo: TipoComida): Promise<void> {
  const db = await getDB();
  await db.delete('comidas', comidaId(fecha, tipo));
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export async function getAllCategorias(): Promise<Categoria[]> {
  const db = await getDB();
  return db.getAll('categorias');
}

export async function saveCategoria(categoria: Categoria): Promise<void> {
  const db = await getDB();
  await db.put('categorias', categoria);
}

export async function deleteCategoria(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('categorias', id);
}

/** Reasigna ingredientes y reglas que apuntaban a `fromId` hacia `toId`, y borra `fromId`. */
export async function mergeCategoria(fromId: string, toId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['categorias', 'ingredientes', 'reglasDiarias', 'reglasGlobales'], 'readwrite');

  const ingredientesStore = tx.objectStore('ingredientes');
  let ingredienteCursor = await ingredientesStore.openCursor();
  while (ingredienteCursor) {
    if (ingredienteCursor.value.categoriaId === fromId) {
      await ingredienteCursor.update({ ...ingredienteCursor.value, categoriaId: toId });
    }
    ingredienteCursor = await ingredienteCursor.continue();
  }

  const reglasDiariasStore = tx.objectStore('reglasDiarias');
  let reglaDiariaCursor = await reglasDiariasStore.openCursor();
  while (reglaDiariaCursor) {
    if (reglaDiariaCursor.value.tipo === 'categoria' && reglaDiariaCursor.value.valorId === fromId) {
      await reglaDiariaCursor.update({ ...reglaDiariaCursor.value, valorId: toId });
    }
    reglaDiariaCursor = await reglaDiariaCursor.continue();
  }

  const reglasGlobalesStore = tx.objectStore('reglasGlobales');
  let reglaGlobalCursor = await reglasGlobalesStore.openCursor();
  while (reglaGlobalCursor) {
    if (reglaGlobalCursor.value.tipo === 'categoria' && reglaGlobalCursor.value.valorId === fromId) {
      await reglaGlobalCursor.update({ ...reglaGlobalCursor.value, valorId: toId });
    }
    reglaGlobalCursor = await reglaGlobalCursor.continue();
  }

  await tx.objectStore('categorias').delete(fromId);
  await tx.done;
}

// ---------------------------------------------------------------------------
// Reglas diarias (14 filas direccionables por día de la semana × tipo de comida)
// ---------------------------------------------------------------------------

export async function getAllReglasDiarias(): Promise<ReglaDiaria[]> {
  const db = await getDB();
  return db.getAll('reglasDiarias');
}

export async function setReglaDiaria(regla: ReglaDiaria): Promise<void> {
  const db = await getDB();
  await db.put('reglasDiarias', regla);
}

// ---------------------------------------------------------------------------
// Reglas globales
// ---------------------------------------------------------------------------

export async function getAllReglasGlobales(): Promise<ReglaGlobal[]> {
  const db = await getDB();
  return db.getAll('reglasGlobales');
}

export async function saveReglaGlobal(regla: ReglaGlobal): Promise<void> {
  const db = await getDB();
  await db.put('reglasGlobales', regla);
}

export async function deleteReglaGlobal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('reglasGlobales', id);
}

// ---------------------------------------------------------------------------
// Preferencias (fila única)
// ---------------------------------------------------------------------------

export async function getPreferencias(): Promise<Preferencias> {
  const db = await getDB();
  const existing = await db.get('preferencias', PREFERENCIAS_ID);
  return existing ?? { id: PREFERENCIAS_ID, semanasAtras: 1 };
}

export async function setPreferencias(semanasAtras: number): Promise<void> {
  const db = await getDB();
  await db.put('preferencias', { id: PREFERENCIAS_ID, semanasAtras });
}

// ---------------------------------------------------------------------------
// Borrar todos los datos (mantiene categorías y preferencias — son configuración, no planificación)
// ---------------------------------------------------------------------------

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('platos'),
    db.clear('comidas'),
    db.clear('ingredientes'),
    db.clear('reglasDiarias'),
    db.clear('reglasGlobales'),
  ]);
}
