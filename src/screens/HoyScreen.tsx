import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './HoyScreen.module.css';
import { BackupSheet } from '../components/BackupSheet';
import { IconAjustes, IconArrowUpDown } from '../components/icons';
import { AsignarComidaSheet } from '../features/comidas/AsignarComidaSheet';
import { resolveComidaDisplay, type ComidaDisplayVariant } from '../lib/comidaDisplay';
import { formatFullDayLabel, toISODate } from '../lib/week';
import {
  comidaId,
  getAllComidas,
  getAllPlatos,
  newId,
  savePlato,
  setComida,
  clearComida,
  type Comida,
  type Especial,
  type Plato,
  type TipoComida,
} from '../lib/db';
import type { LayoutContext } from '../lib/layoutContext';

const TIPOS: { tipo: TipoComida; label: string }[] = [
  { tipo: 'comida', label: 'Comida' },
  { tipo: 'cena', label: 'Cena' },
];

const VALOR_CLASS: Record<ComidaDisplayVariant, string> = {
  vacio: styles.valorVacio,
  especial: styles.valorEspecial,
  eliminado: styles.valorEliminado,
  no_elaborar: styles.valorNoElaborar,
  fallido: styles.valorFallido,
  normal: '',
};

export function HoyScreen() {
  const navigate = useNavigate();
  const { setTopRightActions } = useOutletContext<LayoutContext>();
  const [backupOpen, setBackupOpen] = useState(false);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<TipoComida | null>(null);

  const today = new Date();
  const fecha = toISODate(today);

  useEffect(() => {
    setTopRightActions([
      { icon: <IconArrowUpDown />, label: 'Copia de seguridad', onClick: () => setBackupOpen(true) },
      { icon: <IconAjustes />, label: 'Ajustes', onClick: () => navigate('/ajustes') },
    ]);
    return () => setTopRightActions([]);
  }, [setTopRightActions, navigate]);

  useEffect(() => {
    Promise.all([getAllPlatos(), getAllComidas()]).then(([p, c]) => {
      setPlatos(p);
      setComidas(c);
      setLoading(false);
    });
  }, []);

  function getComida(tipo: TipoComida): Comida | undefined {
    return comidas.find((c) => c.id === comidaId(fecha, tipo));
  }

  function getPlatoNombre(platoId: string): string {
    return platos.find((p) => p.id === platoId)?.nombre ?? '(eliminado)';
  }

  function upsertLocalComida(c: Comida) {
    setComidas((prev) => [...prev.filter((x) => x.id !== c.id), c]);
  }

  async function handleCreatePlato(nombre: string): Promise<string> {
    const plato: Plato = { id: newId(), nombre, ingredientes: [], notas: '', tipo: 'ambas' };
    await savePlato(plato);
    setPlatos((prev) => [...prev, plato]);
    return plato.id;
  }

  async function handleAssignPlato(platoId: string) {
    if (!selectedTipo) return;
    const c: Comida = { id: comidaId(fecha, selectedTipo), fecha, tipo: selectedTipo, platoId, especial: null, tags: [] };
    await setComida(c);
    upsertLocalComida(c);
    setSelectedTipo(null);
  }

  async function handleAssignEspecial(especial: Especial, tags: string[]) {
    if (!selectedTipo) return;
    const c: Comida = { id: comidaId(fecha, selectedTipo), fecha, tipo: selectedTipo, platoId: null, especial, tags };
    await setComida(c);
    upsertLocalComida(c);
    setSelectedTipo(null);
  }

  async function handleClear() {
    if (!selectedTipo) return;
    await clearComida(fecha, selectedTipo);
    setComidas((prev) => prev.filter((c) => c.id !== comidaId(fecha, selectedTipo)));
    setSelectedTipo(null);
  }

  if (loading) return null;

  return (
    <>
      <p className={styles.dateHeader}>{formatFullDayLabel(today)}</p>

      {TIPOS.map(({ tipo, label }) => {
        const { texto, variant } = resolveComidaDisplay(getComida(tipo), getPlatoNombre);
        return (
          <button
            key={tipo}
            type="button"
            className={styles.mealCard}
            onClick={() => setSelectedTipo(tipo)}
          >
            <span className={styles.mealLabel}>{label}</span>
            <span className={`${styles.mealValue} ${VALOR_CLASS[variant]}`}>{texto}</span>
          </button>
        );
      })}

      {selectedTipo && (
        <AsignarComidaSheet
          fecha={fecha}
          tipo={selectedTipo}
          platos={platos}
          currentComida={getComida(selectedTipo)}
          onClose={() => setSelectedTipo(null)}
          onAssignPlato={handleAssignPlato}
          onAssignEspecial={handleAssignEspecial}
          onCreatePlato={handleCreatePlato}
          onClear={handleClear}
        />
      )}

      {backupOpen && <BackupSheet onClose={() => setBackupOpen(false)} />}
    </>
  );
}
