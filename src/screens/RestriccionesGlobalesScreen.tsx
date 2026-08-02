import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import sharedStyles from '../features/comidas/AsignarComidaSheet.module.css';
import sheetStyles from '../styles/reglaSheet.module.css';
import stepperStyles from './AjustesScreen.module.css';
import { Sheet } from '../components/Sheet';
import { resolveValorNombre } from '../lib/reglaDisplay';
import {
  deleteReglaGlobal,
  getAllCategorias,
  getAllIngredientes,
  getAllPlatos,
  getAllReglasGlobales,
  newId,
  saveReglaGlobal,
  type AplicaGlobal,
  type Categoria,
  type Ingrediente,
  type ModoGlobal,
  type Plato,
  type ReglaGlobal,
  type TipoObjetivoGlobal,
} from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

interface Draft {
  tipo: TipoObjetivoGlobal;
  valorId?: string;
  dias: number;
  modo: ModoGlobal;
  aplica: AplicaGlobal;
}

const TIPO_OPCIONES: { tipo: TipoObjetivoGlobal; label: string }[] = [
  { tipo: 'plato', label: 'Plato' },
  { tipo: 'ingrediente', label: 'Ingrediente' },
  { tipo: 'categoria', label: 'Categoría' },
];

const MODO_OPCIONES: { modo: ModoGlobal; label: string }[] = [
  { modo: 'exacto', label: 'Exacto' },
  { modo: 'minimo', label: 'Mínimo' },
  { modo: 'maximo', label: 'Máximo' },
];

const APLICA_OPCIONES: { aplica: AplicaGlobal; label: string }[] = [
  { aplica: 'comida', label: 'Comida' },
  { aplica: 'cena', label: 'Cena' },
  { aplica: 'ambas', label: 'Ambas' },
];

const DRAFT_INICIAL: Draft = { tipo: 'plato', dias: 1, modo: 'minimo', aplica: 'ambas' };

function describeModo(modo: ModoGlobal): string {
  return modo === 'exacto' ? 'exacto' : modo === 'minimo' ? 'mínimo' : 'máximo';
}

function describeAplica(aplica: AplicaGlobal): string {
  return aplica === 'ambas' ? 'Comida y cena' : aplica === 'comida' ? 'Comida' : 'Cena';
}

export function RestriccionesGlobalesScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [reglas, setReglas] = useState<ReglaGlobal[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(DRAFT_INICIAL);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setTopLeftBack({ label: 'Restricciones', onClick: () => navigate('/restricciones') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  useEffect(() => {
    Promise.all([getAllPlatos(), getAllIngredientes(), getAllCategorias(), getAllReglasGlobales()]).then(
      ([p, i, c, r]) => {
        setPlatos(p);
        setIngredientes(i);
        setCategorias(c);
        setReglas(r);
      },
    );
  }, []);

  const opcionesValor: { id: string; nombre: string }[] = useMemo(() => {
    if (draft.tipo === 'plato') return platos.map((p) => ({ id: p.id, nombre: p.nombre }));
    if (draft.tipo === 'ingrediente') return ingredientes.map((i) => ({ id: i.id, nombre: i.nombre }));
    return categorias.map((c) => ({ id: c.id, nombre: c.nombre }));
  }, [draft.tipo, platos, ingredientes, categorias]);

  function openCreate() {
    setDraft(DRAFT_INICIAL);
    setCreating(true);
  }

  async function commitDraft() {
    if (!draft.valorId) return;
    const regla: ReglaGlobal = {
      id: newId(),
      tipo: draft.tipo,
      valorId: draft.valorId,
      dias: draft.dias,
      modo: draft.modo,
      aplica: draft.aplica,
    };
    await saveReglaGlobal(regla);
    setReglas((prev) => [...prev, regla]);
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    await deleteReglaGlobal(id);
    setReglas((prev) => prev.filter((r) => r.id !== id));
    setConfirmingDeleteId(null);
  }

  return (
    <div>
      <div className={sharedStyles.group}>
        {reglas.length === 0 && (
          <p className={sharedStyles.emptyHint}>Aún no tienes reglas globales. Crea una abajo.</p>
        )}
        {reglas.map((r) => (
          <div key={r.id} className={sharedStyles.row}>
            <span>
              {resolveValorNombre(r.tipo, r.valorId, { platos, ingredientes, categorias })} · {describeModo(r.modo)}{' '}
              {r.dias} día(s) · {describeAplica(r.aplica)}
            </span>
            <button type="button" className={sharedStyles.rowDanger} onClick={() => handleDelete(r.id)}>
              {confirmingDeleteId === r.id ? '¿Seguro?' : 'Eliminar'}
            </button>
          </div>
        ))}
      </div>

      <div className={sharedStyles.group}>
        <button type="button" className={`${sharedStyles.row} ${sharedStyles.rowAccent}`} onClick={openCreate}>
          + Crear regla
        </button>
      </div>

      {creating && (
        <Sheet title="Nueva regla global" onClose={() => setCreating(false)}>
          <p className={sheetStyles.sectionLabel}>Objetivo</p>
          <div className={sheetStyles.segmented}>
            {TIPO_OPCIONES.map(({ tipo, label }) => (
              <button
                key={tipo}
                type="button"
                className={`${sheetStyles.segmentButton} ${draft.tipo === tipo ? sheetStyles.segmentButtonActive : ''}`}
                onClick={() => setDraft((d) => ({ ...d, tipo, valorId: undefined }))}
              >
                {label}
              </button>
            ))}
          </div>

          <p className={sheetStyles.sectionLabel}>
            {draft.tipo === 'plato' ? 'Plato' : draft.tipo === 'ingrediente' ? 'Ingrediente' : 'Categoría'}
          </p>
          <div className={sheetStyles.optionGroup}>
            {opcionesValor.length === 0 && <p className={sheetStyles.optionRow}>No hay opciones todavía.</p>}
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
            {MODO_OPCIONES.map(({ modo, label }) => (
              <button
                key={modo}
                type="button"
                className={`${sheetStyles.segmentButton} ${draft.modo === modo ? sheetStyles.segmentButtonActive : ''}`}
                onClick={() => setDraft((d) => ({ ...d, modo }))}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={stepperStyles.group}>
            <div className={stepperStyles.stepperRow}>
              <span>Número de días</span>
              <div className={stepperStyles.stepperControls}>
                <button
                  type="button"
                  className={stepperStyles.stepperButton}
                  onClick={() => setDraft((d) => ({ ...d, dias: Math.max(0, d.dias - 1) }))}
                  aria-label="Menos"
                >
                  −
                </button>
                <span className={stepperStyles.stepperValue}>{draft.dias}</span>
                <button
                  type="button"
                  className={stepperStyles.stepperButton}
                  onClick={() => setDraft((d) => ({ ...d, dias: d.dias + 1 }))}
                  aria-label="Más"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <p className={sheetStyles.sectionLabel}>Aplica a</p>
          <div className={sheetStyles.segmented}>
            {APLICA_OPCIONES.map(({ aplica, label }) => (
              <button
                key={aplica}
                type="button"
                className={`${sheetStyles.segmentButton} ${draft.aplica === aplica ? sheetStyles.segmentButtonActive : ''}`}
                onClick={() => setDraft((d) => ({ ...d, aplica }))}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" className={sheetStyles.saveButton} onClick={commitDraft}>
            Guardar
          </button>
        </Sheet>
      )}
    </div>
  );
}
