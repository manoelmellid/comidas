import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import sharedStyles from '../features/comidas/AsignarComidaSheet.module.css';
import sheetStyles from '../styles/reglaSheet.module.css';
import { Sheet } from '../components/Sheet';
import { CATEGORIAS_SEED } from '../lib/categoriasSeed';
import { getAllIngredientes, getAllPlatos, newId, type Ingrediente, type Plato } from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

type TipoObjetivo = 'plato' | 'ingrediente' | 'categoria';
type ModoGlobal = 'exacto' | 'minimo' | 'maximo';
type Aplica = 'comida' | 'cena' | 'ambas';

interface ReglaGlobal {
  id: string;
  tipo: TipoObjetivo;
  valorId: string;
  valorNombre: string;
  dias: number;
  modo: ModoGlobal;
  aplica: Aplica;
}

interface Draft {
  tipo: TipoObjetivo;
  valorId?: string;
  valorNombre?: string;
  dias: number;
  modo: ModoGlobal;
  aplica: Aplica;
}

const TIPO_OPCIONES: { tipo: TipoObjetivo; label: string }[] = [
  { tipo: 'plato', label: 'Plato' },
  { tipo: 'ingrediente', label: 'Ingrediente' },
  { tipo: 'categoria', label: 'Categoría' },
];

const MODO_OPCIONES: { modo: ModoGlobal; label: string }[] = [
  { modo: 'exacto', label: 'Exacto' },
  { modo: 'minimo', label: 'Mínimo' },
  { modo: 'maximo', label: 'Máximo' },
];

const APLICA_OPCIONES: { aplica: Aplica; label: string }[] = [
  { aplica: 'comida', label: 'Comida' },
  { aplica: 'cena', label: 'Cena' },
  { aplica: 'ambas', label: 'Ambas' },
];

const DRAFT_INICIAL: Draft = { tipo: 'plato', dias: 1, modo: 'minimo', aplica: 'ambas' };

function describeModo(modo: ModoGlobal): string {
  return modo === 'exacto' ? 'exacto' : modo === 'minimo' ? 'mínimo' : 'máximo';
}

function describeAplica(aplica: Aplica): string {
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

  const opcionesValor: { id: string; nombre: string }[] = useMemo(() => {
    if (draft.tipo === 'plato') return platos.map((p) => ({ id: p.id, nombre: p.nombre }));
    if (draft.tipo === 'ingrediente') return ingredientes.map((i) => ({ id: i.id, nombre: i.nombre }));
    return CATEGORIAS_SEED.map((c) => ({ id: c, nombre: c }));
  }, [draft.tipo, platos, ingredientes]);

  function openCreate() {
    setDraft(DRAFT_INICIAL);
    setCreating(true);
  }

  function commitDraft() {
    if (!draft.valorId || !draft.valorNombre) return;
    const regla: ReglaGlobal = {
      id: newId(),
      tipo: draft.tipo,
      valorId: draft.valorId,
      valorNombre: draft.valorNombre,
      dias: draft.dias,
      modo: draft.modo,
      aplica: draft.aplica,
    };
    setReglas((prev) => [...prev, regla]);
    setCreating(false);
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
              {r.valorNombre} · {describeModo(r.modo)} {r.dias} día(s) · {describeAplica(r.aplica)}
            </span>
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
                onClick={() => setDraft((d) => ({ ...d, tipo, valorId: undefined, valorNombre: undefined }))}
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
                onClick={() => setDraft((d) => ({ ...d, valorId: opt.id, valorNombre: opt.nombre }))}
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

          <p className={sheetStyles.sectionLabel}>Número de días</p>
          <input
            type="number"
            min={0}
            className={sheetStyles.numberInput}
            value={draft.dias}
            onChange={(e) => setDraft((d) => ({ ...d, dias: Math.max(0, Number(e.target.value)) }))}
          />

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
