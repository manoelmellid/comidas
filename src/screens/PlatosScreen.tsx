import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PlatoDetail } from '../features/comidas/PlatoDetail';
import sharedStyles from '../features/comidas/AsignarComidaSheet.module.css';
import styles from './PlatosScreen.module.css';
import { IconIngredientes } from '../components/icons';
import { normalizeText } from '../lib/normalize';
import type { LayoutContext } from '../lib/layoutContext';
import {
  deletePlato,
  getAllCategorias,
  getAllComidas,
  getAllIngredientes,
  getAllPlatos,
  newId,
  savePlato,
  saveIngrediente,
  type Categoria,
  type Comida,
  type Ingrediente,
  type Plato,
  type TipoPlato,
} from '../lib/db';

const TIPO_LABEL: Record<TipoPlato, string> = {
  comida: 'Comida',
  cena: 'Cena',
  ambas: 'Ambas',
};

export function PlatosScreen() {
  const navigate = useNavigate();
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { setTopLeftBack, setTitle, setTopRightActions } = useOutletContext<LayoutContext>();

  useEffect(() => {
    Promise.all([getAllPlatos(), getAllIngredientes(), getAllCategorias(), getAllComidas()]).then(([p, i, c, cm]) => {
      setPlatos(p);
      setIngredientes(i);
      setCategorias(c);
      setComidas(cm);
      setLoading(false);
    });
  }, []);

  const selectedPlato = platos.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedPlato) {
      setTitle(selectedPlato.nombre);
      setTopLeftBack({ label: 'Platos', onClick: () => setSelectedId(null) });
      setTopRightActions([]);
    } else {
      setTitle(null);
      setTopLeftBack(null);
      setTopRightActions([
        {
          icon: <IconIngredientes />,
          label: 'Ingredientes',
          onClick: () => navigate('/ingredientes'),
        },
      ]);
    }
    return () => {
      setTitle(null);
      setTopLeftBack(null);
      setTopRightActions([]);
    };
  }, [selectedPlato, setTitle, setTopLeftBack, setTopRightActions, navigate]);

  const filtered = useMemo(() => {
    const sorted = [...platos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const q = normalizeText(query.trim());
    if (!q) return sorted;
    return sorted.filter((p) => normalizeText(p.nombre).includes(q));
  }, [platos, query]);

  const exactMatch = platos.some((p) => normalizeText(p.nombre) === normalizeText(query.trim()));

  async function handleCreate() {
    const nombre = query.trim();
    if (!nombre) return;
    const plato: Plato = { id: newId(), nombre, ingredientes: [], notas: '', tipo: 'ambas' };
    await savePlato(plato);
    setPlatos((prev) => [...prev, plato]);
    setQuery('');
    setSelectedId(plato.id);
  }

  async function handleUpdatePlato(plato: Plato) {
    await savePlato(plato);
    setPlatos((prev) => prev.map((p) => (p.id === plato.id ? plato : p)));
    setSelectedId(null);
  }

  async function handleDeletePlato(id: string) {
    await deletePlato(id);
    setPlatos((prev) => prev.filter((p) => p.id !== id));
    setSelectedId(null);
  }

  async function handleCreateIngrediente(nombre: string, categoriaId: string): Promise<string> {
    const ingrediente: Ingrediente = { id: newId(), nombre, categoriaId };
    await saveIngrediente(ingrediente);
    setIngredientes((prev) => [...prev, ingrediente]);
    return ingrediente.id;
  }

  async function handleRenameIngrediente(id: string, nombre: string) {
    const existente = ingredientes.find((i) => i.id === id);
    if (!existente) return;
    const ingrediente: Ingrediente = { ...existente, nombre };
    await saveIngrediente(ingrediente);
    setIngredientes((prev) => prev.map((i) => (i.id === id ? ingrediente : i)));
  }

  if (loading) return null;

  if (selectedPlato) {
    return (
      <PlatoDetail
        plato={selectedPlato}
        ingredientes={ingredientes}
        categorias={categorias}
        usageCount={comidas.filter((c) => c.platoId === selectedPlato.id).length}
        onSave={handleUpdatePlato}
        onDelete={() => handleDeletePlato(selectedPlato.id)}
        onCreateIngrediente={handleCreateIngrediente}
        onRenameIngrediente={handleRenameIngrediente}
      />
    );
  }

  return (
    <div>
      <input
        className={sharedStyles.search}
        placeholder="Buscar o crear plato…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim() && !exactMatch) handleCreate();
        }}
      />

      <div className={sharedStyles.group}>
        {query.trim() && !exactMatch && (
          <button type="button" className={`${sharedStyles.row} ${sharedStyles.rowAccent}`} onClick={handleCreate}>
            + Crear "{query.trim()}"
          </button>
        )}
        {filtered.length === 0 && !query.trim() && (
          <p className={sharedStyles.emptyHint}>Aún no tienes platos. Escribe uno arriba para crearlo.</p>
        )}
        {filtered.map((p) => (
          <button key={p.id} type="button" className={sharedStyles.row} onClick={() => setSelectedId(p.id)}>
            <span className={styles.nombre}>{p.nombre}</span>
            <span className={styles.right}>
              <span className={styles.tipo}>{TIPO_LABEL[p.tipo ?? 'ambas']}</span>
              <span className={sharedStyles.rowSecondary}>›</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
