import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './AjustesScreen.module.css';
import { Sheet } from '../components/Sheet';
import { getAllCategorias, getPreferencias, newId, saveCategoria, setPreferencias, type Categoria } from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

interface EditingCategoria {
  id: string | null; // null = crear nueva
  nombre: string;
}

export function AjustesScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editing, setEditing] = useState<EditingCategoria | null>(null);
  const [semanasAtras, setSemanasAtras] = useState(1);

  useEffect(() => {
    setTopLeftBack({ label: 'Hoy', onClick: () => navigate('/') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  useEffect(() => {
    Promise.all([getAllCategorias(), getPreferencias()]).then(([c, prefs]) => {
      setCategorias(c);
      setSemanasAtras(prefs.semanasAtras);
    });
  }, []);

  async function commitCategoria() {
    const nombre = editing?.nombre.trim();
    if (editing && nombre) {
      const categoria: Categoria = { id: editing.id ?? newId(), nombre };
      await saveCategoria(categoria);
      setCategorias((prev) =>
        editing.id === null ? [...prev, categoria] : prev.map((c) => (c.id === editing.id ? categoria : c)),
      );
    }
    setEditing(null);
  }

  async function updateSemanasAtras(nuevo: number) {
    setSemanasAtras(nuevo);
    await setPreferencias(nuevo);
  }

  return (
    <div>
      <p className={styles.sectionLabel}>Categorías de ingrediente</p>
      <div className={styles.group}>
        {categorias.map((categoria) => (
          <button
            type="button"
            key={categoria.id}
            className={styles.row}
            onClick={() => setEditing({ id: categoria.id, nombre: categoria.nombre })}
          >
            <span>{categoria.nombre}</span>
            <span className={styles.rowSecondary}>›</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.row} ${styles.rowAccent}`}
          onClick={() => setEditing({ id: null, nombre: '' })}
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
              onClick={() => updateSemanasAtras(Math.max(0, semanasAtras - 1))}
              aria-label="Menos"
            >
              −
            </button>
            <span className={styles.stepperValue}>{semanasAtras}</span>
            <button
              type="button"
              className={styles.stepperButton}
              onClick={() => updateSemanasAtras(semanasAtras + 1)}
              aria-label="Más"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <p className={styles.hint}>En 0, la anti-repetición se desactiva del todo.</p>

      {editing && (
        <Sheet title={editing.id === null ? 'Nueva categoría' : 'Renombrar categoría'} onClose={() => setEditing(null)}>
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
