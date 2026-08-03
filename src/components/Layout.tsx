import { useCallback, useMemo, useState } from 'react';
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
  const title = customTitle ?? TITLES[location.pathname] ?? 'Comidas';

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
      <TabBar />
    </div>
  );
}
