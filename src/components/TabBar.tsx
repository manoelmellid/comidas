import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';
import { IconHoy, IconPlatos, IconRestricciones, IconSemana } from './icons';

const TABS = [
  { to: '/', label: 'Hoy', Icon: IconHoy, end: true },
  { to: '/comidas', label: 'Semana', Icon: IconSemana },
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
