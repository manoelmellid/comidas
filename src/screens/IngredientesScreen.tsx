import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import sharedStyles from '../features/comidas/AsignarComidaSheet.module.css';
import styles from './IngredientesScreen.module.css';
import {
  deleteIngrediente,
  getAllIngredientes,
  getAllPlatos,
  newId,
  saveIngrediente,
  type Ingrediente,
  type Plato,
} from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

export function IngredientesScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setTopLeftBack({ label: 'Platos', onClick: () => navigate('/platos') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  useEffect(() => {
    Promise.all([getAllIngredientes(), getAllPlatos()]).then(([i, p]) => {
      setIngredientes(i);
      setPlatos(p);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const sorted = [...ingredientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [ingredientes, query]);

  const exactMatch = ingredientes.some((i) => i.nombre.toLowerCase() === query.trim().toLowerCase());

  function usageCount(id: string): number {
    return platos.filter((p) => p.ingredientes.some((pi) => pi.ingredienteId === id)).length;
  }

  async function handleCreate() {
    const nombre = query.trim();
    if (!nombre) return;
    const ingrediente: Ingrediente = { id: newId(), nombre };
    await saveIngrediente(ingrediente);
    setIngredientes((prev) => [...prev, ingrediente]);
    setQuery('');
  }

  function startRename(ing: Ingrediente) {
    setRenamingId(ing.id);
    setRenameDraft(ing.nombre);
  }

  async function commitRename() {
    if (renamingId === null) return;
    const nombre = renameDraft.trim();
    if (nombre) {
      const ingrediente: Ingrediente = { id: renamingId, nombre };
      await saveIngrediente(ingrediente);
      setIngredientes((prev) => prev.map((i) => (i.id === renamingId ? ingrediente : i)));
    }
    setRenamingId(null);
  }

  async function handleDelete(id: string) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    await deleteIngrediente(id);
    setIngredientes((prev) => prev.filter((i) => i.id !== id));
    setConfirmingDeleteId(null);
  }

  if (loading) return null;

  return (
    <div>
      <input
        className={sharedStyles.search}
        placeholder="Buscar o crear ingrediente…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim() && !exactMatch) handleCreate();
        }}
        autoFocus
      />

      <div className={sharedStyles.group}>
        {query.trim() && !exactMatch && (
          <button type="button" className={`${sharedStyles.row} ${sharedStyles.rowAccent}`} onClick={handleCreate}>
            + Crear "{query.trim()}"
          </button>
        )}
        {filtered.length === 0 && !query.trim() && (
          <p className={sharedStyles.emptyHint}>Aún no tienes ingredientes. Escribe uno arriba para crearlo.</p>
        )}
        {filtered.map((ing) => {
          const count = usageCount(ing.id);
          return (
            <div key={ing.id} className={sharedStyles.row}>
              {renamingId === ing.id ? (
                <input
                  className={styles.renameInput}
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                  }}
                  autoFocus
                />
              ) : (
                <button type="button" className={styles.nombreButton} onClick={() => startRename(ing)}>
                  {ing.nombre}
                </button>
              )}
              <button type="button" className={styles.deleteButton} onClick={() => handleDelete(ing.id)}>
                {confirmingDeleteId === ing.id
                  ? count > 0
                    ? `¿Seguro? En ${count} plato(s)`
                    : '¿Seguro?'
                  : 'Eliminar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
