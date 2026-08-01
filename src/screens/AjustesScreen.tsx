import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './AjustesScreen.module.css';
import { Sheet } from '../components/Sheet';
import { exportBackup, importBackup } from '../lib/backup';
import { clearAllData } from '../lib/db';
import { CATEGORIAS_SEED } from '../lib/categoriasSeed';
import type { LayoutContext } from '../lib/layoutContext';

interface EditingCategoria {
  index: number | null; // null = crear nueva
  nombre: string;
}

export function AjustesScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_SEED);
  const [editing, setEditing] = useState<EditingCategoria | null>(null);
  const [semanasAtras, setSemanasAtras] = useState(1);

  useEffect(() => {
    setTopLeftBack({ label: 'Hoy', onClick: () => navigate('/') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

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

  function commitCategoria() {
    const nombre = editing?.nombre.trim();
    if (editing && nombre) {
      setCategorias((prev) =>
        editing.index === null ? [...prev, nombre] : prev.map((c, i) => (i === editing.index ? nombre : c)),
      );
    }
    setEditing(null);
  }

  return (
    <div>
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

      <p className={styles.sectionLabel}>Categorías de ingrediente</p>
      <div className={styles.group}>
        {categorias.map((nombre, index) => (
          <button
            type="button"
            key={`${nombre}-${index}`}
            className={styles.row}
            onClick={() => setEditing({ index, nombre })}
          >
            <span>{nombre}</span>
            <span className={styles.rowSecondary}>›</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.row} ${styles.rowAccent}`}
          onClick={() => setEditing({ index: null, nombre: '' })}
        >
          + Nueva categoría
        </button>
      </div>

      <p className={styles.sectionLabel}>Preferencias del generador</p>
      <div className={styles.group}>
        <div className={styles.stepperRow}>
          <span>Semanas hacia atrás (anti-repetición)</span>
          <div className={styles.stepperControls}>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => setSemanasAtras((n) => Math.max(0, n - 1))}
              aria-label="Menos"
            >
              −
            </button>
            <span className={styles.stepperValue}>{semanasAtras}</span>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => setSemanasAtras((n) => n + 1)}
              aria-label="Más"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <p className={styles.hint}>En 0, la anti-repetición se desactiva del todo.</p>

      {editing && (
        <Sheet title={editing.index === null ? 'Nueva categoría' : 'Renombrar categoría'} onClose={() => setEditing(null)}>
          <input
            className={styles.sheetInput}
            placeholder="Nombre de la categoría…"
            value={editing.nombre}
            onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCategoria();
            }}
            autoFocus
          />
          <button type="button" className={styles.saveButton} onClick={commitCategoria}>
            Guardar
          </button>
        </Sheet>
      )}
    </div>
  );
}
