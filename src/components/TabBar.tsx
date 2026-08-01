import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';
import { IconComidas, IconHoy, IconPlatos, IconRestricciones } from './icons';

const TABS = [
  { to: '/', label: 'Hoy', Icon: IconHoy, end: true },
  { to: '/comidas', label: 'Comidas', Icon: IconComidas },
  { to: '/platos', label: 'Platos', Icon: IconPlatos },
  { to: '/restricciones', label: 'Restricciones', Icon: IconRestricciones },
];

export function TabBar() {
  return (
    <nav className={styles.tabBar}>
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <Icon />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
