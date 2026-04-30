import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, Check, X, Mic, Calendar, Building2, User, Sparkles, Film, AlertTriangle, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../../contexts/EventsContext';
import type { EpisodeRecord, AgroEvent } from '../../types';
import CompanyModal from '../companies/CompanyModal';
import EpisodeAISuggestion from './EpisodeAISuggestion';
import EventDetailModal from './EventDetailModal';
import ActivityModal from './ActivityModal';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './EpisodesView.module.css';
import TagInput from '../ui/TagInput';
import DatePickerInteligente, { isDateAvailable } from '../ui/DatePickerInteligente';

type EpStatus = EpisodeRecord['status'];

const STATUS_LABEL: Record<EpStatus, string> = {
  gravado: 'Gravado',
  agendado: 'Agendado',
  editando: 'Editando',
  publicado: 'Publicado',
};

const STATUS_COLOR: Record<EpStatus, string> = {
  gravado: '#8b5cf6',
  agendado: '#f59e0b',
  editando: '#3b82f6',
  publicado: '#22c55e',
};

const EMPTY: Omit<EpisodeRecord, 'id'> = {
  episodeNumber: undefined,
  name: '',
  company: '',
  companyId: '',
  guest: '',
  recordingDate: new Date(),
  publishDate: undefined,
  status: 'agendado',
  notes: '',
  linkVideo: '',
  linkCarrossel: '',
  linkThumbnail: '',
  instagramCollabs: [],
};

type Step = 'form' | 'ai';

const EpisodesView: React.FC = () => {
  const { episodes, events, companies, addEpisode, updateEpisode, deleteEpisode, addEvents } = useEvents();
  const [showForm, setShowForm] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EpisodeRecord | null>(null);
  const [form, setForm] = useState<Omit<EpisodeRecord, 'id'>>(EMPTY);
  const [step, setStep] = useState<Step>('form');

  // Campos para recortes / IA (só usados na criação)
  const [plannedCuts, setPlannedCuts] = useState<number>(0);
  const [cutTopics, setCutTopics] = useState<string[]>([]);

  // Edição e criação de cortes a partir do formulário do episódio
  const [editingCut, setEditingCut] = useState<AgroEvent | null>(null);
  const [showAddCut, setShowAddCut] = useState(false);

  const [publishDateError, setPublishDateError] = useState<string | null>(null);

  // Datas de publicação já ocupadas — exclui o episódio sendo editado
  const occupiedDates = useMemo(() =>
    episodes
      .filter(ep => ep.publishDate != null && ep.id !== editingId)
      .map(ep => format(ep.publishDate!, 'yyyy-MM-dd')),
    [episodes, editingId]
  );

  const toDateValue = (d: Date | undefined) =>
    d ? format(d, 'yyyy-MM-dd') : '';

  const handlePlannedCutsChange = (value: number) => {
    const n = Math.max(0, value);
    setPlannedCuts(n);
    setCutTopics(prev => {
      const next = [...prev];
      while (next.length < n) next.push('');
      return next.slice(0, n);
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Valida data de publicação contra conflitos de agenda
    if (form.publishDate) {
      const dateStr = format(form.publishDate, 'yyyy-MM-dd');
      if (!isDateAvailable(dateStr, occupiedDates)) {
        setPublishDateError('Esta data não está disponível. Escolha uma data com pelo menos 5 dias de distância do episódio mais próximo.');
        return;
      }
    }
    setPublishDateError(null);

    if (plannedCuts > 0) {
      // Vai para etapa de sugestão com IA — tanto na criação quanto na edição
      if (editingId) updateEpisode(editingId, form); // salva dados antes de ir para IA
      setStep('ai');
    } else if (editingId) {
      updateEpisode(editingId, form);
      setEditingId(null);
      setForm(EMPTY);
      setShowForm(false);
    } else {
      addEpisode(form);
      setForm(EMPTY);
      setPlannedCuts(0);
      setCutTopics([]);
      setShowForm(false);
    }
  };

  const handleAIConfirm = (cuts: Omit<AgroEvent, 'id'>[]) => {
    if (!editingId) addEpisode(form); // na edição, já foi salvo antes de entrar na IA
    if (cuts.length > 0) addEvents(cuts);
    setEditingId(null);
    setForm(EMPTY);
    setPlannedCuts(0);
    setCutTopics([]);
    setStep('form');
    setShowForm(false);
    setPublishDateError(null);
  };

  const startEdit = (ep: EpisodeRecord) => {
    setEditingId(ep.id);
    setForm({
      episodeNumber: ep.episodeNumber,
      name: ep.name,
      company: ep.company,
      companyId: ep.companyId,
      guest: ep.guest,
      recordingDate: ep.recordingDate,
      publishDate: ep.publishDate,
      status: ep.status,
      notes: ep.notes ?? '',
      linkVideo: ep.linkVideo ?? '',
      linkCarrossel: ep.linkCarrossel ?? '',
      linkThumbnail: ep.linkThumbnail ?? '',
      instagramCollabs: ep.instagramCollabs ?? [],
    });
    setPlannedCuts(0);
    setCutTopics([]);
    setStep('form');
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setPlannedCuts(0);
    setCutTopics([]);
    setStep('form');
    setPublishDateError(null);
  };

  const lastEpisodeNumber = episodes.reduce<number | null>((max, ep) => {
    if (ep.episodeNumber == null) return max;
    return max == null || ep.episodeNumber > max ? ep.episodeNumber : max;
  }, null);

  const formIsReadyForAI =
    form.name.trim() !== '' &&
    form.companyId !== '' &&
    form.guest.trim() !== '' &&
    plannedCuts > 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Cadastro de Episódios</h2>
          <p>{episodes.length} episódios cadastrados</p>
        </div>
        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            <Plus size={18} /> Novo Episódio
          </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        {showForm && step === 'form' && (
          <motion.form
            key="form"
            className={styles.form}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={handleSubmit}
          >
            <div className={styles.formTitle}>{editingId ? 'Editar Episódio' : 'Novo Episódio'}</div>

            {/* ── Dados do episódio ─────────────────────────────────────── */}
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Nº do Episódio</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 3"
                  value={form.episodeNumber ?? ''}
                  onChange={e => setForm(f => ({ ...f, episodeNumber: e.target.value ? Number(e.target.value) : undefined }))}
                />
                {!editingId && lastEpisodeNumber != null && (
                  <span className={styles.fieldHint}>
                    Último episódio cadastrado: nº {lastEpisodeNumber} · próximo sugerido: {lastEpisodeNumber + 1}
                  </span>
                )}
              </div>
              <div className={styles.field}>
                <label>Nome do Episódio</label>
                <input required placeholder="Ex: AgriLean EP2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Empresa Parceira</label>
                <select
                  required
                  value={form.companyId || ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'CREATE_NEW') { setIsCompanyModalOpen(true); return; }
                    const comp = companies.find(c => c.id === val);
                    setForm(f => ({ ...f, companyId: comp?.id || '', company: comp?.name || '' }));
                  }}
                >
                  <option value="" disabled>Selecione uma empresa</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="CREATE_NEW" style={{ fontWeight: 'bold' }}>+ Cadastrar nova empresa...</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Convidado</label>
                <input required placeholder="Ex: João Silva" value={form.guest} onChange={e => setForm(f => ({ ...f, guest: e.target.value }))} />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <TagInput
                  label="Instagram dos Convidados (Collab)"
                  value={form.instagramCollabs ?? []}
                  onChange={tags => setForm(f => ({ ...f, instagramCollabs: tags }))}
                  placeholder="Ex: @joaosilva · pressione Enter para adicionar"
                />
              </div>
              <div className={styles.field}>
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EpStatus }))}>
                  <option value="agendado">Agendado</option>
                  <option value="gravado">Gravado</option>
                  <option value="editando">Editando</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Data de Gravação</label>
                <input type="date" required value={toDateValue(form.recordingDate)} onChange={e => setForm(f => ({ ...f, recordingDate: new Date(e.target.value + 'T12:00:00') }))} />
              </div>
              <div className={styles.field}>
                <label>Data de Publicação do Episódio</label>
                <DatePickerInteligente
                  value={form.publishDate}
                  onChange={date => {
                    setForm(f => ({ ...f, publishDate: date }));
                    if (publishDateError) setPublishDateError(null);
                  }}
                  occupiedDates={occupiedDates}
                />
                {publishDateError && (
                  <span className={styles.fieldError}>{publishDateError}</span>
                )}
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label>Observações</label>
                <input placeholder="Ex: Pauta, temas, pendências..." value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {/* ── Links de produção (opcional) ──────────────────────────── */}
            <div className={styles.cutsSection} style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <div className={styles.cutsSectionHeader} style={{ color: '#475569' }}>
                <Link2 size={16} color="#475569" />
                <span>Links de Produção</span>
                <span className={styles.cutsBadge} style={{ background: '#e2e8f0', color: '#475569' }}>opcional</span>
              </div>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label>Vídeo EP Longo (Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={form.linkVideo ?? ''}
                    onChange={e => setForm(f => ({ ...f, linkVideo: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Carrossel</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.linkCarrossel ?? ''}
                    onChange={e => setForm(f => ({ ...f, linkCarrossel: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label>Thumbnails / Capas</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.linkThumbnail ?? ''}
                    onChange={e => setForm(f => ({ ...f, linkThumbnail: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* ── Seção de recortes ─────────────────────────────────────── */}
            <div className={styles.cutsSection}>
              <div className={styles.cutsSectionHeader}>
                <Film size={16} color="#6366f1" />
                <span>Recortes planejados</span>
                <span className={styles.cutsBadge}>opcional · com IA</span>
              </div>

              {/* ── Cortes existentes (só na edição) ── */}
              {editingId && (() => {
                const episodeCuts = events
                  .filter(ev => ev.episode === form.name)
                  .sort((a, b) => a.cutNumber - b.cutNumber);

                return episodeCuts.length > 0 ? (
                  <div className={styles.cutsList}>
                    {episodeCuts.map(cut => (
                      <div key={cut.id} className={styles.cutCard}>
                        <span className={styles.cutCardNum}>Corte #{cut.cutNumber}</span>
                        <div className={styles.cutCardInfo}>
                          <span className={styles.cutCardTitle}>{cut.title}</span>
                          <span className={styles.cutCardMeta}>
                            {format(cut.date, "dd/MM/yyyy", { locale: ptBR })}
                            {cut.platforms && ` · ${cut.platforms}`}
                          </span>
                        </div>
                        <span
                          className={styles.cutCardStatus}
                          style={{
                            background: cut.status === 'postado' ? '#dcfce7' : cut.status === 'agendado' ? '#fef3c7' : cut.status === 'em-edicao' ? '#dbeafe' : cut.status === 'em-aprovacao' ? '#f3e8ff' : '#f3f4f6',
                            color: cut.status === 'postado' ? '#166534' : cut.status === 'agendado' ? '#92400e' : cut.status === 'em-edicao' ? '#1e40af' : cut.status === 'em-aprovacao' ? '#6b21a8' : '#6b7280',
                          }}
                        >
                          {cut.status === 'postado' ? 'Postado' : cut.status === 'agendado' ? 'Agendado' : cut.status === 'em-edicao' ? 'Em Edição' : cut.status === 'em-aprovacao' ? 'Em Aprovação' : 'Pendente'}
                        </span>
                        <button type="button" className={styles.cutCardEditBtn} onClick={() => setEditingCut(cut)}>
                          <Edit3 size={13} /> Editar
                        </button>
                      </div>
                    ))}
                    <button type="button" className={styles.cutsAddBtn} onClick={() => setShowAddCut(true)}>
                      <Plus size={15} /> Adicionar novo corte manualmente
                    </button>
                  </div>
                ) : null;
              })()}

              {/* ── Fluxo de IA — aparece sempre (criação e edição) ── */}
              <div className={styles.cutsAiDivider}>
                <Sparkles size={13} color="#6366f1" />
                <span>{editingId ? 'Adicionar mais recortes com IA' : 'Planejar recortes com IA'}</span>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Quantidade de recortes</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="Ex: 8"
                    value={plannedCuts || ''}
                    onChange={e => handlePlannedCutsChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </div>
              </div>

              {plannedCuts > 0 && (
                <div className={styles.topicsGrid}>
                  <div className={styles.topicsLabel}>
                    Tópicos dos recortes
                    <span style={{ fontWeight: 400, marginLeft: 6 }}>(preencha para melhorar as sugestões da IA)</span>
                  </div>
                  {cutTopics.map((topic, i) => (
                    <div key={i} className={styles.topicRow}>
                      <div className={styles.topicNum}>{i + 1}</div>
                      <input
                        className={styles.topicInput}
                        placeholder={`Tópico do recorte ${i + 1}...`}
                        value={topic}
                        onChange={e => {
                          const next = [...cutTopics];
                          next[i] = e.target.value;
                          setCutTopics(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={cancel} className={styles.cancelBtn}><X size={16} /> Cancelar</button>
              {plannedCuts > 0 ? (
                <button type="submit" className={styles.aiSubmitBtn} disabled={!formIsReadyForAI}>
                  <Sparkles size={16} /> Sugerir agenda com IA
                </button>
              ) : (
                <button type="submit" className={styles.submitBtn}>
                  <Check size={16} /> {editingId ? 'Salvar alterações' : 'Cadastrar'}
                </button>
              )}
            </div>
          </motion.form>
        )}

        {showForm && step === 'ai' && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <EpisodeAISuggestion
              episode={form}
              episodeName={form.name}
              topics={cutTopics}
              cutCount={plannedCuts}
              onBack={() => setStep('form')}
              onConfirm={handleAIConfirm}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {episodes.length === 0 && !showForm ? (
        <div className={styles.empty}>
          <Mic size={48} strokeWidth={1.2} />
          <p>Nenhum episódio cadastrado ainda.</p>
          <p>Clique em <strong>Novo Episódio</strong> para começar.</p>
        </div>
      ) : (
        <div className={styles.list}>
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
              <motion.div key={ep.id} className={styles.card} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className={styles.cardStripe} style={{ background: STATUS_COLOR[ep.status] }} />
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitles}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {ep.episodeNumber != null && (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', background: '#f3f4f6', borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.5px' }}>
                            EP {ep.episodeNumber}
                          </span>
                        )}
                        <span className={styles.cardName}>{ep.name}</span>
                      </div>
                      <span className={styles.statusBadge} style={{ background: `${STATUS_COLOR[ep.status]}18`, color: STATUS_COLOR[ep.status] }}>
                        {STATUS_LABEL[ep.status]}
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      <button onClick={() => startEdit(ep)} className={styles.iconBtn}><Edit3 size={16} /></button>
                      <button onClick={() => setDeleteTarget(ep)} className={`${styles.iconBtn} ${styles.deleteBtn}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}><User size={13} />{ep.guest}</span>
                    <span className={styles.metaItem}><Building2 size={13} />{ep.company}</span>
                    <span className={styles.metaItem}><Mic size={13} />Gravação: {format(ep.recordingDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    {ep.publishDate && (
                      <span className={styles.metaItem}><Calendar size={13} />Publicação: {format(ep.publishDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    )}
                  </div>
                  {ep.notes && <p className={styles.notes}>{ep.notes}</p>}
                </div>
              </motion.div>
            ))}
        </div>
      )}
      <CompanyModal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} />

      {/* Modal de edição de corte — aberto pelo botão "Editar" na seção de recortes */}
      <EventDetailModal
        event={editingCut}
        onClose={() => setEditingCut(null)}
      />

      {/* Modal de criação de corte — com episódio e empresa pré-selecionados */}
      <ActivityModal
        isOpen={showAddCut}
        onClose={() => setShowAddCut(false)}
        defaultEpisode={form.name}
        defaultCompanyId={form.companyId}
      />

      {/* ── Modal de confirmação de exclusão ─────────────────────── */}
      {deleteTarget && (() => {
        const linkedCuts = events.filter(ev => ev.episode === deleteTarget.name).length;
        return (
          <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
            <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}>
                <AlertTriangle size={28} color="#ef4444" />
              </div>
              <h3 className={styles.modalTitle}>Excluir episódio?</h3>
              <p className={styles.modalBody}>
                Você está prestes a excluir <strong>"{deleteTarget.name}"</strong>.
                {linkedCuts > 0 && (
                  <> Esta ação também removerá <strong>{linkedCuts} corte{linkedCuts !== 1 ? 's' : ''} vinculado{linkedCuts !== 1 ? 's' : ''}</strong> do calendário.</>
                )}
              </p>
              <p className={styles.modalWarning}>Esta ação é irreversível e não pode ser desfeita.</p>
              <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={() => setDeleteTarget(null)}>
                  <X size={15} /> Cancelar
                </button>
                <button
                  className={styles.modalDeleteBtn}
                  onClick={() => { deleteEpisode(deleteTarget.id); setDeleteTarget(null); }}
                >
                  <Trash2 size={15} /> Sim, excluir{linkedCuts > 0 ? ` EP + ${linkedCuts} corte${linkedCuts !== 1 ? 's' : ''}` : ' episódio'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default EpisodesView;
