import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './RestriccionesDiariasScreen.module.css';
import sheetStyles from '../styles/reglaSheet.module.css';
import { Sheet } from '../components/Sheet';
import { CATEGORIAS_SEED } from '../lib/categoriasSeed';
import { getAllIngredientes, getAllPlatos, type Ingrediente, type Plato } from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIPOS: { tipo: 'comida' | 'cena'; label: string }[] = [
  { tipo: 'comida', label: 'Comida' },
  { tipo: 'cena', label: 'Cena' },
];

type TipoReglaDiaria = 'ninguna' | 'no_elaborar' | 'plato' | 'ingrediente' | 'categoria';
type Modo = 'forzar' | 'prohibir';

interface ReglaDiariaLocal {
  tipo: TipoReglaDiaria;
  valorId?: string;
  valorNombre?: string;
  modo?: Modo;
}

const TIPO_OPCIONES: { tipo: TipoReglaDiaria; label: string }[] = [
  { tipo: 'ninguna', label: 'Ninguna' },
  { tipo: 'no_elaborar', label: 'No elaborar' },
  { tipo: 'plato', label: 'Plato' },
  { tipo: 'ingrediente', label: 'Ingrediente' },
  { tipo: 'categoria', label: 'Categoría' },
];

function slotKey(dia: string, tipo: string): string {
  return `${dia}-${tipo}`;
}

function describeRegla(regla: ReglaDiariaLocal | undefined): string {
  if (!regla || regla.tipo === 'ninguna') return 'Ninguna';
  if (regla.tipo === 'no_elaborar') return 'No elaborar';
  const modoLabel = regla.modo === 'prohibir' ? 'prohibir' : 'forzar';
  return `${regla.valorNombre ?? '—'} (${modoLabel})`;
}

export function RestriccionesDiariasScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [reglas, setReglas] = useState<Record<string, ReglaDiariaLocal>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReglaDiariaLocal>({ tipo: 'ninguna' });
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);

  useEffect(() => {
    setTopLeftBack({ label: 'Restricciones', onClick: () => navigate('/restricciones') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  useEffect(() => {
    Promise.all([getAllPlatos(), getAllIngredientes()]).then(([p, i]) => {
      setPlatos(p);
      setIngredientes(i);
    });
  }, []);

  function openEditor(key: string) {
    setDraft(reglas[key] ?? { tipo: 'ninguna' });
    setEditingKey(key);
  }

  function commitDraft() {
    if (!editingKey) return;
    setReglas((prev) => ({ ...prev, [editingKey]: draft }));
    setEditingKey(null);
  }

  const opcionesValor: { id: string; nombre: string }[] =
    draft.tipo === 'plato'
      ? platos.map((p) => ({ id: p.id, nombre: p.nombre }))
      : draft.tipo === 'ingrediente'
        ? ingredientes.map((i) => ({ id: i.id, nombre: i.nombre }))
        : draft.tipo === 'categoria'
          ? CATEGORIAS_SEED.map((c) => ({ id: c, nombre: c }))
          : [];

  return (
    <div>
      {DIAS.map((dia) => (
        <div key={dia} className={styles.card}>
          <p className={styles.dayLabel}>{dia}</p>
          {TIPOS.map(({ tipo, label }) => {
            const key = slotKey(dia, tipo);
            return (
              <button key={key} type="button" className={styles.row} onClick={() => openEditor(key)}>
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowValue}>{describeRegla(reglas[key])}</span>
              </button>
            );
          })}
        </div>
      ))}

      {editingKey && (
        <Sheet title={editingKey.replace('-', ' · ')} onClose={() => setEditingKey(null)}>
          <p className={sheetStyles.sectionLabel}>Tipo de regla</p>
          <div className={sheetStyles.optionGroup}>
            {TIPO_OPCIONES.map(({ tipo, label }) => (
              <button
                key={tipo}
                type="button"
                className={`${sheetStyles.optionRow} ${draft.tipo === tipo ? sheetStyles.optionRowSelected : ''}`}
                onClick={() => setDraft({ tipo })}
              >
                {label}
              </button>
            ))}
          </div>

          {(draft.tipo === 'plato' || draft.tipo === 'ingrediente' || draft.tipo === 'categoria') && (
            <>
              <p className={sheetStyles.sectionLabel}>
                {draft.tipo === 'plato' ? 'Plato' : draft.tipo === 'ingrediente' ? 'Ingrediente' : 'Categoría'}
              </p>
              <div className={sheetStyles.optionGroup}>
                {opcionesValor.length === 0 && (
                  <p className={sheetStyles.optionRow}>No hay opciones todavía.</p>
                )}
                {opcionesValor.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${sheetStyles.optionRow} ${draft.valorId === opt.id ? sheetStyles.optionRowSelected : ''}`}
                    onClick={() => setDraft((d) => ({ ...d, valorId: opt.id, valorNombre: opt.nombre }))}
                  >
                    {opt.nombre}
                  </button>
                ))}
              </div>

              <p className={sheetStyles.sectionLabel}>Modo</p>
              <div className={sheetStyles.segmented}>
                <button
                  type="button"
                  className={`${sheetStyles.segmentButton} ${draft.modo !== 'prohibir' ? sheetStyles.segmentButtonActive : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, modo: 'forzar' }))}
                >
                  Forzar
                </button>
                <button
                  type="button"
                  className={`${sheetStyles.segmentButton} ${draft.modo === 'prohibir' ? sheetStyles.segmentButtonActive : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, modo: 'prohibir' }))}
                >
                  Prohibir
                </button>
              </div>
            </>
          )}

          <button type="button" className={sheetStyles.saveButton} onClick={commitDraft}>
            Guardar
          </button>
        </Sheet>
      )}
    </div>
  );
}
