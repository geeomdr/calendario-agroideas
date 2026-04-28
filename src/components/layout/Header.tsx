import React from 'react';
import styles from './Header.module.css';
import { Menu } from 'lucide-react';
import type { ViewType } from '../../types';

interface HeaderProps {
  currentView: ViewType;
  onViewChange?: (view: ViewType) => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onMenuClick }) => {
  const getTitle = () => {
    switch (currentView) {
      case 'year': return 'Planejamento Anual';
      case 'month': return 'Agenda';
      case 'list': return 'Lista de Cortes';
      case 'dashboard': return 'Dashboard';
      case 'episodes': return 'Episódios';
      case 'companies': return 'Empresas Parceiras';
      default: return 'Agenda';
    }
  };

  const isCalendarLike = ['month', 'year', 'list'].includes(currentView);

  return (
    <header className={styles.header}>
      <div className={styles.titleSection}>
        {onMenuClick && (
          <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Menu">
            <Menu size={22} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '22px' }}>{getTitle()}</h1>
          {isCalendarLike && onViewChange && (
            <select
              value={currentView}
              onChange={e => onViewChange(e.target.value as ViewType)}
              className={styles.viewSelect}
            >
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
              <option value="list">Em lista</option>
            </select>
          )}
        </div>
      </div>
      <div className={styles.actions} />
    </header>
  );
};
export default Header;
