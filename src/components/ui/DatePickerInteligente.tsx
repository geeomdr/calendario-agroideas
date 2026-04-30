import React, { useState, useRef, useEffect } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday as dateFnsIsToday,
  addDays, subDays, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DatePickerInteligente.module.css';

type DayStatus = 'past' | 'occupied' | 'blocked' | 'today' | 'available' | 'selected';

interface Props {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  /** YYYY-MM-DD strings — já excluindo a data do episódio sendo editado */
  occupiedDates: string[];
  placeholder?: string;
}

function toYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function computeBlockedSet(occupiedDates: string[]): Set<string> {
  const occupiedSet = new Set(occupiedDates);
  const blocked = new Set<string>();
  for (const dateStr of occupiedDates) {
    const d = parseISO(dateStr);
    for (let i = 1; i <= 4; i++) {
      const before = toYMD(subDays(d, i));
      const after = toYMD(addDays(d, i));
      if (!occupiedSet.has(before)) blocked.add(before);
      if (!occupiedSet.has(after)) blocked.add(after);
    }
  }
  return blocked;
}

/** Exportada para uso na validação do formulário */
export function isDateAvailable(dateStr: string, occupiedDates: string[]): boolean {
  if (occupiedDates.includes(dateStr)) return false;
  return !computeBlockedSet(occupiedDates).has(dateStr);
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const DatePickerInteligente: React.FC<Props> = ({
  value,
  onChange,
  occupiedDates,
  placeholder = 'Selecionar data de publicação',
}) => {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() =>
    value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const occupiedSet = new Set(occupiedDates);
  const blockedSet = computeBlockedSet(occupiedDates);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const getDayStatus = (day: Date): DayStatus => {
    const dayStr = toYMD(day);
    if (value && isSameDay(day, value)) return 'selected';
    if (occupiedSet.has(dayStr)) return 'occupied';
    if (blockedSet.has(dayStr)) return 'blocked';
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    if (day < todayMidnight) return 'past';
    if (dateFnsIsToday(day)) return 'today';
    return 'available';
  };

  const handleDayClick = (day: Date, status: DayStatus) => {
    if (status === 'past' || status === 'occupied' || status === 'blocked') return;
    onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0));
    setOpen(false);
  };

  const handleOpen = () => {
    if (!open && value) {
      setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
    setOpen(o => !o);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const firstDay = startOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: firstDay, end: endOfMonth(currentMonth) });
  const startPad = (firstDay.getDay() + 6) % 7; // Segunda = 0

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
      >
        <Calendar size={15} className={styles.triggerIcon} />
        <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {value
            ? format(value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            : placeholder}
        </span>
        {value && (
          <span
            className={styles.clearBtn}
            onClick={handleClear}
            role="button"
            aria-label="Limpar data"
          >
            ×
          </span>
        )}
      </button>

      {open && (
        <div className={styles.popover}>
          {/* Navegação de mês */}
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.monthLabel}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grade do calendário */}
          <div className={styles.grid}>
            {WEEKDAYS.map(d => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}
            {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const status = getDayStatus(day);
              const clickable = status !== 'past' && status !== 'occupied' && status !== 'blocked';
              const tooltip =
                status === 'occupied' ? 'Episódio já agendado nesta data'
                : status === 'blocked' ? 'Muito próximo de outro episódio (mín. 5 dias)'
                : undefined;
              return (
                <div
                  key={toYMD(day)}
                  className={`${styles.day} ${styles[status]}`}
                  onClick={() => handleDayClick(day, status)}
                  title={tooltip}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable
                    ? e => { if (e.key === 'Enter' || e.key === ' ') handleDayClick(day, status); }
                    : undefined
                  }
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotAvailable}`} /> Disponível
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotOccupied}`} /> Ocupado
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotBlocked}`} /> Muito próximo
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePickerInteligente;
