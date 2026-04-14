import React, { useState, useEffect } from 'react';
import { X, Calendar, Building2, Tag, FileText, Hash, CheckCircle2, Clock, Edit3, Film, AlertCircle, Trash2, AlertTriangle, Link2, Plus } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AgroEvent, Status } from '../../types';
import styles from './EventDetailModal.module.css';

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
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Reseta estado ao abrir um evento diferente
  useEffect(() => {
    setConfirming(false);
    setDeleting(false);
    setToast(null);
  }, [initialEvent?.id]);

  // ── Links helpers ──────────────────────────────────────────────────────
  const pubLinks = event?.publishedLinks ?? [];

  const updatePubLinks = (updated: { channel: string; url: string }[]) => {
    if (!event) return;
    updateEvent(event.id, { publishedLinks: updated });
  };

  const addPubLink = () => updatePubLinks([...pubLinks, { channel: '', url: '' }]);
  const removePubLink = (idx: number) => updatePubLinks(pubLinks.filter((_, i) => i !== idx));
  const changePubLink = (idx: number, field: 'channel' | 'url', value: string) => {
    updatePubLinks(pubLinks.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
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

  return (
    <>
      <AnimatePresence>
        {event && (
          <div className={styles.overlay} onClick={confirming ? undefined : onClose}>
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.header} style={{ borderLeftColor: STATUS_COLOR[event.status] }}>
                <div className={styles.headerContent}>
                  <span className={styles.episodeLabel}>{event.episode}</span>
                  <h2 className={styles.title}>{event.title}</h2>
                </div>
                <button onClick={onClose} className={styles.closeBtn} disabled={deleting}><X size={22} /></button>
              </div>

              <div className={styles.body}>
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
                        cursor: 'pointer'
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

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Hash size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Corte</span>
                      <span className={styles.fieldValue}>#{event.cutNumber}</span>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Calendar size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Data de Publicação</span>
                      <span className={styles.fieldValue}>
                        {format(event.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {event.time && (
                    <div className={styles.field}>
                      <span className={styles.fieldIcon}><Clock size={15} /></span>
                      <div>
                        <span className={styles.fieldLabel}>Horário</span>
                        <span className={styles.fieldValue}>{event.time}</span>
                      </div>
                    </div>
                  )}

                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Building2 size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Empresa</span>
                      <span className={styles.fieldValue}>{event.company}</span>
                    </div>
                  </div>

                  {event.platforms && (
                    <div className={styles.field}>
                      <span className={styles.fieldIcon}><Tag size={15} /></span>
                      <div>
                        <span className={styles.fieldLabel}>Plataformas</span>
                        <span className={styles.fieldValue}>{event.platforms}</span>
                      </div>
                    </div>
                  )}

                  {event.notes && (
                    <div className={styles.field}>
                      <span className={styles.fieldIcon}><FileText size={15} /></span>
                      <div>
                        <span className={styles.fieldLabel}>Observações</span>
                        <span className={styles.fieldValue}>{event.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Link de Produção ──────────────────────────────────── */}
                <div className={styles.linksSection}>
                  <div className={styles.linksSectionTitle}>
                    <Link2 size={13} /> Link de Produção
                  </div>
                  <div className={styles.linkRow}>
                    <div className={styles.linkLabel}>Link do arquivo de produção</div>
                    <input
                      key={event.id + '-prod'}
                      className={styles.linkInput}
                      placeholder="Cole o link aqui (Drive, Dropbox...)"
                      defaultValue={event.linkProducao ?? ''}
                      onBlur={e => updateEvent(event.id, { linkProducao: e.target.value.trim() || undefined })}
                    />
                  </div>
                </div>

                {/* ── Links Publicados (só quando postado) ─────────────── */}
                {event.status === 'postado' && (
                  <div className={styles.pubLinksSection}>
                    <div className={styles.pubLinksSectionTitle}>
                      <CheckCircle2 size={13} /> Links dos Conteúdos Publicados
                    </div>
                    {pubLinks.map((pl, idx) => (
                      <div key={idx} className={styles.pubLinkRow}>
                        <input
                          className={styles.pubLinkChannel}
                          placeholder="Canal / Plataforma"
                          value={pl.channel}
                          onChange={e => changePubLink(idx, 'channel', e.target.value)}
                          onBlur={() => updatePubLinks(pubLinks)}
                        />
                        <input
                          className={styles.pubLinkUrl}
                          placeholder="https://..."
                          value={pl.url}
                          onChange={e => changePubLink(idx, 'url', e.target.value)}
                          onBlur={() => updatePubLinks(pubLinks)}
                        />
                        <button type="button" className={styles.pubLinkRemove} onClick={() => removePubLink(idx)} title="Remover">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
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
                <button onClick={onClose} className={styles.closeActionBtn} disabled={deleting}>Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal de confirmação ─────────────────────────────────────── */}
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

      {/* ── Toast ───────────────────────────────────────────────────── */}
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
