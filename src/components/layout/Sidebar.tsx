import React from 'react';
import styles from './Sidebar.module.css';
import { LayoutDashboard, ListTodo, CalendarDays, Settings, Plus, Mic, Building2, FileDown, Sparkles } from 'lucide-react';
import type { ViewType } from '../../types';
import logoAgroideas from '../../assets/logo-agroideas.png';
import { SocialLinksBar } from '../calendar/socialLinks';
import { useWorkspace } from '../../hooks/useWorkspace';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onAddClick: () => void;
  onSettingsClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onAddClick, onSettingsClick }) => {
  const { settings } = useWorkspace();
  const menuItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'month', label: 'Calendário', icon: <CalendarDays size={20} /> },
    { id: 'list', label: 'Lista de Cortes', icon: <ListTodo size={20} /> },
    { id: 'episodes', label: 'Episódios', icon: <Mic size={20} /> },
    { id: 'companies', label: 'Empresas Parceiras', icon: <Building2 size={20} /> },
    { id: 'export', label: 'Exportar Calendário', icon: <FileDown size={20} /> },
    { id: 'analisador', label: 'Analisador de EP', icon: <Sparkles size={20} /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo} style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'center' }}>
        <img src={logoAgroideas} alt="AgroIdeas" style={{ height: '48px', maxWidth: '100%', objectFit: 'contain' }} />
      </div>
      <button className={styles.addButton} onClick={onAddClick}><Plus size={20} /><span>Novo Corte</span></button>
      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${currentView === item.id ? styles.active : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.footer}>
        <button className={styles.navItem} onClick={onSettingsClick}><Settings size={20} /><span>Configurações</span></button>
        
        <div className={styles.socialSidebar}>
          <div className={styles.socialLabel}>Siga o podcast</div>
          <SocialLinksBar size={18} />
        </div>

        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            {settings.orgLogo
              ? <img src={settings.orgLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
              : settings.userName.charAt(0).toUpperCase()
            }
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{settings.userName}</div>
            <div className={styles.userRole}>{settings.userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
