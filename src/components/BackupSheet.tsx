import { useRef, useState } from 'react';
import { Sheet } from './Sheet';
import styles from '../screens/AjustesScreen.module.css';
import { exportBackup, importBackup } from '../lib/backup';
import { clearAllData } from '../lib/db';

interface BackupSheetProps {
  onClose: () => void;
}

export function BackupSheet({ onClose }: BackupSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await importBackup(file);
      setStatus('Backup restaurado. Recarga la app para ver los datos.');
    } catch {
      setStatus('No se pudo leer ese archivo como backup válido.');
    }
  }

  async function handleClearAll() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    await clearAllData();
    setConfirmingClear(false);
    setStatus('Todos los datos han sido borrados.');
  }

  return (
    <Sheet title="Copia de seguridad" onClose={onClose}>
      <div className={styles.group}>
        <button type="button" className={styles.row} onClick={() => exportBackup()}>
          Exportar backup (.json)
        </button>
        <button type="button" className={styles.row} onClick={() => fileInputRef.current?.click()}>
          Importar backup (.json)
        </button>
      </div>
      <p className={styles.hint}>
        El backup sustituye a la sincronización en la nube: descarga un archivo con todos tus datos (platos,
        ingredientes y comidas planificadas) y podrás restaurarlo en este u otro dispositivo.
      </p>

      <div className={styles.group}>
        <button type="button" className={`${styles.row} ${styles.rowDanger}`} onClick={handleClearAll}>
          {confirmingClear ? '¿Seguro? Toca de nuevo para confirmar' : 'Borrar todos los datos'}
        </button>
      </div>

      {status && <p className={styles.hint}>{status}</p>}

      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
    </Sheet>
  );
}
