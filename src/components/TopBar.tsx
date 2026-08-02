import type { ReactNode } from 'react';
import styles from './TopBar.module.css';

export interface TopBarAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

export interface TopBarBack {
  label: string;
  onClick: () => void;
}

interface TopBarProps {
  title: string;
  actions: TopBarAction[];
  back?: TopBarBack | null;
}

export function TopBar({ title, actions, back }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      {back && (
        <button type="button" className={styles.backRow} onClick={back.onClick}>
          ‹ {back.label}
        </button>
      )}
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {actions.length > 0 && (
          <div className={styles.actionsRow}>
            {actions.map((action, index) => (
              <button
                key={index}
                type="button"
                className={styles.gearButton}
                onClick={action.onClick}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
