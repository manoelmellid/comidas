import styles from './DayCard.module.css';
import { formatDayLabel, isSameDate } from '../../lib/week';
import type { Comida, TipoComida } from '../../lib/db';

const TIPOS: { tipo: TipoComida; label: string }[] = [
  { tipo: 'comida', label: 'Comida' },
  { tipo: 'cena', label: 'Cena' },
];

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
        const comida = getComida(tipo);
        let valor: string;
        let valorClass = styles.valorVacio;

        if (!comida) {
          valor = 'Añadir';
        } else if (comida.generado === 'no_elaborar') {
          valor = 'No elaborar';
          valorClass = styles.valorNoElaborar;
        } else if (comida.generado === 'fallido') {
          valor = 'No generado';
          valorClass = styles.valorFallido;
        } else if (comida.especial) {
          valor = comida.tags.length ? `Fuera · ${comida.tags.join(', ')}` : 'Fuera';
          valorClass = styles.valorEspecial;
        } else if (comida.platoId) {
          valor = getPlatoNombre(comida.platoId);
          valorClass = valor === '(eliminado)' ? styles.valorEliminado : '';
        } else {
          valor = 'Añadir';
        }

        return (
          <button
            key={tipo}
            type="button"
            className={styles.row}
            onClick={() => onTapSlot(tipo)}
          >
            <span className={styles.tipo}>{label}</span>
            <span className={`${styles.valor} ${valorClass}`}>{valor}</span>
          </button>
        );
      })}
    </div>
  );
}
