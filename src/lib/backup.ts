import {
  getDB,
  getPreferencias,
  type Categoria,
  type Comida,
  type Ingrediente,
  type Plato,
  type Preferencias,
  type ReglaDiaria,
  type ReglaGlobal,
} from './db';
import { CATEGORIA_FALLBACK_ID } from './categoriasSeed';

interface BackupData {
  formatVersion: 1 | 2;
  exportedAt: string;
  platos: Plato[];
  comidas: Comida[];
  ingredientes: Ingrediente[];
  categorias?: Categoria[];
  reglasDiarias?: ReglaDiaria[];
  reglasGlobales?: ReglaGlobal[];
  preferencias?: Preferencias;
}

export async function exportBackup(): Promise<void> {
  const db = await getDB();
  const data: BackupData = {
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    platos: await db.getAll('platos'),
    comidas: await db.getAll('comidas'),
    ingredientes: await db.getAll('ingredientes'),
    categorias: await db.getAll('categorias'),
    reglasDiarias: await db.getAll('reglasDiarias'),
    reglasGlobales: await db.getAll('reglasGlobales'),
    preferencias: await getPreferencias(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `comidas-backup-${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Restores from a backup file, replacing all current data. Acepta formatVersion 1 (sin Generador) y 2. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<BackupData>;

  if (data.formatVersion !== 1 && data.formatVersion !== 2) {
    throw new Error('Formato de backup no reconocido');
  }

  const db = await getDB();
  const stores =
    data.formatVersion === 2
      ? (['platos', 'comidas', 'ingredientes', 'categorias', 'reglasDiarias', 'reglasGlobales', 'preferencias'] as const)
      : (['platos', 'comidas', 'ingredientes'] as const);

  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map((store) => tx.objectStore(store).clear()));

  for (const plato of data.platos ?? []) {
    await tx.objectStore('platos').put(plato);
  }
  for (const comida of data.comidas ?? []) {
    await tx.objectStore('comidas').put(comida);
  }
  for (const ingrediente of data.ingredientes ?? []) {
    await tx.objectStore('ingredientes').put({ ...ingrediente, categoriaId: ingrediente.categoriaId ?? CATEGORIA_FALLBACK_ID });
  }

  if (data.formatVersion === 2) {
    for (const categoria of data.categorias ?? []) {
      await tx.objectStore('categorias').put(categoria);
    }
    for (const regla of data.reglasDiarias ?? []) {
      await tx.objectStore('reglasDiarias').put(regla);
    }
    for (const regla of data.reglasGlobales ?? []) {
      await tx.objectStore('reglasGlobales').put(regla);
    }
    if (data.preferencias) {
      await tx.objectStore('preferencias').put(data.preferencias);
    }
  }

  await tx.done;
}
