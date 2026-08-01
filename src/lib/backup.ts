import { getDB, type Comida, type Ingrediente, type Plato } from './db';

interface BackupData {
  formatVersion: 1;
  exportedAt: string;
  platos: Plato[];
  comidas: Comida[];
  ingredientes: Ingrediente[];
}

export async function exportBackup(): Promise<void> {
  const db = await getDB();
  const data: BackupData = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    platos: await db.getAll('platos'),
    comidas: await db.getAll('comidas'),
    ingredientes: await db.getAll('ingredientes'),
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

/** Restores from a backup file, replacing all current data. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<BackupData>;

  if (data.formatVersion !== 1) {
    throw new Error('Formato de backup no reconocido');
  }

  const db = await getDB();
  const tx = db.transaction(['platos', 'comidas', 'ingredientes'], 'readwrite');

  await Promise.all([
    tx.objectStore('platos').clear(),
    tx.objectStore('comidas').clear(),
    tx.objectStore('ingredientes').clear(),
  ]);

  for (const plato of data.platos ?? []) {
    await tx.objectStore('platos').put(plato);
  }
  for (const comida of data.comidas ?? []) {
    await tx.objectStore('comidas').put(comida);
  }
  for (const ingrediente of data.ingredientes ?? []) {
    await tx.objectStore('ingredientes').put(ingrediente);
  }

  await tx.done;
}
