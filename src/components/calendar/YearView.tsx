import React from 'react';
import { 
  format, 
  startOfYear, 
  addMonths, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../../contexts/EventsContext';
import styles from './YearView.module.css';

interface YearViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const YearView: React.FC<YearViewProps> = ({ selectedDate }) => {
  const { events } = useEvents();
  const yearStart = startOfYear(selectedDate);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>{format(selectedDate, 'yyyy')}</h2>
      </header>

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
                {weekDays.map((d, i) => <span key={i}>{d}</span>)}
              </div>

              <div className={styles.daysGrid}>
                {Array.from({ length: padding }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day, i) => {
                  const dayEvents = events.filter(e => isSameDay(e.date, day));
                  return (
                    <div 
                      key={i} 
                      className={`${styles.day} ${dayEvents.length > 0 ? styles.hasEvent : ''}`}
                      title={dayEvents.map(e => e.title).join(', ')}
                    >
                      {format(day, 'd')}
                      {dayEvents.length > 0 && (
                        <div className={styles.eventDots}>
                          {dayEvents.slice(0, 3).map((_e, index) => (
                            <span key={index} className={styles.dot} />
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
    </div>
  );
};

export default YearView;
