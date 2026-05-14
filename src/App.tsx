import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MonthView from './components/calendar/MonthView';
import ListView from './components/calendar/ListView';
import Dashboard from './components/calendar/Dashboard';
import YearView from './components/calendar/YearView';
import EpisodesView from './components/calendar/EpisodesView';
import CompaniesView from './components/companies/CompaniesView';
import ExportView from './components/calendar/ExportView';
import AnalisadorView from './components/calendar/AnalisadorView';
import TemplatesView from './components/templates/TemplatesView';
import SharedEpisodeView from './components/calendar/SharedEpisodeView';
import ActivityModal from './components/calendar/ActivityModal';
import EventDetailModal from './components/calendar/EventDetailModal';
import SettingsModal from './components/layout/SettingsModal';
import { EventsProvider, useEvents } from './contexts/EventsContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { ViewType, AgroEvent } from './types';
import { MessageCircle } from 'lucide-react';
import './responsive.css';

function AppInner() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgroEvent | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { events, loading } = useEvents();

  // Notificação do browser ao abrir o sistema — só em ambientes que suportam (não iOS Safari)
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const today = new Date().toDateString();
    const todayEvents = events.filter(e => e.date.toDateString() === today);
    if (todayEvents.length === 0) return;

    const notify = () => {
      const agendados = todayEvents.filter(e => e.status === 'agendado');
      const body = agendados.length > 0
        ? `${agendados.length} corte(s) agendado(s) para hoje. Toque para ver.`
        : `${todayEvents.length} corte(s) no calendário de hoje.`;
      new Notification('📅 AgroIdeas — Lembrete do dia', { body, icon: '/favicon.svg' });
    };

    if (Notification.permission === 'granted') {
      notify();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') notify(); });
    }
  }, []); // roda uma vez ao montar

  const urlParams = new URLSearchParams(window.location.search);
  const sharedView = urlParams.get('shared');

  if (sharedView === 'dashboard') {
    return (
      <div style={{ height: '100vh', padding: '24px', backgroundColor: 'var(--bg-main)', overflowY: 'auto' }}>
        <Dashboard />
      </div>
    );
  }

  if (sharedView === 'calendar') {
    return (
      <div style={{ height: '100vh', padding: '24px', backgroundColor: 'var(--bg-main)', overflowY: 'auto' }}>
        <MonthView selectedDate={selectedDate} setSelectedDate={setSelectedDate} onEventClick={setSelectedEvent} />
      </div>
    );
  }

  if (sharedView === 'episode') {
    const episodeName = urlParams.get('name');
    return <SharedEpisodeView episodeName={episodeName} />;
  }

  const PHONE = '5544997704635';
  const scheduledRef = useRef(false);

  const buildDailyText = useCallback(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    const todayEvents = events.filter(e => e.date.toDateString() === todayStr);
    const dateLabel = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    if (todayEvents.length === 0) {
      return `📅 *AgroIdeas — ${dateLabel}*\n\nNenhuma postagem agendada para hoje.`;
    }
    const lines = todayEvents.map(e => {
      const horario = e.time ? `\n  🕐 Horário: *${e.time}*` : '';
      const plat = e.platforms ? `\n  📲 Plataformas: ${e.platforms}` : '';
      return `• *${e.episode}* — Corte #${e.cutNumber}\n  ${e.title}${horario}\n  Status: ${e.status}${plat}`;
    });
    return `📅 *AgroIdeas — Postagens de Hoje*\n${dateLabel}\n\n${lines.join('\n\n')}`;
  }, [events]);

  const handleWhatsApp = () => {
    const text = buildDailyText();
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Dispara automaticamente às 18:00 se o app estiver aberto
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      if (now.getHours() === 18 && now.getMinutes() === 0 && !scheduledRef.current) {
        scheduledRef.current = true;
        window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(buildDailyText())}`, '_blank');
        setTimeout(() => { scheduledRef.current = false; }, 60 * 1000);
      }
      if (now.getHours() === 0 && now.getMinutes() === 0) scheduledRef.current = false;
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [buildDailyText]);

    const renderView = () => {
      switch (currentView) {
        case 'month': return <MonthView selectedDate={selectedDate} setSelectedDate={setSelectedDate} onEventClick={setSelectedEvent} />;
        case 'year': return <YearView selectedDate={selectedDate} setSelectedDate={setSelectedDate} />;
        case 'list': return <ListView onEventClick={setSelectedEvent} />;
        case 'dashboard': return <Dashboard />;
        case 'episodes': return <EpisodesView />;
        case 'companies': return <CompaniesView />;
        case 'export': return <ExportView />;
        case 'analisador': return <AnalisadorView />;
        case 'templates': return <TemplatesView />;
        default: return null;
      }
    };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Overlay para fechar sidebar no mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`no-print sidebar-wrapper${sidebarOpen ? ' sidebar-open' : ''}`}>
        <Sidebar
          currentView={currentView}
          onViewChange={(v) => { setCurrentView(v); setSidebarOpen(false); }}
          onAddClick={() => { setIsModalOpen(true); setSidebarOpen(false); }}
          onSettingsClick={() => { setIsSettingsOpen(true); setSidebarOpen(false); }}
        />
      </div>
      <main className="printable-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div className="no-print">
          <Header
            currentView={currentView}
            onViewChange={setCurrentView}
            onMenuClick={() => setSidebarOpen(o => !o)}
          />
        </div>
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }} className="main-content-pad">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* WhatsApp button */}
      <button
        className="no-print"
        onClick={handleWhatsApp}
        title="Enviar postagens de hoje para o WhatsApp"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#25d366',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
          zIndex: 900,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <MessageCircle size={26} fill="white" />
      </button>

      <ActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <EventsProvider>
      <AppInner />
    </EventsProvider>
  );
}

export default App;
