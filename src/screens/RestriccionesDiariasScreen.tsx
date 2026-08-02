import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './RestriccionesDiariasScreen.module.css';
import sheetStyles from '../styles/reglaSheet.module.css';
import { Sheet } from '../components/Sheet';
import { resolveValorNombre } from '../lib/reglaDisplay';
import {
  getAllCategorias,
  getAllIngredientes,
  getAllPlatos,
  getAllReglasDiarias,
  reglaDiariaId,
  setReglaDiaria,
  type Categoria,
  type DiaSemana,
  type Ingrediente,
  type ModoRegla,
  type Plato,
  type ReglaDiaria,
  type TipoComida,
  type TipoReglaDiaria,
} from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

const DIAS: { label: string; slug: DiaSemana }[] = [
  { label: 'Lunes', slug: 'lunes' },
  { label: 'Martes', slug: 'martes' },
  { label: 'Miércoles', slug: 'miercoles' },
  { label: 'Jueves', slug: 'jueves' },
  { label: 'Viernes', slug: 'viernes' },
  { label: 'Sábado', slug: 'sabado' },
  { label: 'Domingo', slug: 'domingo' },
];
const TIPOS: { tipo: TipoComida; label: string }[] = [
  { tipo: 'comida', label: 'Comida' },
  { tipo: 'cena', label: 'Cena' },
];

interface DraftRegla {
  tipo: TipoReglaDiaria;
  valorId?: string;
  modo?: ModoRegla;
}

const TIPO_OPCIONES: { tipo: TipoReglaDiaria; label: string }[] = [
  { tipo: 'ninguna', label: 'Ninguna' },
  { tipo: 'no_elaborar', label: 'No elaborar' },
  { tipo: 'plato', label: 'Plato' },
  { tipo: 'ingrediente', label: 'Ingrediente' },
  { tipo: 'categoria', label: 'Categoría' },
];

interface EditingSlot {
  slug: DiaSemana;
  tipo: TipoComida;
  diaLabel: string;
  tipoLabel: string;
}

export function RestriccionesDiariasScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [reglas, setReglas] = useState<Record<string, ReglaDiaria>>({});
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [draft, setDraft] = useState<DraftRegla>({ tipo: 'ninguna' });
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    setTopLeftBack({ label: 'Restricciones', onClick: () => navigate('/restricciones') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  useEffect(() => {
    Promise.all([getAllPlatos(), getAllIngredientes(), getAllCategorias(), getAllReglasDiarias()]).then(
      ([p, i, c, r]) => {
        setPlatos(p);
        setIngredientes(i);
        setCategorias(c);
        setReglas(Object.fromEntries(r.map((regla) => [regla.id, regla])));
      },
    );
  }, []);

  function describeRegla(regla: ReglaDiaria | undefined): string {
    if (!regla || regla.tipo === 'ninguna') return 'Ninguna';
    if (regla.tipo === 'no_elaborar') return 'No elaborar';
    const modoLabel = regla.modo === 'prohibir' ? 'prohibir' : 'forzar';
    const nombre = resolveValorNombre(regla.tipo, regla.valorId, { platos, ingredientes, categorias });
    return `${nombre} (${modoLabel})`;
  }

  function openEditor(diaLabel: string, slug: DiaSemana, tipo: TipoComida, tipoLabel: string) {
    const existing = reglas[reglaDiariaId(slug, tipo)];
    setDraft(
      existing ? { tipo: existing.tipo, valorId: existing.valorId, modo: existing.modo ?? 'forzar' } : { tipo: 'ninguna' },
    );
    setEditingSlot({ slug, tipo, diaLabel, tipoLabel });
  }

  async function commitDraft() {
    if (!editingSlot) return;
    const regla: ReglaDiaria = {
      id: reglaDiariaId(editingSlot.slug, editingSlot.tipo),
      diaSemana: editingSlot.slug,
      tipoComida: editingSlot.tipo,
      tipo: draft.tipo,
      valorId: draft.valorId,
      modo: draft.modo,
    };
    await setReglaDiaria(regla);
    setReglas((prev) => ({ ...prev, [regla.id]: regla }));
    setEditingSlot(null);
  }

  const opcionesValor: { id: string; nombre: string }[] =
    draft.tipo === 'plato'
      ? platos.map((p) => ({ id: p.id, nombre: p.nombre }))
      : draft.tipo === 'ingrediente'
        ? ingredientes.map((i) => ({ id: i.id, nombre: i.nombre }))
        : draft.tipo === 'categoria'
          ? categorias.map((c) => ({ id: c.id, nombre: c.nombre }))
          : [];

  return (
    <div>
      {DIAS.map(({ label: diaLabel, slug }) => (
        <div key={slug} className={styles.card}>
          <p className={styles.dayLabel}>{diaLabel}</p>
          {TIPOS.map(({ tipo, label }) => (
            <button
              key={tipo}
              type="button"
              className={styles.row}
              onClick={() => openEditor(diaLabel, slug, tipo, label)}
            >
              <span className={styles.rowLabel}>{label}</span>
              <span className={styles.rowValue}>{describeRegla(reglas[reglaDiariaId(slug, tipo)])}</span>
            </button>
          ))}
        </div>
      ))}

      {editingSlot && (
        <Sheet title={`${editingSlot.diaLabel} · ${editingSlot.tipoLabel}`} onClose={() => setEditingSlot(null)}>
          <p className={sheetStyles.sectionLabel}>Tipo de regla</p>
          <div className={sheetStyles.optionGroup}>
            {TIPO_OPCIONES.map(({ tipo, label }) => (
              <button
                key={tipo}
                type="button"
                className={`${sheetStyles.optionRow} ${draft.tipo === tipo ? sheetStyles.optionRowSelected : ''}`}
                onClick={() => setDraft({ tipo, modo: 'forzar' })}
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
                    onClick={() => setDraft((d) => ({ ...d, valorId: opt.id }))}
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
