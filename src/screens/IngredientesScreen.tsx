import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import sharedStyles from '../features/comidas/AsignarComidaSheet.module.css';
import styles from './IngredientesScreen.module.css';
import { CategoriaPickerSheet } from '../components/CategoriaPickerSheet';
import {
  deleteIngrediente,
  getAllCategorias,
  getAllIngredientes,
  getAllPlatos,
  newId,
  saveIngrediente,
  type Categoria,
  type Ingrediente,
  type Plato,
} from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

export function IngredientesScreen() {
  const navigate = useNavigate();
  const { setTopLeftBack } = useOutletContext<LayoutContext>();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [pendingCreateNombre, setPendingCreateNombre] = useState<string | null>(null);
  const [recategorizingId, setRecategorizingId] = useState<string | null>(null);

  useEffect(() => {
    setTopLeftBack({ label: 'Platos', onClick: () => navigate('/platos') });
    return () => setTopLeftBack(null);
  }, [setTopLeftBack, navigate]);

  useEffect(() => {
    Promise.all([getAllIngredientes(), getAllPlatos(), getAllCategorias()]).then(([i, p, c]) => {
      setIngredientes(i);
      setPlatos(p);
      setCategorias(c);
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

  function categoriaNombre(categoriaId: string): string {
    return categorias.find((c) => c.id === categoriaId)?.nombre ?? '—';
  }

  function handleCreate() {
    const nombre = query.trim();
    if (!nombre) return;
    setPendingCreateNombre(nombre);
  }

  async function handleSelectCategoriaCreate(categoriaId: string) {
    if (!pendingCreateNombre) return;
    const ingrediente: Ingrediente = { id: newId(), nombre: pendingCreateNombre, categoriaId };
    await saveIngrediente(ingrediente);
    setIngredientes((prev) => [...prev, ingrediente]);
    setQuery('');
    setPendingCreateNombre(null);
  }

  async function handleSelectCategoriaRecategorize(categoriaId: string) {
    if (!recategorizingId) return;
    const ing = ingredientes.find((i) => i.id === recategorizingId);
    if (ing) {
      const actualizado: Ingrediente = { ...ing, categoriaId };
      await saveIngrediente(actualizado);
      setIngredientes((prev) => prev.map((i) => (i.id === recategorizingId ? actualizado : i)));
    }
    setRecategorizingId(null);
  }

  function startRename(ing: Ingrediente) {
    setRenamingId(ing.id);
    setRenameDraft(ing.nombre);
  }

  async function commitRename() {
    if (renamingId === null) return;
    const nombre = renameDraft.trim();
    if (nombre) {
      const ing = ingredientes.find((i) => i.id === renamingId);
      if (ing) {
        const actualizado: Ingrediente = { ...ing, nombre };
        await saveIngrediente(actualizado);
        setIngredientes((prev) => prev.map((i) => (i.id === renamingId ? actualizado : i)));
      }
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
              <button
                type="button"
                className={styles.categoriaLabel}
                onClick={() => setRecategorizingId(ing.id)}
              >
                {categoriaNombre(ing.categoriaId)}
              </button>
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

      {pendingCreateNombre !== null && (
        <CategoriaPickerSheet
          categorias={categorias}
          title="Categoría del ingrediente"
          onSelect={handleSelectCategoriaCreate}
          onClose={() => setPendingCreateNombre(null)}
        />
      )}

      {recategorizingId !== null && (
        <CategoriaPickerSheet
          categorias={categorias}
          selectedId={ingredientes.find((i) => i.id === recategorizingId)?.categoriaId}
          title="Cambiar categoría"
          onSelect={handleSelectCategoriaRecategorize}
          onClose={() => setRecategorizingId(null)}
        />
      )}
    </div>
  );
}
