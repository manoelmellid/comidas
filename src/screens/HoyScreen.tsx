import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Placeholder } from '../components/Placeholder';
import { BackupSheet } from '../components/BackupSheet';
import { IconAjustes, IconArrowUpDown } from '../components/icons';
import type { LayoutContext } from '../lib/layoutContext';

export function HoyScreen() {
  const navigate = useNavigate();
  const { setTopRightActions } = useOutletContext<LayoutContext>();
  const [backupOpen, setBackupOpen] = useState(false);

  useEffect(() => {
    setTopRightActions([
      { icon: <IconArrowUpDown />, label: 'Copia de seguridad', onClick: () => setBackupOpen(true) },
      { icon: <IconAjustes />, label: 'Ajustes', onClick: () => navigate('/ajustes') },
    ]);
    return () => setTopRightActions([]);
  }, [setTopRightActions, navigate]);

  return (
    <>
      <Placeholder
        title="Aún no hay nada que ver"
        subtitle="Este dashboard se construye al final, cuando el Generador ya tenga un plan real que resumir."
      />
      {backupOpen && <BackupSheet onClose={() => setBackupOpen(false)} />}
    </>
  );
}
