import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  format, startOfYear, addMonths, eachDayOfInterval,
  startOfMonth, endOfMonth, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../../contexts/EventsContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './YearView.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

type DayEventType = 'gravacao' | 'publicacao_episodio' | 'publicacao_corte';

interface DayEvent {
  type: DayEventType;
  name: string;
  empresa: string;
  status?: string;
}

type EventMap = Map<string, DayEvent[]>;

// ── Constants ────────────────────────────────────────────────────────────────

const DOT_COLOR: Record<DayEventType, string> = {
  gravacao:           '#3B6D11',
  publicacao_episodio:'#BA7517',
  publicacao_corte:   '#185FA5',
};

const TYPE_LABEL: Record<DayEventType, string> = {
  gravacao:            'Gravação de Episódio',
  publicacao_episodio: 'Publicação de Episódio',
  publicacao_corte:    'Publicação de Corte',
};

const STATUS_PT: Record<string, string> = {
  postado: 'Postado', agendado: 'Agendado', 'em-edicao': 'Em Edição',
  'em-aprovacao': 'Em Aprovação', pendente: 'Pendente',
  gravado: 'Gravado', publicado: 'Publicado', editando: 'Editando',
};

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const LEGEND: { type: DayEventType; label: string }[] = [
  { type: 'gravacao',            label: 'Gravação' },
  { type: 'publicacao_episodio', label: 'Publicação de Episódio' },
  { type: 'publicacao_corte',    label: 'Publicação de Corte' },
];

// ── Popover ──────────────────────────────────────────────────────────────────

interface PopoverInfo {
  dateLabel: string;
  events: DayEvent[];
  anchorRect: DOMRect;
}

function Popover({ info, onClose }: { info: PopoverInfo; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Position: prefer below, flip above if not enough room
  const [above, setAbove] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const popH = ref.current.offsetHeight || 200;
    setAbove(info.anchorRect.bottom + popH + 8 > window.innerHeight);
  }, [info]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const left = Math.min(
    Math.max(8, info.anchorRect.left + info.anchorRect.width / 2 - 140),
    window.innerWidth - 292,
  );
  const top = above
    ? info.anchorRect.top - 8
    : info.anchorRect.bottom + 8;

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={{
        left,
        top,
        transform: above ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className={styles.popoverHeader}>
        <span className={styles.popoverDate}>{info.dateLabel}</span>
        <button className={styles.popoverClose} onClick={onClose}><X size={14} /></button>
      </div>
      <div className={styles.popoverList}>
        {info.events.map((ev, i) => (
          <div key={i} className={styles.popoverItem}>
            <span
              className={styles.popoverDot}
              style={{ background: DOT_COLOR[ev.type] }}
            />
            <div className={styles.popoverItemBody}>
              <span className={styles.popoverType}>{TYPE_LABEL[ev.type]}</span>
              <span className={styles.popoverName}>{ev.name}</span>
              <span className={styles.popoverMeta}>
                {ev.empresa}
                {ev.status && ` · ${STATUS_PT[ev.status] ?? ev.status}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface YearViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const YearView: React.FC<YearViewProps> = ({ selectedDate, setSelectedDate }) => {
  const { events, episodes } = useEvents();
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [popover, setPopover] = useState<PopoverInfo | null>(null);

  const changeYear = (delta: number) => {
    const next = year + delta;
    setYear(next);
    setSelectedDate(new Date(next, 0, 1));
    setPopover(null);
  };

  // Build event map O(1) lookup indexed by "YYYY-MM-DD"
  const eventMap = useMemo<EventMap>(() => {
    const map: EventMap = new Map();

    const add = (dateStr: string, ev: DayEvent) => {
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(ev);
    };

    episodes.forEach(ep => {
      const recStr = format(ep.recordingDate, 'yyyy-MM-dd');
      if (ep.recordingDate.getFullYear() === year) {
        add(recStr, { type: 'gravacao', name: ep.name, empresa: ep.company, status: ep.status });
      }
      if (ep.publishDate && ep.publishDate.getFullYear() === year) {
        const pubStr = format(ep.publishDate, 'yyyy-MM-dd');
        add(pubStr, { type: 'publicacao_episodio', name: ep.name, empresa: ep.company, status: ep.status });
      }
    });

    events.forEach(ev => {
      if (ev.date.getFullYear() !== year) return;
      const dateStr = format(ev.date, 'yyyy-MM-dd');
      add(dateStr, {
        type: 'publicacao_corte',
        name: `Corte #${ev.cutNumber} — ${ev.title}`,
        empresa: ev.company,
        status: ev.status,
      });
    });

    return map;
  }, [events, episodes, year]);

  const handleDayClick = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    dateStr: string,
    dayEvents: DayEvent[],
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover(prev =>
      prev?.dateLabel === dateStr ? null : { dateLabel: dateStr, events: dayEvents, anchorRect: rect }
    );
  }, []);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(startOfYear(new Date(year, 0, 1)), i)),
    [year],
  );

  return (
    <div className={styles.container} onClick={() => setPopover(null)}>
      {/* Year selector */}
      <header className={styles.header}>
        <button className={styles.yearBtn} onClick={e => { e.stopPropagation(); changeYear(-1); }}>
          <ChevronLeft size={20} />
        </button>
        <h2 className={styles.yearLabel}>{year}</h2>
        <button className={styles.yearBtn} onClick={e => { e.stopPropagation(); changeYear(1); }}>
          <ChevronRight size={20} />
        </button>
      </header>

      {/* Legend */}
      <div className={styles.legend}>
        {LEGEND.map(l => (
          <span key={l.type} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: DOT_COLOR[l.type] }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* 12-month grid */}
      <div className={styles.monthsGrid}>
        {months.map((month, idx) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const padding = monthStart.getDay();

          return (
            <div key={idx} className={styles.monthCard}>
              <h3 className={styles.monthTitle}>{format(month, 'MMMM', { locale: ptBR })}</h3>

              <div className={styles.weekLabels}>
                {WEEK_DAYS.map((d, i) => <span key={i}>{d}</span>)}
              </div>

              <div className={styles.daysGrid}>
                {Array.from({ length: padding }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventMap.get(dateStr) ?? [];
                  const dotTypes = [...new Set(dayEvents.map(e => e.type))];
                  const today = isToday(day);
                  const clickable = dayEvents.length > 0;

                  return (
                    <div
                      key={i}
                      className={[
                        styles.day,
                        today ? styles.today : '',
                        clickable ? styles.hasEvent : '',
                        popover?.dateLabel === dateStr ? styles.active : '',
                      ].join(' ')}
                      onClick={clickable ? e => handleDayClick(e, dateStr, dayEvents) : undefined}
                      title={clickable ? dayEvents.map(e => e.name).join(' · ') : undefined}
                    >
                      <span className={styles.dayNumber}>{format(day, 'd')}</span>
                      {dotTypes.length > 0 && (
                        <div className={styles.dots}>
                          {dotTypes.map(t => (
                            <span key={t} className={styles.dot} style={{ background: DOT_COLOR[t] }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Popover */}
      {popover && (
        <Popover
          info={popover}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
};

export default YearView;
