import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Check, ArrowLeft } from 'lucide-react';
import { suggestSchedule } from '../../lib/aiScheduler';
import type { SuggestedCut } from '../../lib/aiScheduler';
import { useEvents } from '../../contexts/EventsContext';
import type { EpisodeRecord, AgroEvent } from '../../types';
import { format } from 'date-fns';
import styles from './EpisodeAISuggestion.module.css';

export type { SuggestedCut };

interface Props {
  episode: Omit<EpisodeRecord, 'id'>;
  episodeName: string;
  topics: string[];
  cutCount: number;
  startingCutNumber?: number;
  onBack: () => void;
  onConfirm: (cuts: Omit<AgroEvent, 'id'>[]) => void;
}

function toDateValue(d: Date | undefined) {
  return d ? format(d, 'yyyy-MM-dd') : '';
}

const EpisodeAISuggestion: React.FC<Props> = ({
  episode,
  episodeName,
  topics,
  cutCount,
  startingCutNumber = 0,
  onBack,
  onConfirm,
}) => {
  const { events } = useEvents();
  const [cuts, setCuts] = useState<SuggestedCut[]>([]);
  const [generated, setGenerated] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const generate = (currentAttempt = attempt) => {
    const suggested = suggestSchedule({
      name: episode.name,
      company: episode.company,
      recordingDate: toDateValue(episode.recordingDate),
      publishDate: toDateValue(episode.publishDate) || undefined,
      cutCount,
      topics,
      existingEvents: events,
    }, currentAttempt);

    setCuts(suggested.map((c, i) => ({
      cutNumber: startingCutNumber + i + 1,
      topic: c.topic || topics[i] || `Recorte ${i + 1}`,
      suggestedDate: c.suggestedDate,
      rationale: c.rationale ?? '',
    })));
    setGenerated(true);
  };

  const regenerate = () => {
    const next = attempt + 1;
    setAttempt(next);
    generate(next);
  };

  // Gera automaticamente ao montar o componente
  useEffect(() => { generate(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDate = (index: number, value: string) => {
    setCuts(prev => prev.map((c, i) => i === index ? { ...c, suggestedDate: value } : c));
  };

  const handleConfirm = () => {
    const evts: Omit<AgroEvent, 'id'>[] = cuts.map(c => ({
      title: c.topic,
      date: new Date(c.suggestedDate + 'T12:00:00'),
      status: 'pendente' as const,
      episode: episodeName,
      company: episode.company,
      companyId: episode.companyId,
      cutNumber: c.cutNumber,
    }));
    onConfirm(evts);
  };

  const allDatesValid = cuts.length > 0 && cuts.every(c => !!c.suggestedDate);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelTitle}>
            <Sparkles size={18} color="#6366f1" />
            Agenda Inteligente de Recortes
          </div>
          <p className={styles.panelSubtitle}>
            Sugestão baseada no seu calendário — dias com menos publicações têm prioridade.
            Edite as datas antes de confirmar.
          </p>
        </div>
      </div>

      {/* Tópicos cadastrados */}
      <div className={styles.topicsSection}>
        <div className={styles.sectionLabel}>Tópicos cadastrados</div>
        {topics.map((topic, i) => (
          <div key={i} className={styles.topicRow}>
            <div className={styles.topicNumber}>{i + 1}</div>
            <span style={{ fontSize: '14px', color: topic ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {topic || '(sem tópico)'}
            </span>
          </div>
        ))}
      </div>

      {/* Sugestões */}
      {generated && cuts.length > 0 && (
        <div>
          <div className={styles.suggestionsTitle}>
            Sugestão de calendário — edite as datas se necessário
          </div>
          <div className={styles.cutList}>
            {cuts.map((cut, i) => (
              <div key={cut.cutNumber} className={styles.cutRow}>
                <div className={styles.cutNum}>{cut.cutNumber}</div>
                <div className={styles.cutInfo}>
                  <span className={styles.cutTopic}>{cut.topic}</span>
                  {cut.rationale && (
                    <span className={styles.cutRationale}>{cut.rationale}</span>
                  )}
                </div>
                <input
                  type="date"
                  className={styles.cutDateInput}
                  value={cut.suggestedDate}
                  onChange={e => updateDate(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className={styles.actions}>
        <button className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={15} /> Voltar ao formulário
        </button>

        {generated && (
          <button className={styles.regenBtn} onClick={regenerate}>
            <RefreshCw size={15} /> Regenerar
          </button>
        )}

        {generated && (
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!allDatesValid}
          >
            <Check size={15} /> Confirmar e cadastrar episódio
          </button>
        )}
      </div>
    </div>
  );
};

export default EpisodeAISuggestion;
