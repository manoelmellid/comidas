import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RestriccionesScreen.module.css';
import { getAllReglasDiarias, getAllReglasGlobales } from '../lib/db';

export function RestriccionesScreen() {
  const navigate = useNavigate();
  const [diariasCount, setDiariasCount] = useState(0);
  const [globalesCount, setGlobalesCount] = useState(0);

  useEffect(() => {
    Promise.all([getAllReglasDiarias(), getAllReglasGlobales()]).then(([diarias, globales]) => {
      setDiariasCount(diarias.filter((r) => r.tipo !== 'ninguna').length);
      setGlobalesCount(globales.length);
    });
  }, []);

  return (
    <div className={styles.list}>
      <button type="button" className={styles.card} onClick={() => navigate('/restricciones/diarias')}>
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>Diarias</span>
          <span className={styles.cardSubtitle}>Reglas fijas por día de la semana</span>
        </span>
        <span className={styles.cardRight}>
          {diariasCount > 0 && <span className={styles.cardBadge}>{diariasCount}</span>}
          <span className={styles.chevron}>›</span>
        </span>
      </button>

      <button type="button" className={styles.card} onClick={() => navigate('/restricciones/globales')}>
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>Globales</span>
          <span className={styles.cardSubtitle}>Objetivos semanales por plato, ingrediente o categoría</span>
        </span>
        <span className={styles.cardRight}>
          {globalesCount > 0 && <span className={styles.cardBadge}>{globalesCount}</span>}
          <span className={styles.chevron}>›</span>
        </span>
      </button>
    </div>
  );
}
