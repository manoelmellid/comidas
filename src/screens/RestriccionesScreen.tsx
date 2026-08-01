import { useNavigate } from 'react-router-dom';
import sharedStyles from '../features/comidas/AsignarComidaSheet.module.css';

export function RestriccionesScreen() {
  const navigate = useNavigate();

  return (
    <div className={sharedStyles.group}>
      <button type="button" className={sharedStyles.row} onClick={() => navigate('/restricciones/diarias')}>
        <span>Diarias</span>
        <span className={sharedStyles.rowSecondary}>›</span>
      </button>
      <button type="button" className={sharedStyles.row} onClick={() => navigate('/restricciones/globales')}>
        <span>Globales</span>
        <span className={sharedStyles.rowSecondary}>›</span>
      </button>
    </div>
  );
}
