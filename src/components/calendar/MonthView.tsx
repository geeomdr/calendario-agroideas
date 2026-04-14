import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import type { AgroEvent, EpisodeRecord } from '../../types';
import EpisodeDetailModal from './EpisodeDetailModal';
import styles from './MonthView.module.css';

interface MonthViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onEventClick: (event: AgroEvent) => void;
}

const STATUS_CLASS: Record<string, string> = {
  postado: styles.postado,
  agendado: styles.agendado,
  'em-aprovacao': styles.emAprovacao,
  pendente: styles.pendente,
  'em-edicao': styles.emEdicao,
};

const MonthView: React.FC<MonthViewProps> = ({ selectedDate, setSelectedDate, onEventClick }) => {
  const { events, episodes, updateEvent } = useEvents();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeRecord | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    setDraggingId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayKey);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    if (eventId) {
      const newDate = new Date(targetDay);
      newDate.setHours(12, 0, 0, 0);
      updateEvent(eventId, { date: newDate });
    }
    setDraggingId(null);
    setDragOverDay(null);
  };

  const selectedDayEvents = selectedDay ? events.filter(e => isSameDay(e.date, selectedDay)) : [];
  const selectedDayEpisodes = selectedDay ? episodes.filter(e => e.publishDate && isSameDay(e.publishDate, selectedDay)) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 style={{ textTransform: 'capitalize' }}>{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</h2>
        <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedDate(subMonths(selectedDate, 1))} className={styles.navBtn}><ChevronLeft size={20} /></button>
          <button onClick={() => setSelectedDate(new Date())} className={styles.todayBtn}>Hoje</button>
          <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className={styles.navBtn}><ChevronRight size={20} /></button>

        </div>
      </div>

      <div className={styles.calendar}>
        <div className={styles.weekHeader}>
          {weekDays.map(day => <div key={day} className={styles.weekDay}>{day}</div>)}
        </div>
        <div className={styles.daysGrid}>
          {days.map((day, idx) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter(e => isSameDay(e.date, day));
            const dayEpisodes = episodes.filter(e => e.publishDate && isSameDay(e.publishDate, day));
            const isDropTarget = dragOverDay === dayKey;
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasContent = dayEvents.length > 0 || dayEpisodes.length > 0;
            return (
              <div
                key={idx}
                className={`${styles.dayCell} ${!isSameMonth(day, monthStart) ? styles.disabled : ''} ${isSameDay(day, new Date()) ? styles.today : ''} ${dayEpisodes.length > 0 ? styles.hasEpisode : ''} ${isDropTarget ? styles.dropTarget : ''} ${isSelected ? styles.selectedDay : ''}`}
                onClick={() => setSelectedDay(day)}
                onDragOver={(e) => handleDragOver(e, dayKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
              >
                <span className={styles.dayNumber}>{format(day, 'd')}</span>

                {/* Desktop: mostra tags completas */}
                <div className={`${styles.eventsList} ${styles.desktopOnly}`}>
                  {dayEpisodes.map(ep => (
                    <div
                      key={`ep-${ep.id}`}
                      className={styles.episodeTag}
                      title={`Lançamento: ${ep.name}`}
                      onClick={e => { e.stopPropagation(); setSelectedEpisode(ep); }}
                      style={{ cursor: 'pointer' }}
                    >
                      🚀 {ep.name}
                    </div>
                  ))}
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onDragEnd={handleDragEnd}
                      className={`${styles.eventTag} ${STATUS_CLASS[event.status]} ${draggingId === event.id ? styles.dragging : ''}`}
                      onClick={e => { e.stopPropagation(); onEventClick(event); }}
                      title={`${event.episode} — ${event.title}`}
                    >
                      <span className={styles.eventEpisode}>{event.episode}</span>
                      <span>{event.title}</span>
                    </div>
                  ))}
                </div>

                {/* Mobile: só dots coloridos */}
                {hasContent && (
                  <div className={`${styles.mobileDots} ${styles.mobileOnly}`}>
                    {dayEpisodes.length > 0 && <span className={styles.dotEpisode} />}
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} className={`${styles.dot} ${STATUS_CLASS[ev.status]}`} />
                    ))}
                    {dayEvents.length > 3 && <span className={styles.dotMore}>+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel do dia selecionado — visível só no mobile */}
      {selectedDay && (
        <div className={`${styles.dayPanel} ${styles.mobileOnly}`}>
          <div className={styles.dayPanelHeader}>
            <span className={styles.dayPanelDate}>
              {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            <span className={styles.dayPanelCount}>
              {selectedDayEvents.length + selectedDayEpisodes.length === 0
                ? 'Nenhum conteúdo'
                : `${selectedDayEvents.length + selectedDayEpisodes.length} item(s)`}
            </span>
          </div>

          {selectedDayEpisodes.length === 0 && selectedDayEvents.length === 0 && (
            <div className={styles.dayPanelEmpty}>
              Nenhum corte ou episódio agendado para este dia.
            </div>
          )}

          {selectedDayEpisodes.map(ep => (
            <div key={`ep-${ep.id}`} className={styles.dayPanelCard} onClick={() => setSelectedEpisode(ep)}>
              <div className={styles.dayPanelCardStripe} style={{ background: '#ea580c' }} />
              <div className={styles.dayPanelCardBody}>
                <div className={styles.dayPanelCardTop}>
                  <span className={styles.dayPanelCardType}>🎙 Episódio</span>
                  <span className={styles.dayPanelCardBadge} style={{ background: '#fff7ed', color: '#ea580c' }}>Lançamento</span>
                </div>
                <span className={styles.dayPanelCardTitle}>{ep.name}</span>
                <span className={styles.dayPanelCardSub}>{ep.company} · {ep.guest}</span>
              </div>
            </div>
          ))}

          {selectedDayEvents.map(event => {
            const COLOR: Record<string, string> = {
              postado: '#22c55e', agendado: '#f59e0b',
              'em-edicao': '#3b82f6', 'em-aprovacao': '#8b5cf6', pendente: '#9ca3af',
            };
            const BG: Record<string, string> = {
              postado: '#dcfce7', agendado: '#fef3c7',
              'em-edicao': '#dbeafe', 'em-aprovacao': '#f3e8ff', pendente: '#f3f4f6',
            };
            const LABEL: Record<string, string> = {
              postado: 'Postado', agendado: 'Agendado',
              'em-edicao': 'Em Edição', 'em-aprovacao': 'Em Aprovação', pendente: 'Pendente',
            };
            const color = COLOR[event.status] ?? '#9ca3af';
            return (
              <div key={event.id} className={styles.dayPanelCard} onClick={() => onEventClick(event)}>
                <div className={styles.dayPanelCardStripe} style={{ background: color }} />
                <div className={styles.dayPanelCardBody}>
                  <div className={styles.dayPanelCardTop}>
                    <span className={styles.dayPanelCardType}>✂️ Corte #{event.cutNumber}</span>
                    <span className={styles.dayPanelCardBadge} style={{ background: BG[event.status], color }}>
                      {LABEL[event.status]}
                    </span>
                  </div>
                  <span className={styles.dayPanelCardTitle}>{event.title}</span>
                  <span className={styles.dayPanelCardSub}>
                    {event.episode} · {event.company}
                    {event.time ? ` · ${event.time}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EpisodeDetailModal episode={selectedEpisode} onClose={() => setSelectedEpisode(null)} />
    </div>
  );
};

export default MonthView;
