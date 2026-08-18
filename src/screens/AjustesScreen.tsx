import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './AjustesScreen.module.css';
import { Sheet } from '../components/Sheet';
import { CategoriaPickerSheet } from '../components/CategoriaPickerSheet';
import { CATEGORIA_FALLBACK_ID } from '../lib/categoriasSeed';
import {
  deleteCategoria,
  getAllCategorias,
  getAllPlatos,
  getAllReglasDiarias,
  getAllReglasGlobales,
  getPreferencias,
  mergeCategoria,
  newId,
  saveCategoria,
  setPreferencias,
  type Categoria,
  type Plato,
  type ReglaDiaria,
  type ReglaGlobal,
} from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

interface EditingCategoria {
  id: string | null; // null = crear nueva
  nombre: string;
}

export function AjustesScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [reglasDiarias, setReglasDiarias] = useState<ReglaDiaria[]>([]);
  const [reglasGlobales, setReglasGlobales] = useState<ReglaGlobal[]>([]);
  const [editing, setEditing] = useState<EditingCategoria | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mergeFrom, setMergeFrom] = useState<Categoria | null>(null);
  const [semanasAtras, setSemanasAtras] = useState(1);

  useEffect(() => {
    setTopLeftBack({ label: 'Hoy', onClick: () => navigate('/') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  async function reloadCategoriasUso() {
    const [c, p, rd, rg] = await Promise.all([
      getAllCategorias(),
      getAllPlatos(),
      getAllReglasDiarias(),
      getAllReglasGlobales(),
    ]);
    setCategorias(c);
    setPlatos(p);
    setReglasDiarias(rd);
    setReglasGlobales(rg);
  }

  useEffect(() => {
    reloadCategoriasUso();
    getPreferencias().then((prefs) => setSemanasAtras(prefs.semanasAtras));
  }, []);

  const usoCategoria = useMemo(() => {
    if (!editing?.id) return 0;
    const id = editing.id;
    return (
      platos.filter((p) => p.categoriaId === id).length +
      reglasDiarias.filter((r) => r.tipo === 'categoria' && r.valorId === id).length +
      reglasGlobales.filter((r) => r.tipo === 'categoria' && r.valorId === id).length
    );
  }, [editing, platos, reglasDiarias, reglasGlobales]);

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

  async function handleDeleteClick() {
    if (!editing?.id) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (usoCategoria > 0) {
      setMergeFrom({ id: editing.id, nombre: editing.nombre });
      setEditing(null);
    } else {
      await deleteCategoria(editing.id);
      setCategorias((prev) => prev.filter((c) => c.id !== editing.id));
      setEditing(null);
    }
    setConfirmingDelete(false);
  }

  async function handleMergeSelect(toId: string) {
    if (!mergeFrom) return;
    await mergeCategoria(mergeFrom.id, toId);
    await reloadCategoriasUso();
    setMergeFrom(null);
  }

  async function updateSemanasAtras(nuevo: number) {
    setSemanasAtras(nuevo);
    await setPreferencias(nuevo);
  }

  return (
    <div>
      <p className={styles.sectionLabel}>Categorías de plato</p>
      <div className={styles.group}>
        {categorias.map((categoria) => (
          <button
            type="button"
            key={categoria.id}
            className={styles.row}
            onClick={() => {
              setEditing({ id: categoria.id, nombre: categoria.nombre });
              setConfirmingDelete(false);
            }}
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
        <Sheet
          title={editing.id === null ? 'Nueva categoría' : 'Renombrar categoría'}
          onClose={() => {
            setEditing(null);
            setConfirmingDelete(false);
          }}
        >
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

          {editing.id !== null &&
            (editing.id === CATEGORIA_FALLBACK_ID ? (
              <p className={styles.hint}>Esta categoría es la de reserva del sistema y no se puede eliminar.</p>
            ) : (
              <div className={styles.group}>
                <button type="button" className={`${styles.row} ${styles.rowDanger}`} onClick={handleDeleteClick}>
                  {confirmingDelete
                    ? usoCategoria > 0
                      ? 'Está en uso: se fusionará con otra categoría que elijas. Toca de nuevo para confirmar'
                      : '¿Seguro? Toca de nuevo para confirmar'
                    : 'Eliminar categoría'}
                </button>
              </div>
            ))}
        </Sheet>
      )}

      {mergeFrom && (
        <CategoriaPickerSheet
          categorias={categorias.filter((c) => c.id !== mergeFrom.id)}
          title={`Fusionar "${mergeFrom.nombre}" con…`}
          onSelect={handleMergeSelect}
          onClose={() => setMergeFrom(null)}
        />
      )}
    </div>
  );
}
