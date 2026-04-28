import React, { useState } from 'react';
import {
  Building2, User, Mic, Calendar, Scissors, CheckCircle2, Clock,
  Film, AlertCircle, Edit3, FileDown, FileText, Link2, ExternalLink, Tag, ChevronDown,
} from 'lucide-react';
import { SocialLinksBar } from './socialLinks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../../contexts/EventsContext';
import type { AgroEvent, EpisodeRecord, Status } from '../../types';
import styles from './SharedEpisodeView.module.css';
import logoAgroideas from '../../assets/logo-agroideas.png';

// ── Status maps ───────────────────────────────────────────────────────────

const EP_STATUS_LABEL: Record<EpisodeRecord['status'], string> = {
  gravado: 'Gravado', agendado: 'Agendado', editando: 'Editando', publicado: 'Publicado',
};
const EP_STATUS_COLOR: Record<EpisodeRecord['status'], string> = {
  gravado: '#8b5cf6', agendado: '#f59e0b', editando: '#3b82f6', publicado: '#22c55e',
};

const CUT_STATUS_LABEL: Record<Status, string> = {
  postado: 'Postado', agendado: 'Agendado', 'em-aprovacao': 'Em Aprovação',
  pendente: 'Pendente', 'em-edicao': 'Em Edição',
};
const CUT_STATUS_COLOR: Record<Status, string> = {
  postado: '#22c55e', agendado: '#f59e0b', 'em-aprovacao': '#8b5cf6',
  pendente: '#9ca3af', 'em-edicao': '#3b82f6',
};
const CUT_STATUS_ICON: Record<Status, React.ReactNode> = {
  postado: <CheckCircle2 size={12} />,
  agendado: <Clock size={12} />,
  'em-aprovacao': <Film size={12} />,
  pendente: <AlertCircle size={12} />,
  'em-edicao': <Edit3 size={12} />,
};

// ── Helpers ───────────────────────────────────────────────────────────────

function isValidUrl(str?: string) {
  if (!str) return false;
  try { new URL(str); return true; } catch { return false; }
}

// ── Componente ────────────────────────────────────────────────────────────

interface Props {
  episodeName: string | null;
}

const SharedEpisodeView: React.FC<Props> = ({ episodeName }) => {
  const { episodes, events } = useEvents();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  if (!episodeName) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <FileText size={48} strokeWidth={1.2} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>Link inválido</p>
          <p style={{ fontSize: '14px' }}>O episódio não foi encontrado.</p>
        </div>
      </div>
    );
  }

  const episode = episodes.find(e => e.name === episodeName) ?? null;

  const cuts: AgroEvent[] = events
    .filter(ev => ev.episode === episodeName)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const epPublishDate = episode?.publishDate;
  const headerCompany = episode?.company ?? cuts[0]?.company ?? '';
  const headerGuest = episode?.guest ?? '';

  // Timeline cronológica
  type Item = { kind: 'episode'; ep: EpisodeRecord } | { kind: 'cut'; cut: AgroEvent };
  const allItems: { date: Date; item: Item }[] = [
    ...(episode && epPublishDate ? [{ date: epPublishDate, item: { kind: 'episode' as const, ep: episode } }] : []),
    ...cuts.map(c => ({ date: c.date, item: { kind: 'cut' as const, cut: c } })),
  ];
  allItems.sort((a, b) => a.date.getTime() - b.date.getTime());
  const timeline = allItems.map(i => i.item);
  if (episode && !epPublishDate) timeline.unshift({ kind: 'episode', ep: episode });

  // Stats
  const posted = cuts.filter(c => c.status === 'postado').length;
  const scheduled = cuts.filter(c => c.status === 'agendado').length;
  const pending = cuts.filter(c => c.status === 'pendente').length;
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Links de produção do episódio
  const prodLinks = [
    { label: 'Vídeo EP Longo (Google Drive)', url: episode?.linkVideo },
    { label: 'Carrossel', url: episode?.linkCarrossel },
    { label: 'Thumbnails / Capas', url: episode?.linkThumbnail },
  ].filter(l => isValidUrl(l.url));

  const pubLinks = (episode?.publishedLinks ?? []).filter(pl => pl.channel || pl.url);

  if (!episode && cuts.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.topbar}>
          <div className={styles.topbarBrand}>
            <img src={logoAgroideas} alt="AgroIdeas" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
            Calendário Editorial
          </div>
        </div>
        <div className={styles.notFound}>
          <FileText size={48} strokeWidth={1.2} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>Episódio não encontrado</p>
          <p style={{ fontSize: '14px' }}>"{episodeName}" não possui conteúdo cadastrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <div className={styles.topbar}>
        <div className={styles.topbarBrand}>
          <img src={logoAgroideas} alt="AgroIdeas" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
          Calendário Editorial
        </div>
        <div className={styles.topbarActions}>
          <button className={styles.printBtn} onClick={() => window.print()}>
            <FileDown size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* ── Cabeçalho do episódio ─────────────────────────────────── */}
        <div className={styles.epHeader}>
          <div className={styles.epHeaderTop}>
            <div className={styles.epLabel}>Calendário Editorial · AgroIdeas</div>
            <div className={styles.epName}>
              {episode?.episodeNumber != null ? `EP ${episode.episodeNumber} — ` : ''}{episodeName}
            </div>
            <div className={styles.epMeta}>
              {headerCompany && (
                <span className={styles.epMetaItem}><Building2 size={14} />{headerCompany}</span>
              )}
              {headerGuest && (
                <span className={styles.epMetaItem}><User size={14} />{headerGuest}</span>
              )}
              {episode?.recordingDate && (
                <span className={styles.epMetaItem}>
                  <Mic size={14} />Gravação: {format(episode.recordingDate, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              {epPublishDate && (
                <span className={styles.epMetaItem}>
                  <Calendar size={14} />Publicação: {format(epPublishDate, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              <span className={styles.epMetaItem}>
                <Scissors size={14} />{cuts.length} recorte{cuts.length !== 1 ? 's' : ''}
              </span>
              {episode && (
                <span
                  className={styles.epMetaItem}
                  style={{
                    background: `${EP_STATUS_COLOR[episode.status]}30`,
                    color: EP_STATUS_COLOR[episode.status],
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontWeight: 700,
                  }}
                >
                  {EP_STATUS_LABEL[episode.status]}
                </span>
              )}
            </div>
            {episode?.notes && (
              <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8, fontStyle: 'italic' }}>
                {episode.notes}
              </div>
            )}
          </div>

          {cuts.length > 0 && (
            <div className={styles.epHeaderBottom}>
              <span className={styles.statChip}>
                <span className={styles.statDot} style={{ background: '#22c55e' }} />
                {posted} postado{posted !== 1 ? 's' : ''}
              </span>
              <span className={styles.statChip}>
                <span className={styles.statDot} style={{ background: '#f59e0b' }} />
                {scheduled} agendado{scheduled !== 1 ? 's' : ''}
              </span>
              <span className={styles.statChip}>
                <span className={styles.statDot} style={{ background: '#9ca3af' }} />
                {pending} pendente{pending !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── Links de Produção ──────────────────────────────────────── */}
        {prodLinks.length > 0 && (
          <div className={styles.linksBox}>
            <div className={styles.linksBoxTitle}>
              <Link2 size={13} /> Links de Produção
            </div>
            {prodLinks.map((l, i) => (
              <div key={i} className={styles.linkItem}>
                <div className={styles.linkItemLabel}>{l.label}</div>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className={styles.linkItemUrl}>
                  <ExternalLink size={12} />
                  {l.url}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* ── Links Publicados ───────────────────────────────────────── */}
        {pubLinks.length > 0 && (
          <div className={styles.pubLinksBox}>
            <div className={styles.pubLinksTitle}>
              <CheckCircle2 size={13} /> Links dos Conteúdos Publicados
            </div>
            {pubLinks.map((pl, i) => (
              <div key={i} className={styles.pubLinkRow}>
                {pl.channel && <span className={styles.pubLinkChannel}>{pl.channel}</span>}
                {pl.url && (
                  <a href={pl.url} target="_blank" rel="noopener noreferrer" className={styles.pubLinkUrl}>
                    {pl.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Timeline ───────────────────────────────────────────────── */}
        {timeline.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Linha do tempo de publicação</div>

            {timeline.map((item, idx) => {
              if (item.kind === 'episode') {
                const epKey = `ep-${idx}`;
                const ep = item.ep;
                const epLinks = [
                  { label: 'Vídeo EP Longo (Google Drive)', url: ep.linkVideo },
                  { label: 'Carrossel', url: ep.linkCarrossel },
                  { label: 'Thumbnails / Capas', url: ep.linkThumbnail },
                ].filter(l => isValidUrl(l.url));
                const epPubLinks = (ep.publishedLinks ?? []).filter(l => l.channel || l.url);
                const epHasDetails = ep.notes || epLinks.length > 0 || epPubLinks.length > 0;
                const epOpen = expanded.has(epKey);
                return (
                  <div
                    key={epKey}
                    className={`${styles.card} ${styles.cardEp} ${epHasDetails ? styles.cardExpandable : ''}`}
                    onClick={epHasDetails ? () => toggleExpand(epKey) : undefined}
                  >
                    <div className={styles.cardTop}>
                      <span className={`${styles.badge} ${styles.badgeEp}`}>EP</span>
                      <div className={styles.cardBody}>
                        <div className={styles.cardTitle}>{ep.name}</div>
                        <div className={styles.cardSub}>{ep.company}{ep.guest ? ` · ${ep.guest}` : ''}</div>
                      </div>
                      <div className={styles.cardRight}>
                        <span className={styles.cardDate}>
                          {epPublishDate ? format(epPublishDate, "dd 'de' MMM", { locale: ptBR }) : '—'}
                        </span>
                        <span className={styles.cardStatus} style={{ background: `${EP_STATUS_COLOR[ep.status]}18`, color: EP_STATUS_COLOR[ep.status] }}>
                          {EP_STATUS_LABEL[ep.status]}
                        </span>
                      </div>
                      {epHasDetails && (
                        <span className={`${styles.cardChevron} ${epOpen ? styles.cardChevronOpen : ''}`}>
                          <ChevronDown size={16} />
                        </span>
                      )}
                    </div>
                    {epOpen && (
                      <div className={styles.cardExpandedBody}>
                        {ep.notes && <div className={styles.cardNotes}>{ep.notes}</div>}
                        {epLinks.map((l, i) => (
                          <div key={i} className={styles.cardNotes} style={{ borderLeftColor: '#93c5fd', background: '#eff6ff' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', display: 'block', marginBottom: 2 }}>{l.label}</span>
                            <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#1d4ed8', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ExternalLink size={11} />{l.url}
                            </a>
                          </div>
                        ))}
                        {epPubLinks.length > 0 && (
                          <div className={styles.cardNotes} style={{ borderLeftColor: '#86efac', background: '#f0fdf4' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', display: 'block', marginBottom: 6 }}>Links Publicados</span>
                            {epPubLinks.map((pl, i) => (
                              <div key={i} className={styles.pubLinkRow}>
                                {pl.channel && <span className={styles.pubLinkChannel}>{pl.channel}</span>}
                                {pl.url && <a href={pl.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={styles.pubLinkUrl}>{pl.url}</a>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              const cut = item.cut;
              const cutKey = `cut-${cut.id}`;
              const cutPubLinks = (cut.publishedLinks ?? []).filter(pl => pl.channel || pl.url);
              const cutHasDetails = cut.notes || isValidUrl(cut.linkProducao) || cutPubLinks.length > 0;
              const cutOpen = expanded.has(cutKey);
              return (
                <div
                  key={cutKey}
                  className={`${styles.card} ${cutHasDetails ? styles.cardExpandable : ''}`}
                  onClick={cutHasDetails ? () => toggleExpand(cutKey) : undefined}
                >
                  <div className={styles.cardTop}>
                    <span className={`${styles.badge} ${styles.badgeCut}`}>#{cut.cutNumber}</span>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>{cut.title}</div>
                      <div className={styles.cardMeta}>
                        {cut.platforms && <span className={styles.cardMetaItem}><Tag size={11} />{cut.platforms}</span>}
                        {cut.company && <span className={styles.cardMetaItem}><Building2 size={11} />{cut.company}</span>}
                        {cut.time && <span className={styles.cardMetaItem}><Clock size={11} />{cut.time}</span>}
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.cardDate}>{format(cut.date, "dd 'de' MMM", { locale: ptBR })}</span>
                      <span className={styles.cardStatus} style={{ background: `${CUT_STATUS_COLOR[cut.status]}18`, color: CUT_STATUS_COLOR[cut.status] }}>
                        {CUT_STATUS_ICON[cut.status]} {CUT_STATUS_LABEL[cut.status]}
                      </span>
                    </div>
                    {cutHasDetails && (
                      <span className={`${styles.cardChevron} ${cutOpen ? styles.cardChevronOpen : ''}`}>
                        <ChevronDown size={16} />
                      </span>
                    )}
                  </div>
                  {cutOpen && (
                    <div className={styles.cardExpandedBody}>
                      {cut.notes && <div className={styles.cardNotes}>{cut.notes}</div>}
                      {isValidUrl(cut.linkProducao) && (
                        <div className={styles.cardNotes} style={{ borderLeftColor: '#93c5fd', background: '#eff6ff' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', display: 'block', marginBottom: 2 }}>Link de Produção</span>
                          <a href={cut.linkProducao} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#1d4ed8', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ExternalLink size={11} />{cut.linkProducao}
                          </a>
                        </div>
                      )}
                      {cutPubLinks.length > 0 && (
                        <div className={styles.cardNotes} style={{ borderLeftColor: '#86efac', background: '#f0fdf4' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', display: 'block', marginBottom: 6 }}>Links Publicados</span>
                          {cutPubLinks.map((pl, i) => (
                            <div key={i} className={styles.pubLinkRow}>
                              {pl.channel && <span className={styles.pubLinkChannel}>{pl.channel}</span>}
                              {pl.url && <a href={pl.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={styles.pubLinkUrl}>{pl.url}</a>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          <SocialLinksBar size={20} />
          <span>Gerado em {today} · AgroIdeas Calendário Editorial</span>
        </div>
      </div>
    </div>
  );
};

export default SharedEpisodeView;
