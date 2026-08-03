import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import { TopBar, type TopBarAction, type TopBarBack } from './TopBar';
import { TabBar } from './TabBar';
import type { LayoutContext } from '../lib/layoutContext';

const TITLES: Record<string, string> = {
  '/': 'Hoy',
  '/comidas': 'Comidas',
  '/platos': 'Platos',
  '/ingredientes': 'Ingredientes',
  '/restricciones': 'Restricciones',
  '/restricciones/diarias': 'Diarias',
  '/restricciones/globales': 'Globales',
  '/ajustes': 'Ajustes',
};

export function Layout() {
  const location = useLocation();
  const [topRightActions, setTopRightActions] = useState<TopBarAction[]>([]);
  const [topLeftBack, setTopLeftBack] = useState<TopBarBack | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const title = customTitle ?? TITLES[location.pathname] ?? 'Comidas';

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function handleViewportResize() {
      // El teclado en iOS reduce visualViewport.height sin tocar innerHeight — a diferencia
      // de un simple focus/blur, esto no se dispara con el autoFocus programático de un
      // input si iOS decide no abrir el teclado (pasa al entrar en Platos/Ingredientes).
      const keyboardLikely = vv!.height < window.innerHeight - 150;
      setKeyboardOpen(keyboardLikely);
      if (keyboardLikely) {
        const active = document.activeElement;
        if (active instanceof HTMLElement && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          // Confirmado con el usuario (scrollTop se queda en 0 sin esto): el contenedor no se
          // desplaza solo para dejar visible el campo activo en formularios largos como
          // PlatoDetail. 'nearest' mueve lo mínimo imprescindible, sin animación para no competir
          // con la propia animación de apertura del teclado.
          setTimeout(() => active.scrollIntoView({ block: 'nearest' }), 50);
        }
      }
    }

    vv.addEventListener('resize', handleViewportResize);
    return () => vv.removeEventListener('resize', handleViewportResize);
  }, []);

  const setTitle = useCallback((t: string | null) => setCustomTitle(t), []);
  const context = useMemo<LayoutContext>(
    () => ({ setTopRightActions, setTopLeftBack, setTitle }),
    [setTopRightActions, setTopLeftBack, setTitle],
  );

  return (
    <div className={styles.page}>
      <TopBar title={title} actions={topRightActions} back={topLeftBack} />
      <main className={`${styles.content} app-content-scroll`}>
        <Outlet context={context} />
      </main>
      {!keyboardOpen && <TabBar />}
    </div>
  );
}
