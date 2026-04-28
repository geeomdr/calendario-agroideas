import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Building2, User, Mic, FileText, Trash2, AlertTriangle, CheckCircle2, Link2, Plus, Save, ExternalLink } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EpisodeRecord } from '../../types';
import styles from './EventDetailModal.module.css';
import { PLATFORMS, PLATFORM_COLOR } from './platformOptions';

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

interface Props {
  episode: EpisodeRecord | null;
  onClose: () => void;
}

const EpisodeDetailModal: React.FC<Props> = ({ episode, onClose }) => {
  const { episodes, events, updateEpisode, deleteEpisode } = useEvents();
  const ep = episode ? episodes.find(e => e.id === episode.id) || episode : null;

  const [confirming, setConfirming] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Estado local dos links (controlado)
  const [linkVideo, setLinkVideo] = useState(ep?.linkVideo ?? '');
  const [linkCarrossel, setLinkCarrossel] = useState(ep?.linkCarrossel ?? '');
  const [linkThumbnail, setLinkThumbnail] = useState(ep?.linkThumbnail ?? '');
  const [pubLinks, setPubLinks] = useState<{ channel: string; url: string }[]>(ep?.publishedLinks ?? []);

  // Valores de referência para detectar mudanças não salvas
  const savedRef = useRef({
    linkVideo: ep?.linkVideo ?? '',
    linkCarrossel: ep?.linkCarrossel ?? '',
    linkThumbnail: ep?.linkThumbnail ?? '',
    pubLinks: JSON.stringify(ep?.publishedLinks ?? []),
  });

  const isDirty =
    linkVideo !== savedRef.current.linkVideo ||
    linkCarrossel !== savedRef.current.linkCarrossel ||
    linkThumbnail !== savedRef.current.linkThumbnail ||
    JSON.stringify(pubLinks) !== savedRef.current.pubLinks;

  // Reseta estado ao abrir um episódio diferente
  useEffect(() => {
    const lv = episode?.linkVideo ?? '';
    const lc = episode?.linkCarrossel ?? '';
    const lt = episode?.linkThumbnail ?? '';
    const pub = episode?.publishedLinks ?? [];
    setConfirming(false);
    setConfirmingClose(false);
    setDeleting(false);
    setToast(null);
    setLinkVideo(lv);
    setLinkCarrossel(lc);
    setLinkThumbnail(lt);
    setPubLinks(pub);
    savedRef.current = { linkVideo: lv, linkCarrossel: lc, linkThumbnail: lt, pubLinks: JSON.stringify(pub) };
  }, [episode?.id]);

  const linkedCutsCount = ep ? events.filter(ev => ev.episode === ep.name).length : 0;

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  // Fecha com verificação de mudanças não salvas
  const handleClose = () => {
    if (isDirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (!ep) return;
    const filteredPub = pubLinks.filter(p => p.channel || p.url);
    updateEpisode(ep.id, {
      linkVideo: linkVideo.trim() || undefined,
      linkCarrossel: linkCarrossel.trim() || undefined,
      linkThumbnail: linkThumbnail.trim() || undefined,
      publishedLinks: filteredPub,
    });
    savedRef.current = {
      linkVideo: linkVideo.trim(),
      linkCarrossel: linkCarrossel.trim(),
      linkThumbnail: linkThumbnail.trim(),
      pubLinks: JSON.stringify(filteredPub),
    };
    showToast('success', 'Links salvos!');
    setTimeout(onClose, 800);
  };

  const handleDeleteConfirm = async () => {
    if (!ep) return;
    setDeleting(true);
    try {
      deleteEpisode(ep.id);
      showToast('success', 'Episódio excluído com sucesso.');
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
        {ep && (
          <div className={styles.overlay} onClick={confirming || confirmingClose ? undefined : handleClose}>
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.header} style={{ borderLeftColor: STATUS_COLOR[ep.status] }}>
                <div className={styles.headerContent}>
                  <span className={styles.episodeLabel}>Episódio</span>
                  <h2 className={styles.title}>{ep.name}</h2>
                </div>
                <button onClick={handleClose} className={styles.closeBtn} disabled={deleting}><X size={22} /></button>
              </div>

              <div className={styles.body}>
                {/* Status */}
                <div className={styles.statusRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={styles.statusBadge}
                      style={{ background: `${STATUS_COLOR[ep.status]}18`, color: STATUS_COLOR[ep.status], borderColor: `${STATUS_COLOR[ep.status]}40` }}
                    >
                      {STATUS_LABEL[ep.status]}
                    </span>
                    <select
                      value={ep.status}
                      onChange={(e) => updateEpisode(ep.id, { status: e.target.value as EpStatus })}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${STATUS_COLOR[ep.status]}40`,
                        background: `${STATUS_COLOR[ep.status]}18`,
                        color: STATUS_COLOR[ep.status],
                        fontWeight: 500,
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="agendado">Agendado</option>
                      <option value="gravado">Gravado</option>
                      <option value="editando">Editando</option>
                      <option value="publicado">Publicado</option>
                    </select>
                  </div>
                </div>

                {/* Campos principais */}
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Building2 size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Empresa</span>
                      <span className={styles.fieldValue}>{ep.company}</span>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><User size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Convidado</span>
                      <span className={styles.fieldValue}>{ep.guest}</span>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.fieldIcon}><Mic size={15} /></span>
                    <div>
                      <span className={styles.fieldLabel}>Data de Gravação</span>
                      <span className={styles.fieldValue}>
                        {format(ep.recordingDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {ep.publishDate && (
                    <div className={styles.field}>
                      <span className={styles.fieldIcon}><Calendar size={15} /></span>
                      <div>
                        <span className={styles.fieldLabel}>Data de Publicação</span>
                        <span className={styles.fieldValue}>
                          {format(ep.publishDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  )}

                  {ep.notes && (
                    <div className={styles.field}>
                      <span className={styles.fieldIcon}><FileText size={15} /></span>
                      <div>
                        <span className={styles.fieldLabel}>Observações</span>
                        <span className={styles.fieldValue}>{ep.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Links de Produção ───────────────────────────────────── */}
                <div className={styles.linksSection}>
                  <div className={styles.linksSectionTitle}>
                    <Link2 size={13} /> Links de Produção
                  </div>

                  <div className={styles.linkRow}>
                    <div className={styles.linkLabel}>Vídeo EP Longo (Google Drive)</div>
                    <div className={styles.linkInputWrapper}>
                      <input
                        className={styles.linkInput}
                        placeholder="Cole o link aqui..."
                        value={linkVideo}
                        onChange={e => setLinkVideo(e.target.value)}
                      />
                      {linkVideo.trim() && (
                        <a href={linkVideo.trim()} target="_blank" rel="noopener noreferrer" className={styles.linkOpenBtn} title="Abrir link">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className={styles.linkRow}>
                    <div className={styles.linkLabel}>Carrossel</div>
                    <div className={styles.linkInputWrapper}>
                      <input
                        className={styles.linkInput}
                        placeholder="Cole o link aqui..."
                        value={linkCarrossel}
                        onChange={e => setLinkCarrossel(e.target.value)}
                      />
                      {linkCarrossel.trim() && (
                        <a href={linkCarrossel.trim()} target="_blank" rel="noopener noreferrer" className={styles.linkOpenBtn} title="Abrir link">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className={styles.linkRow}>
                    <div className={styles.linkLabel}>Thumbnails / Capas</div>
                    <div className={styles.linkInputWrapper}>
                      <input
                        className={styles.linkInput}
                        placeholder="Cole o link aqui..."
                        value={linkThumbnail}
                        onChange={e => setLinkThumbnail(e.target.value)}
                      />
                      {linkThumbnail.trim() && (
                        <a href={linkThumbnail.trim()} target="_blank" rel="noopener noreferrer" className={styles.linkOpenBtn} title="Abrir link">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Links Publicados (só quando publicado) ──────────────── */}
                {ep.status === 'publicado' && (
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
                            <button
                              type="button"
                              className={styles.pubLinkRemove}
                              onClick={() => removePubLink(idx)}
                              title="Remover"
                            >
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
                  Excluir EP
                </button>
                <button onClick={handleSave} className={styles.closeActionBtn} disabled={deleting}>
                  <Save size={14} /> Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmar fechar com mudanças não salvas ──────────────────── */}
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

      {/* ── Modal de confirmação (excluir) ───────────────────────────── */}
      {confirming && ep && (
        <div className={styles.confirmOverlay} onClick={() => !deleting && setConfirming(false)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <div className={styles.confirmIconWrap}>
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <div className={styles.confirmTitle}>Excluir EP</div>
            </div>
            <div className={styles.confirmBody}>
              <p className={styles.confirmMsg}>
                Tem certeza que deseja excluir <strong>"{ep.name}"</strong>?
                {linkedCutsCount > 0 && (
                  <> Isso também removerá <strong>{linkedCutsCount} corte{linkedCutsCount !== 1 ? 's' : ''}</strong> vinculado{linkedCutsCount !== 1 ? 's' : ''}.</>
                )}
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

export default EpisodeDetailModal;
