import React from 'react';
import { useEvents } from '../../contexts/EventsContext';
import styles from './Dashboard.module.css';
import { CheckCircle2, Clock, Film, Edit3, AlertCircle, Mic } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { events, episodes, companies } = useEvents();

  const published = events.filter(e => e.status === 'postado').length;
  const scheduled = events.filter(e => e.status === 'agendado').length;
  const editing = events.filter(e => e.status === 'em-edicao').length;
  const pendingApproval = events.filter(e => e.status === 'em-aprovacao').length;
  const pending = events.filter(e => e.status === 'pendente').length;

  const stats = [
    { label: 'Postados', value: published.toString(), icon: <CheckCircle2 size={20} />, color: '#22c55e' },
    { label: 'Agendados', value: scheduled.toString(), icon: <Clock size={20} />, color: '#f59e0b' },
    { label: 'Em Edição', value: editing.toString(), icon: <Edit3 size={20} />, color: '#3b82f6' },
    { label: 'Em Aprovação', value: pendingApproval.toString(), icon: <Film size={20} />, color: '#8b5cf6' },
    { label: 'Pendente', value: pending.toString(), icon: <AlertCircle size={20} />, color: '#9ca3af' },
    { label: 'Episódios', value: episodes.length.toString(), icon: <Mic size={20} />, color: '#ea580c' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.chartCard}>
          <h3>Progresso por Empresa</h3>
          <div className={styles.placeholderChart}>
            {companies.map(company => {
              const companyEvents = events.filter(e => e.companyId === company.id || e.company === company.name);
              const companyEpisodes = episodes.filter(e => e.companyId === company.id || e.company === company.name);

              const publishedCuts = companyEvents.filter(e => e.status === 'postado').length;
              const publishedEpisodes = companyEpisodes.filter(e => e.status === 'publicado').length;

              const totalDone = publishedCuts + publishedEpisodes;
              const totalAll = companyEvents.length + companyEpisodes.length;
              const pct = totalAll > 0 ? (totalDone / totalAll) * 100 : 0;

              return (
                <div key={company.id} className={styles.chartBarRow}>
                  <span className={styles.barLabel}>{company.name}</span>
                  <div className={styles.barContainer}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '80px', fontSize: '12px', lineHeight: 1.4 }}>
                    {companyEvents.length > 0 && (
                      <span style={{ color: '#374151', fontWeight: 600 }}>{publishedCuts}/{companyEvents.length} cortes</span>
                    )}
                    {companyEpisodes.length > 0 && (
                      <span style={{ color: '#6b7280' }}>{publishedEpisodes}/{companyEpisodes.length} eps</span>
                    )}
                    {totalAll === 0 && (
                      <span style={{ color: '#9ca3af' }}>0</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.listCard}>
          <h3>Próximos Agendados</h3>
          <div className={styles.eventList}>
            {events
              .filter(e => e.status === 'agendado' && e.date >= new Date(new Date().setHours(0,0,0,0)))
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 6)
              .map(event => (
                <div key={event.id} className={styles.eventItem}>
                  <div className={styles.categoryIndicator} style={{ background: '#f59e0b' }}></div>
                  <div className={styles.eventDetails}>
                    <span className={styles.eventTitle}>{event.episode} — Corte {event.cutNumber}</span>
                    <span className={styles.eventDate}>{event.date.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
