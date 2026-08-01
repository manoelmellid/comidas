import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type TipoComida = 'comida' | 'cena';
export type Especial = 'tupper' | 'fuera';

/** Canonical ingredient catalog entry — shared across platos so it can be referenced by id everywhere. */
export interface Ingrediente {
  id: string;
  nombre: string;
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
}

const DB_NAME = 'comidas-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ComidasDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ComidasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ComidasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
      },
    });
  }
  return dbPromise;
}

export function comidaId(fecha: string, tipo: TipoComida): string {
  return `${fecha}__${tipo}`;
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
// Borrar todos los datos
// ---------------------------------------------------------------------------

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('platos'),
    db.clear('comidas'),
    db.clear('ingredientes'),
  ]);
}
