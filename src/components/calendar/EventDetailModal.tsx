import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Building2, Tag, FileText, Hash, CheckCircle2, Clock, Edit3, Film, AlertCircle, Trash2, AlertTriangle, Link2, Plus, Save, ExternalLink } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import type { AgroEvent, Status } from '../../types';
import styles from './EventDetailModal.module.css';
import { PLATFORMS, PLATFORM_COLOR } from './platformOptions';

const STATUS_ICON: Record<Status, React.ReactNode> = {
  postado: <CheckCircle2 size={16} />,
  agendado: <Clock size={16} />,
  'em-edicao': <Edit3 size={16} />,
  'em-aprovacao': <Film size={16} />,
  pendente: <AlertCircle size={16} />,
};

const STATUS_COLOR: Record<Status, string> = {
  postado: '#22c55e',
  agendado: '#f59e0b',
  'em-edicao': '#3b82f6',
  'em-aprovacao': '#8b5cf6',
  pendente: '#9ca3af',
};

interface Props {
  event: AgroEvent | null;
  onClose: () => void;
}

const EventDetailModal: React.FC<Props> = ({ event: initialEvent, onClose }) => {
  const { events, updateEvent, deleteEvent } = useEvents();
  const event = initialEvent ? events.find(e => e.id === initialEvent.id) || initialEvent : null;

  const [confirming, setConfirming] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Campos editáveis
  const [title, setTitle] = useState(event?.title ?? '');
  const [dateValue, setDateValue] = useState(event ? format(event.date, 'yyyy-MM-dd') : '');
  const [time, setTime] = useState(event?.time ?? '');
  const [platforms, setPlatforms] = useState(event?.platforms ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [linkProducao, setLinkProducao] = useState(event?.linkProducao ?? '');
  const [pubLinks, setPubLinks] = useState<{ channel: string; url: string }[]>(event?.publishedLinks ?? []);

  const savedRef = useRef({
    title: event?.title ?? '',
    dateValue: event ? format(event.date, 'yyyy-MM-dd') : '',
    time: event?.time ?? '',
    platforms: event?.platforms ?? '',
    notes: event?.notes ?? '',
    linkProducao: event?.linkProducao ?? '',
    pubLinks: JSON.stringify(event?.publishedLinks ?? []),
  });

  const isDirty =
    title !== savedRef.current.title ||
    dateValue !== savedRef.current.dateValue ||
    time !== savedRef.current.time ||
    platforms !== savedRef.current.platforms ||
    notes !== savedRef.current.notes ||
    linkProducao !== savedRef.current.linkProducao ||
    JSON.stringify(pubLinks) !== savedRef.current.pubLinks;

  useEffect(() => {
    const t = initialEvent?.title ?? '';
    const d = initialEvent ? format(initialEvent.date, 'yyyy-MM-dd') : '';
    const tm = initialEvent?.time ?? '';
    const pl = initialEvent?.platforms ?? '';
    const nt = initialEvent?.notes ?? '';
    const link = initialEvent?.linkProducao ?? '';
    const pub = initialEvent?.publishedLinks ?? [];
    setConfirming(false);
    setConfirmingClose(false);
    setDeleting(false);
    setToast(null);
    setTitle(t);
    setDateValue(d);
    setTime(tm);
    setPlatforms(pl);
    setNotes(nt);
    setLinkProducao(link);
    setPubLinks(pub);
    savedRef.current = { title: t, dateValue: d, time: tm, platforms: pl, notes: nt, linkProducao: link, pubLinks: JSON.stringify(pub) };
  }, [initialEvent?.id]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleClose = () => {
    if (isDirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (!event || !dateValue) return;
    const filteredPub = pubLinks.filter(p => p.channel || p.url);
    updateEvent(event.id, {
      title: title.trim() || event.title,
      date: new Date(dateValue + 'T12:00:00'),
      time: time.trim() || undefined,
      platforms: platforms.trim() || undefined,
      notes: notes.trim() || undefined,
      linkProducao: linkProducao.trim() || undefined,
      publishedLinks: filteredPub,
    });
    savedRef.current = {
      title: title.trim() || event.title,
      dateValue,
      time: time.trim(),
      platforms: platforms.trim(),
      notes: notes.trim(),
      linkProducao: linkProducao.trim(),
      pubLinks: JSON.stringify(filteredPub),
    };
    showToast('success', 'Corte atualizado!');
    setTimeout(onClose, 800);
  };

  const handleDeleteConfirm = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      deleteEvent(event.id);
      showToast('success', 'Corte excluído com sucesso.');
      setConfirming(false);
      setTimeout(onClose, 1200);
    } catch {
      showToast('error', 'Erro ao excluir. Tente novamente.');
      setDeleting(false);
    }
  };

  const addPubLink = () => setPubLinks(prev => [...prev, { channel: '', url: '' }]);
  const removePubLink = (idx: number) => setPubLinks(prev => prev.filter((_, i) => i !== idx));
  const changePubLink = (idx: number, field: 'channel' | 'url', value: string) =>
    setPubLinks(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  return (
    <>
      <AnimatePresence>
        {event && (
          <div className={styles.overlay} onClick={confirming || confirmingClose ? undefined : handleClose}>
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.header} style={{ borderLeftColor: STATUS_COLOR[event.status] }}>
                <div className={styles.headerContent}>
                  <span className={styles.episodeLabel}>{event.episode} · Corte #{event.cutNumber}</span>
                  <h2 className={styles.title}>{title || event.title}</h2>
                </div>
                <button onClick={handleClose} className={styles.closeBtn} disabled={deleting}><X size={22} /></button>
              </div>

              <div className={styles.body}>
                {/* Status */}
                <div className={styles.statusRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={styles.statusBadge}
                      style={{ background: `${STATUS_COLOR[event.status]}18`, color: STATUS_COLOR[event.status], borderColor: `${STATUS_COLOR[event.status]}40` }}
                    >
                      {STATUS_ICON[event.status]}
                    </span>
                    <select
                      value={event.status}
                      onChange={(e) => updateEvent(event.id, { status: e.target.value as Status })}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${STATUS_COLOR[event.status]}40`,
                        background: `${STATUS_COLOR[event.status]}18`,
                        color: STATUS_COLOR[event.status],
                        fontWeight: 500,
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="em-edicao">Em Edição</option>
                      <option value="em-aprovacao">Em Aprovação</option>
                      <option value="pendente">Pendente</option>
                      <option value="agendado">Agendado</option>
                      <option value="postado">Postado</option>
                    </select>
                  </div>
                </div>

                {/* Campos editáveis */}
                <div className={styles.editFields}>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}><Edit3 size={13} /> Título</label>
                    <input
                      className={styles.editInput}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Título do corte"
                    />
                  </div>

                  <div className={styles.editField}>
                    <label className={styles.editLabel}><Calendar size={13} /> Data de publicação</label>
                    <input
                      type="date"
                      className={styles.editInput}
                      value={dateValue}
                      onChange={e => setDateValue(e.target.value)}
                    />
                  </div>

                  <div className={styles.editField}>
                    <label className={styles.editLabel}><Clock size={13} /> Horário (opcional)</label>
                    <input
                      type="time"
                      className={styles.editInput}
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      placeholder="HH:MM"
                    />
                  </div>

                  <div className={styles.editField}>
                    <label className={styles.editLabel}><Tag size={13} /> Plataformas (opcional)</label>
                    <input
                      className={styles.editInput}
                      value={platforms}
                      onChange={e => setPlatforms(e.target.value)}
                      placeholder="Ex: Reels+Shorts+TT"
                    />
                  </div>

                  <div className={styles.editField}>
                    <label className={styles.editLabel}><FileText size={13} /> Observações (opcional)</label>
                    <input
                      className={styles.editInput}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Observações sobre o corte..."
                    />
                  </div>
                </div>

                {/* Empresa (somente leitura) */}
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Building2 size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Empresa</span>
                      <span className={styles.fieldValue}>{event.company}</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Hash size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Nº do corte</span>
                      <span className={styles.fieldValue}>#{event.cutNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Link de Produção */}
                <div className={styles.linksSection}>
                  <div className={styles.linksSectionTitle}>
                    <Link2 size={13} /> Link de Produção
                  </div>
                  <div className={styles.linkRow}>
                    <div className={styles.linkLabel}>Link do arquivo de produção</div>
                    <div className={styles.linkInputWrapper}>
                      <input
                        className={styles.linkInput}
                        placeholder="Cole o link aqui (Drive, Dropbox...)"
                        value={linkProducao}
                        onChange={e => setLinkProducao(e.target.value)}
                      />
                      {linkProducao.trim() && (
                        <a href={linkProducao.trim()} target="_blank" rel="noopener noreferrer" className={styles.linkOpenBtn} title="Abrir link">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Links Publicados (só quando postado) */}
                {event.status === 'postado' && (
                  <div className={styles.pubLinksSection}>
                    <div className={styles.pubLinksSectionTitle}>
                      <CheckCircle2 size={13} /> Links dos Conteúdos Publicados
                    </div>
                    {pubLinks.length === 0 && (
                      <div className={styles.pubLinksEmpty}>Nenhum link adicionado ainda.</div>
                    )}
                    <div className={styles.pubLinksList}>
                      {pubLinks.map((pl, idx) => {
                        const color = PLATFORM_COLOR[pl.channel] ?? '#6b7280';
                        return (
                          <div
                            key={idx}
                            className={styles.pubLinkRow}
                            style={{ borderLeftColor: pl.channel ? color : '#bbf7d0' }}
                          >
                            <select
                              className={styles.pubLinkSelect}
                              value={pl.channel}
                              onChange={e => changePubLink(idx, 'channel', e.target.value)}
                              style={pl.channel ? { color, borderColor: `${color}50`, fontWeight: 700 } : {}}
                            >
                              <option value="">Plataforma...</option>
                              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <input
                              className={styles.pubLinkUrl}
                              placeholder={`Cole o link do ${pl.channel || 'conteúdo'}...`}
                              value={pl.url}
                              onChange={e => changePubLink(idx, 'url', e.target.value)}
                            />
                            {pl.url.trim() && (
                              <a href={pl.url.trim()} target="_blank" rel="noopener noreferrer" className={styles.pubLinkOpenBtn} title="Abrir link">
                                <ExternalLink size={12} />
                              </a>
                            )}
                            <button type="button" className={styles.pubLinkRemove} onClick={() => removePubLink(idx)} title="Remover">
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" className={styles.pubLinkAdd} onClick={addPubLink}>
                      <Plus size={13} /> Adicionar link
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.footer}>
                <button
                  onClick={() => setConfirming(true)}
                  className={styles.deleteEpBtn}
                  disabled={deleting}
                >
                  <Trash2 size={15} />
                  Excluir corte
                </button>
                <button onClick={handleSave} className={styles.closeActionBtn} disabled={deleting || !dateValue}>
                  <Save size={14} /> Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmar fechar com mudanças não salvas */}
      {confirmingClose && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmingClose(false)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmHeader} style={{ background: '#fffbeb', borderBottomColor: '#fde68a' }}>
              <div className={styles.confirmIconWrap} style={{ background: '#fef3c7' }}>
                <AlertTriangle size={24} color="#d97706" />
              </div>
              <div className={styles.confirmTitle} style={{ color: '#92400e' }}>Alterações não salvas</div>
            </div>
            <div className={styles.confirmBody}>
              <p className={styles.confirmMsg}>
                Você tem alterações que ainda não foram salvas.<br />Se sair agora, elas serão perdidas.
              </p>
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setConfirmingClose(false)}>
                Continuar editando
              </button>
              <button
                className={styles.confirmDeleteBtn}
                style={{ background: '#d97706' }}
                onClick={onClose}
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação (excluir) */}
      {confirming && event && (
        <div className={styles.confirmOverlay} onClick={() => !deleting && setConfirming(false)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <div className={styles.confirmIconWrap}>
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <div className={styles.confirmTitle}>Excluir corte</div>
            </div>
            <div className={styles.confirmBody}>
              <p className={styles.confirmMsg}>
                Tem certeza que deseja excluir <strong>"{event.title}"</strong>?
              </p>
              <p className={styles.confirmWarning}>Essa ação não pode ser desfeita.</p>
            </div>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                <Trash2 size={14} />
                {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <CheckCircle2 size={16} />
          {toast.msg}
        </div>
      )}
    </>
  );
};

export default EventDetailModal;
