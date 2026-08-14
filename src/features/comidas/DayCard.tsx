import styles from './DayCard.module.css';
import { formatDayLabel, isSameDate } from '../../lib/week';
import { resolveComidaDisplay, type ComidaDisplayVariant } from '../../lib/comidaDisplay';
import type { Comida, TipoComida } from '../../lib/db';

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
  normal: styles.valorNormal,
};

interface DayCardProps {
  date: Date;
  getComida: (tipo: TipoComida) => Comida | undefined;
  getPlatoNombre: (platoId: string) => string;
  onTapSlot: (tipo: TipoComida) => void;
}

export function DayCard({ date, getComida, getPlatoNombre, onTapSlot }: DayCardProps) {
  const today = isSameDate(date, new Date());

  return (
    <div className={styles.card}>
      <p className={`${styles.dayLabel} ${today ? styles.dayLabelToday : ''}`}>
        {formatDayLabel(date)}
      </p>
      {TIPOS.map(({ tipo, label }) => {
        const { texto, variant } = resolveComidaDisplay(getComida(tipo), getPlatoNombre);

        return (
          <button
            key={tipo}
            type="button"
            className={styles.row}
            onClick={() => onTapSlot(tipo)}
          >
            <span className={styles.tipo}>{label}</span>
            <span className={`${styles.valor} ${VALOR_CLASS[variant]}`}>{texto}</span>
          </button>
        );
      })}
    </div>
  );
}
