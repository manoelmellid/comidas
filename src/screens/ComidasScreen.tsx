import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ComidasScreen.module.css';
import { WeekNav } from '../features/comidas/WeekNav';
import { DayCard } from '../features/comidas/DayCard';
import { AsignarComidaSheet } from '../features/comidas/AsignarComidaSheet';
import { getWeekDays, isSameDate, toISODate } from '../lib/week';
import { generarSemana } from '../lib/generador';
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

interface SlotSelection {
  fecha: string;
  tipo: TipoComida;
}

export function ComidasScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const todayCardRef = useRef<HTMLDivElement | null>(null);
  const dayListRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToTodayRef = useRef(false);

  useEffect(() => {
    Promise.all([getAllPlatos(), getAllComidas()]).then(([p, c]) => {
      setPlatos(p);
      setComidas(c);
      setLoading(false);
    });
  }, []);

  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  useEffect(() => {
    if (weekOffset !== 0 || loading) return;

    function scrollToToday() {
      const container = dayListRef.current;
      const card = todayCardRef.current;
      if (!container || !card) return;
      const delta = card.getBoundingClientRect().top - container.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      container.scrollBy({ top: delta, behavior: hasScrolledToTodayRef.current ? 'smooth' : 'auto' });
      hasScrolledToTodayRef.current = true;
    }

    // Doble rAF: espera a que el layout real (cabecera + zona de scroll de los días) esté
    // asentado antes de medir — en el dispositivo real un solo rAF no siempre basta.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(scrollToToday);
    });
    // Corrección de respaldo: en el dispositivo real, algo (fuentes, iconos) puede
    // asentarse un poco más tarde que dos frames — un reintento sin animación corrige
    // cualquier desajuste residual sin que se note como un segundo scroll.
    const retryTimeout = setTimeout(scrollToToday, 350);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(retryTimeout);
    };
  }, [weekOffset, loading]);

  function getComida(fecha: string, tipo: TipoComida): Comida | undefined {
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
    if (!selection) return;
    const c: Comida = {
      id: comidaId(selection.fecha, selection.tipo),
      fecha: selection.fecha,
      tipo: selection.tipo,
      platoId,
      especial: null,
      tags: [],
    };
    await setComida(c);
    upsertLocalComida(c);
    setSelection(null);
  }

  async function handleAssignEspecial(especial: Especial, tags: string[]) {
    if (!selection) return;
    const c: Comida = {
      id: comidaId(selection.fecha, selection.tipo),
      fecha: selection.fecha,
      tipo: selection.tipo,
      platoId: null,
      especial,
      tags,
    };
    await setComida(c);
    upsertLocalComida(c);
    setSelection(null);
  }

  async function handleClear() {
    if (!selection) return;
    await clearComida(selection.fecha, selection.tipo);
    setComidas((prev) => prev.filter((c) => c.id !== comidaId(selection.fecha, selection.tipo)));
    setSelection(null);
  }

  async function handleGenerar() {
    const { incumplidas } = await generarSemana();
    const [p, c] = await Promise.all([getAllPlatos(), getAllComidas()]);
    setPlatos(p);
    setComidas(c);
    if (incumplidas.length > 0) alert(incumplidas.join('\n'));
  }

  if (loading) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <WeekNav days={days} weekOffset={weekOffset} onChangeOffset={setWeekOffset} />

        <button type="button" className={styles.generarButton} onClick={handleGenerar}>
          Generar próximos 7 días
        </button>
      </div>

      <div className={styles.dayList} ref={dayListRef}>
        {days.map((date) => {
          const fecha = toISODate(date);
          const isToday = isSameDate(date, new Date());
          return (
            <div key={fecha} ref={isToday ? todayCardRef : undefined}>
              <DayCard
                date={date}
                getComida={(tipo) => getComida(fecha, tipo)}
                getPlatoNombre={getPlatoNombre}
                onTapSlot={(tipo) => setSelection({ fecha, tipo })}
              />
            </div>
          );
        })}
      </div>

      {selection && (
        <AsignarComidaSheet
          fecha={selection.fecha}
          tipo={selection.tipo}
          platos={platos}
          currentComida={getComida(selection.fecha, selection.tipo)}
          onClose={() => setSelection(null)}
          onAssignPlato={handleAssignPlato}
          onAssignEspecial={handleAssignEspecial}
          onCreatePlato={handleCreatePlato}
          onClear={handleClear}
        />
      )}
    </div>
  );
}
