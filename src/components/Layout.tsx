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
  const [inputFocused, setInputFocused] = useState(false);
  const title = customTitle ?? TITLES[location.pathname] ?? 'Comidas';

  useEffect(() => {
    const isTextInput = (el: Element | null) =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

    function handleFocusIn(e: FocusEvent) {
      if (isTextInput(e.target as Element | null)) setInputFocused(true);
    }
    function handleFocusOut() {
      // El nuevo elemento enfocado aún no está activo al disparar focusout; esperar un tick.
      setTimeout(() => setInputFocused(isTextInput(document.activeElement)), 0);
    }

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
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
      {!inputFocused && <TabBar />}
    </div>
  );
}
