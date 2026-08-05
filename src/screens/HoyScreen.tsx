import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BackupSheet } from '../components/BackupSheet';
import { IconAjustes, IconArrowUpDown } from '../components/icons';
import { DayCard } from '../features/comidas/DayCard';
import { AsignarComidaSheet } from '../features/comidas/AsignarComidaSheet';
import { toISODate } from '../lib/week';
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
      <DayCard date={today} getComida={getComida} getPlatoNombre={getPlatoNombre} onTapSlot={setSelectedTipo} />

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
