import React, { useState } from 'react';
import { useEvents } from '../../contexts/EventsContext';
import styles from './ListView.module.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Tag, Building2, Mic, User } from 'lucide-react';
import type { AgroEvent, Status } from '../../types';

const STATUS_LABEL: Record<Status, string> = {
  postado: 'Postado',
  agendado: 'Agendado',
  'em-aprovacao': 'Em Aprovação',
  pendente: 'Pendente',
  'em-edicao': 'Em Edição',
};

const STATUS_CLASS: Record<Status, string> = {
  postado: styles.postado,
  agendado: styles.agendado,
  'em-aprovacao': styles.emAprovacao,
  pendente: styles.pendente,
  'em-edicao': styles.emEdicao,
};

interface ListViewProps {
  onEventClick: (event: AgroEvent) => void;
}

const ListView: React.FC<ListViewProps> = ({ onEventClick }) => {
  const { events, episodes, companies } = useEvents();
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = events
    .filter(e => !filterCompany || e.companyId === filterCompany || e.company === filterCompany)
    .filter(e => !filterStatus || e.status === filterStatus)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by episode
  const grouped: Record<string, typeof filtered> = {};
  for (const event of filtered) {
    if (!grouped[event.episode]) grouped[event.episode] = [];
    grouped[event.episode].push(event);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Controle de Cortes por Episódio</h2>
          <p>{filtered.length} cortes · {episodes.length} episódios</p>
        </div>
        <div className={styles.filters}>
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className={styles.filterSelect}>
            <option value="">Todas as empresas</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={styles.filterSelect}>
            <option value="">Todos os status</option>
            <option value="postado">Postado</option>
            <option value="agendado">Agendado</option>
            <option value="em-edicao">Em Edição</option>
            <option value="em-aprovacao">Em Aprovação</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </header>

      {episodes.length > 0 && (
        <div className={styles.episodesSection}>
          <div className={styles.episodesSectionHeader}>
            <Mic size={18} />
            <h3>Episódios Cadastrados</h3>
            <span className={styles.episodesCount}>{episodes.length}</span>
          </div>
          <div className={styles.episodesList}>
            {[...episodes]
              .sort((a, b) => {
                if (a.episodeNumber == null && b.episodeNumber == null) {
                  if (!a.publishDate && !b.publishDate) return 0;
                  if (!a.publishDate) return 1;
                  if (!b.publishDate) return -1;
                  return a.publishDate.getTime() - b.publishDate.getTime();
                }
                if (a.episodeNumber == null) return 1;
                if (b.episodeNumber == null) return -1;
                if (a.episodeNumber !== b.episodeNumber) return a.episodeNumber - b.episodeNumber;
                if (!a.publishDate && !b.publishDate) return 0;
                if (!a.publishDate) return 1;
                if (!b.publishDate) return -1;
                return a.publishDate.getTime() - b.publishDate.getTime();
              })
              .map(ep => (
              <div key={ep.id} className={styles.episodeCard}>
                <div className={styles.episodeCardStripe} />
                <div className={styles.episodeCardBody}>
                  <div className={styles.episodeCardTop}>
                    <span className={styles.episodeCardName}>{ep.name}</span>
                    <span className={styles.episodeCardStatus} style={{ background: ep.status === 'publicado' ? '#dcfce7' : ep.status === 'gravado' ? '#f3e8ff' : ep.status === 'editando' ? '#dbeafe' : '#fef3c7', color: ep.status === 'publicado' ? '#166534' : ep.status === 'gravado' ? '#6b21a8' : ep.status === 'editando' ? '#1e40af' : '#92400e' }}>
                      {ep.status.charAt(0).toUpperCase() + ep.status.slice(1)}
                    </span>
                  </div>
                  <div className={styles.episodeCardMeta}>
                    <span className={styles.metaItem}><Building2 size={13} />{ep.company}</span>
                    <span className={styles.metaItem}><User size={13} />{ep.guest}</span>
                    <span className={styles.metaItem}><Mic size={13} />Gravação: {format(ep.recordingDate, "dd/MM/yyyy")}</span>
                    {ep.publishDate && (
                      <span className={styles.metaItem}><Calendar size={13} />Publicação: {format(ep.publishDate, "dd/MM/yyyy")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.groups}>
        {Object.entries(grouped)
          .sort(([epNameA], [epNameB]) => {
            const epA = episodes.find(e => e.name === epNameA);
            const epB = episodes.find(e => e.name === epNameB);
            const numA = epA?.episodeNumber;
            const numB = epB?.episodeNumber;
            const dateA = epA?.publishDate;
            const dateB = epB?.publishDate;
            if (numA == null && numB == null) {
              if (!dateA && !dateB) return 0;
              if (!dateA) return 1;
              if (!dateB) return -1;
              return dateA.getTime() - dateB.getTime();
            }
            if (numA == null) return 1;
            if (numB == null) return -1;
            if (numA !== numB) return numA - numB;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA.getTime() - dateB.getTime();
          })
          .map(([episode, cuts]) => {
          const publishedCount = cuts.filter(c => c.status === 'postado').length;
          const company = cuts[0].company;
          return (
            <div key={episode} className={styles.episodeGroup}>
              <div className={styles.episodeHeader}>
                <div className={styles.episodeMeta}>
                  <span className={styles.episodeName}>{episode}</span>
                  <span className={styles.companyBadge}>{company}</span>
                </div>
                <span className={styles.progressBadge}>{publishedCount}/{cuts.length} cortes</span>
              </div>

              <div className={styles.list}>
                {cuts.map(event => (
                  <div key={event.id} className={styles.card} onClick={() => onEventClick(event)} style={{ cursor: 'pointer' }}>
                    <div className={`${styles.statusIndicator} ${STATUS_CLASS[event.status]}`} />

                    <div className={styles.cutNumber}>#{event.cutNumber}</div>

                    <div className={styles.mainInfo}>
                      <h3 className={styles.title}>{event.title}</h3>
                      <div className={styles.meta}>
                        <span className={styles.metaItem}>
                          <Calendar size={13} />
                          {format(event.date, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <span className={styles.metaItem}>
                          <Building2 size={13} />
                          {event.company}
                        </span>
                        {event.platforms && (
                          <span className={styles.metaItem}>
                            <Tag size={13} />
                            {event.platforms}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`${styles.statusBadge} ${STATUS_CLASS[event.status]}`}>
                      {STATUS_LABEL[event.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListView;
