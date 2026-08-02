import { Sheet } from './Sheet';
import styles from '../styles/reglaSheet.module.css';
import type { Categoria } from '../lib/db';

interface CategoriaPickerSheetProps {
  categorias: Categoria[];
  selectedId?: string;
  title?: string;
  onSelect: (categoriaId: string) => void;
  onClose: () => void;
}

/** Sheet de selección única de categoría — tocar una fila elige y cierra. */
export function CategoriaPickerSheet({ categorias, selectedId, title = 'Categoría', onSelect, onClose }: CategoriaPickerSheetProps) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className={styles.optionGroup}>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={`${styles.optionRow} ${categoria.id === selectedId ? styles.optionRowSelected : ''}`}
            onClick={() => onSelect(categoria.id)}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
