import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Placeholder } from '../components/Placeholder';
import { IconArrowUpDown } from '../components/icons';
import type { LayoutContext } from '../lib/layoutContext';

export function HoyScreen() {
  const navigate = useNavigate();
  const { setTopRightAction } = useOutletContext<LayoutContext>();

  useEffect(() => {
    setTopRightAction({ icon: <IconArrowUpDown />, label: 'Ajustes', onClick: () => navigate('/ajustes') });
    return () => setTopRightAction(null);
  }, [setTopRightAction, navigate]);

  return (
    <Placeholder
      title="Aún no hay nada que ver"
      subtitle="Este dashboard se construye al final, cuando el Generador ya tenga un plan real que resumir."
    />
  );
}
