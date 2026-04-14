import React, { useState } from 'react';
import {
  FileDown, FileText, Building2, User, Mic, Calendar, Scissors,
  CheckCircle2, Clock, Film, AlertCircle, Edit3, Link2, Check,
  ExternalLink, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../../contexts/EventsContext';
import type { AgroEvent, EpisodeRecord, Status } from '../../types';
import styles from './ExportView.module.css';
import { SocialLinksBar, socialLinksHtml } from './socialLinks';

// ── Mapeamentos de status ──────────────────────────────────────────────────

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
  postado: <CheckCircle2 size={13} />,
  agendado: <Clock size={13} />,
  'em-aprovacao': <Film size={13} />,
  pendente: <AlertCircle size={13} />,
  'em-edicao': <Edit3 size={13} />,
};

// ── Componente ────────────────────────────────────────────────────────────

const ExportView: React.FC = () => {
  const { episodes, events } = useEvents();
  const [selectedName, setSelectedName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const isAll = selectedName === '__ALL__';

  // ── Listas de episódios ───────────────────────────────────────────────────

  const registeredNames = new Set(episodes.map(e => e.name));

  const cutsOnlyNames = Array.from(
    new Set(events.map(ev => ev.episode).filter(name => !registeredNames.has(name)))
  ).sort();

  const sortedEpisodes = [...episodes].sort((a, b) => {
    if (a.episodeNumber != null && b.episodeNumber != null) return a.episodeNumber - b.episodeNumber;
    if (a.episodeNumber != null) return -1;
    if (b.episodeNumber != null) return 1;
    return (a.publishDate?.getTime() ?? 0) - (b.publishDate?.getTime() ?? 0);
  });

  // ── Dados do episódio selecionado (single mode) ───────────────────────────

  const episode: EpisodeRecord | null = isAll ? null : (episodes.find(e => e.name === selectedName) ?? null);

  const cuts: AgroEvent[] = (!isAll && selectedName)
    ? events.filter(ev => ev.episode === selectedName).sort((a, b) => a.date.getTime() - b.date.getTime())
    : [];

  // ── Grupos para modo __ALL__ ──────────────────────────────────────────────

  type Group = { ep: EpisodeRecord | null; name: string; cuts: AgroEvent[] };

  const allGroups: Group[] = isAll ? [
    ...sortedEpisodes.map(ep => ({
      ep,
      name: ep.name,
      cuts: events.filter(ev => ev.episode === ep.name).sort((a, b) => a.date.getTime() - b.date.getTime()),
    })),
    ...cutsOnlyNames.map(name => ({
      ep: null,
      name,
      cuts: events.filter(ev => ev.episode === name).sort((a, b) => a.date.getTime() - b.date.getTime()),
    })),
  ] : [];

  const epPublishDate = episode?.publishDate;

  // ── Timeline cronológica (single mode) ────────────────────────────────────

  type TimelineItem =
    | { kind: 'episode'; ep: EpisodeRecord }
    | { kind: 'cut'; cut: AgroEvent };

  const timeline: TimelineItem[] = [];

  if (!isAll && selectedName) {
    const allItems: { date: Date; item: TimelineItem }[] = [
      ...(episode && epPublishDate
        ? [{ date: epPublishDate, item: { kind: 'episode' as const, ep: episode } }]
        : []),
      ...cuts.map(c => ({ date: c.date, item: { kind: 'cut' as const, cut: c } })),
    ];
    allItems.sort((a, b) => a.date.getTime() - b.date.getTime());
    allItems.forEach(({ item }) => timeline.push(item));
    if (episode && !epPublishDate) timeline.unshift({ kind: 'episode', ep: episode });
  }

  // ── Estatísticas ──────────────────────────────────────────────────────────

  const statCuts = isAll ? allGroups.flatMap(g => g.cuts) : cuts;
  const totalCuts = statCuts.length;
  const posted = statCuts.filter(c => c.status === 'postado').length;
  const scheduled = statCuts.filter(c => c.status === 'agendado').length;
  const pending = statCuts.filter(c => c.status === 'pendente').length;

  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const headerCompany = episode?.company ?? cuts[0]?.company ?? '';
  const headerGuest = episode?.guest ?? '';
  const headerRecordingDate = episode?.recordingDate;

  const canExport = !!selectedName;

  const shareUrl = (!isAll && selectedName)
    ? `${window.location.origin}${window.location.pathname}?shared=episode&name=${encodeURIComponent(selectedName)}`
    : '';

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Helpers de renderização das linhas ────────────────────────────────────

  const renderEpRow = (ep: EpisodeRecord, pubDate: Date | undefined, keyPrefix: string) => {
    const epKey = `${keyPrefix}-ep-${ep.id}`;
    const epLinks = [
      { label: 'Vídeo EP Longo (Google Drive)', url: ep.linkVideo },
      { label: 'Carrossel', url: ep.linkCarrossel },
      { label: 'Thumbnails / Capas', url: ep.linkThumbnail },
    ].filter(l => l.url);
    const epPubLinks = (ep.publishedLinks ?? []).filter(l => l.channel || l.url);
    const epHasDetails = !!(ep.notes || epLinks.length > 0 || epPubLinks.length > 0);
    const epOpen = expanded.has(epKey);
    return (
      <div
        key={epKey}
        className={`${styles.episodeRow} ${epHasDetails ? styles.rowExpandable : ''}`}
        onClick={epHasDetails ? () => toggleExpand(epKey) : undefined}
      >
        <div className={styles.rowTop}>
          <span className={`${styles.rowType} ${styles.typeEp}`}>EP</span>
          <div className={styles.rowInfo}>
            <div className={styles.rowTitle}>{ep.name}</div>
            <div className={styles.rowSub}>{ep.company}{ep.guest ? ` · ${ep.guest}` : ''}</div>
          </div>
          <span className={styles.rowDate}>
            {pubDate
              ? format(pubDate, "dd 'de' MMM", { locale: ptBR })
              : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Sem data</span>}
          </span>
          <span className={styles.rowStatus} style={{ background: `${EP_STATUS_COLOR[ep.status]}18`, color: EP_STATUS_COLOR[ep.status] }}>
            {EP_STATUS_LABEL[ep.status]}
          </span>
          {epHasDetails && (
            <span className={`${styles.rowChevron} ${epOpen ? styles.rowChevronOpen : ''}`}>
              <ChevronDown size={16} />
            </span>
          )}
        </div>
        {epOpen && (
          <div className={styles.rowDetails}>
            {ep.notes && <div className={styles.rowNotes}>{ep.notes}</div>}
            {epLinks.map((l, i) => (
              <div key={i} className={styles.rowLinkItem}>
                <div className={styles.rowLinkLabel}>{l.label}</div>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className={styles.rowLinkUrl} onClick={e => e.stopPropagation()}>
                  <ExternalLink size={11} />{l.url}
                </a>
              </div>
            ))}
            {epPubLinks.length > 0 && (
              <div className={styles.rowPubLinks}>
                <div className={styles.rowPubLinksLabel}>Links publicados</div>
                {epPubLinks.map((pl, i) => (
                  <div key={i} className={styles.rowPubLinkRow}>
                    {pl.channel && <span className={styles.rowPubChannel}>{pl.channel}</span>}
                    {pl.url && <a href={pl.url} target="_blank" rel="noopener noreferrer" className={styles.rowPubUrl} onClick={e => e.stopPropagation()}>{pl.url}</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCutRow = (cut: AgroEvent, keyPrefix: string) => {
    const cutKey = `${keyPrefix}-cut-${cut.id}`;
    const cutPubLinks = (cut.publishedLinks ?? []).filter(l => l.channel || l.url);
    const cutHasDetails = !!(cut.notes || cut.linkProducao || cutPubLinks.length > 0);
    const cutOpen = expanded.has(cutKey);
    return (
      <div
        key={cutKey}
        className={`${styles.cutRow} ${cutHasDetails ? styles.rowExpandable : ''}`}
        onClick={cutHasDetails ? () => toggleExpand(cutKey) : undefined}
      >
        <div className={styles.rowTop}>
          <span className={`${styles.rowType} ${styles.typeCut}`}>#{cut.cutNumber}</span>
          <div className={styles.rowInfo}>
            <div className={styles.rowTitle}>{cut.title}</div>
            {cut.platforms && <div className={styles.rowSub}>{cut.platforms}</div>}
          </div>
          <span className={styles.rowDate}>
            {format(cut.date, "dd 'de' MMM", { locale: ptBR })}
            {cut.time && <span style={{ fontWeight: 400, marginLeft: 4, color: 'var(--text-muted)' }}>· {cut.time}</span>}
          </span>
          <span className={styles.rowStatus} style={{ background: `${CUT_STATUS_COLOR[cut.status]}18`, color: CUT_STATUS_COLOR[cut.status], display: 'flex', alignItems: 'center', gap: 4 }}>
            {CUT_STATUS_ICON[cut.status]} {CUT_STATUS_LABEL[cut.status]}
          </span>
          {cutHasDetails && (
            <span className={`${styles.rowChevron} ${cutOpen ? styles.rowChevronOpen : ''}`}>
              <ChevronDown size={16} />
            </span>
          )}
        </div>
        {cutOpen && (
          <div className={styles.rowDetails}>
            {cut.notes && <div className={styles.rowNotes}>{cut.notes}</div>}
            {cut.linkProducao && (
              <div className={styles.rowLinkItem}>
                <div className={styles.rowLinkLabel}>Link de Produção</div>
                <a href={cut.linkProducao} target="_blank" rel="noopener noreferrer" className={styles.rowLinkUrl} onClick={e => e.stopPropagation()}>
                  <ExternalLink size={11} />{cut.linkProducao}
                </a>
              </div>
            )}
            {cutPubLinks.length > 0 && (
              <div className={styles.rowPubLinks}>
                <div className={styles.rowPubLinksLabel}>Links publicados</div>
                {cutPubLinks.map((pl, i) => (
                  <div key={i} className={styles.rowPubLinkRow}>
                    {pl.channel && <span className={styles.rowPubChannel}>{pl.channel}</span>}
                    {pl.url && <a href={pl.url} target="_blank" rel="noopener noreferrer" className={styles.rowPubUrl} onClick={e => e.stopPropagation()}>{pl.url}</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Geração do PDF ────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!selectedName) return;

    const fmtDate = (d: Date) => format(d, "dd 'de' MMM 'de' yyyy", { locale: ptBR });

    const epStatusBg: Record<string, string> = {
      gravado: '#f3e8ff', agendado: '#fef3c7', editando: '#dbeafe', publicado: '#dcfce7',
    };
    const cutStatusBg: Record<string, string> = {
      postado: '#dcfce7', agendado: '#fef3c7', 'em-aprovacao': '#f3e8ff',
      pendente: '#f3f4f6', 'em-edicao': '#dbeafe',
    };

    const linkBlock = (label: string, url?: string) => {
      if (!url) return '';
      return `<div style="margin-top:4px;">
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.3px;">${label}</div>
        <a href="${url}" style="font-size:12px;color:#1d4ed8;">${url}</a>
      </div>`;
    };

    const pubLinksBlock = (links?: { channel: string; url: string }[]) => {
      const valid = (links ?? []).filter(l => l.channel || l.url);
      if (!valid.length) return '';
      return `<div style="margin-top:6px;background:#f0fdf4;border-left:3px solid #86efac;border-radius:4px;padding:6px 10px;">
        <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px;">Links publicados</div>
        ${valid.map(l => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
          ${l.channel ? `<span style="font-size:11px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:20px;">${l.channel}</span>` : ''}
          ${l.url ? `<a href="${l.url}" style="font-size:12px;color:#1d4ed8;">${l.url}</a>` : ''}
        </div>`).join('')}
      </div>`;
    };

    const generateEpPdfRow = (ep: EpisodeRecord, pubDate: Date | undefined) => {
      const dateStr = pubDate ? fmtDate(pubDate) : 'Sem data';
      const bg = epStatusBg[ep.status] ?? '#f3f4f6';
      const color = EP_STATUS_COLOR[ep.status] ?? '#374151';
      const hasDetails = ep.notes || ep.linkVideo || ep.linkCarrossel || ep.linkThumbnail || (ep.publishedLinks ?? []).length > 0;
      return `
        <tr style="background:#f0fdf4;border-bottom:1px solid #d1fae5;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td colspan="4" style="padding:0;">
            <div style="display:flex;align-items:flex-start;padding:28px 40px;gap:28px;">
              <span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;font-size:10px;font-weight:800;letter-spacing:1px;padding:5px 14px;border-radius:20px;flex-shrink:0;">EP</span>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:16px;color:#111827;line-height:1.5;">${ep.name}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:6px;">${ep.company}${ep.guest ? ' · ' + ep.guest : ''}</div>
                  </div>
                  <div style="font-size:13px;font-weight:600;color:#374151;white-space:nowrap;">${dateStr}</div>
                  <span style="background:${bg};color:${color};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;">${EP_STATUS_LABEL[ep.status]}</span>
                </div>
                ${hasDetails ? `<div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
                  ${ep.notes ? `<div style="font-size:12px;color:#6b7280;background:#fff;border-left:4px solid #d1d5db;border-radius:4px;padding:8px 16px;line-height:1.6;">${ep.notes}</div>` : ''}
                  ${linkBlock('Vídeo EP Longo (Google Drive)', ep.linkVideo)}
                  ${linkBlock('Carrossel', ep.linkCarrossel)}
                  ${linkBlock('Thumbnails / Capas', ep.linkThumbnail)}
                  ${pubLinksBlock(ep.publishedLinks)}
                </div>` : ''}
              </div>
            </div>
          </td>
        </tr>`;
    };

    const generateCutPdfRow = (cut: AgroEvent) => {
      const bg = cutStatusBg[cut.status] ?? '#f3f4f6';
      const color = CUT_STATUS_COLOR[cut.status] ?? '#374151';
      const dateStr = fmtDate(cut.date) + (cut.time ? ' · ' + cut.time : '');
      const hasDetails = cut.notes || cut.linkProducao || (cut.publishedLinks ?? []).length > 0;
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td colspan="4" style="padding:0;">
            <div style="display:flex;align-items:flex-start;padding:24px 40px;gap:28px;">
              <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:10px;font-weight:800;letter-spacing:1px;padding:5px 14px;border-radius:20px;flex-shrink:0;">#${cut.cutNumber}</span>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:16px;color:#111827;line-height:1.5;">${cut.title}</div>
                    ${cut.platforms ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${cut.platforms}</div>` : ''}
                  </div>
                  <div style="font-size:13px;font-weight:600;color:#374151;white-space:nowrap;">${dateStr}</div>
                  <span style="background:${bg};color:${color};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;">${CUT_STATUS_LABEL[cut.status]}</span>
                </div>
                ${hasDetails ? `<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
                  ${cut.notes ? `<div style="font-size:12px;color:#6b7280;background:#f9fafb;border-left:4px solid #e5e7eb;border-radius:4px;padding:8px 16px;line-height:1.6;">${cut.notes}</div>` : ''}
                  ${linkBlock('Link de Produção', cut.linkProducao)}
                  ${pubLinksBlock(cut.publishedLinks)}
                </div>` : ''}
              </div>
            </div>
          </td>
        </tr>`;
    };

    const statsBarHtml = (p: number, s: number, pend: number) => `
      <div style="display:flex;gap:24px;padding:14px 32px;background:#f9fafb;border-bottom:1px solid #e5e7eb;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <span style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">
          <span style="width:9px;height:9px;border-radius:50%;background:#22c55e;display:inline-block;"></span>
          ${p} postado${p !== 1 ? 's' : ''}
        </span>
        <span style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">
          <span style="width:9px;height:9px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
          ${s} agendado${s !== 1 ? 's' : ''}
        </span>
        <span style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">
          <span style="width:9px;height:9px;border-radius:50%;background:#9ca3af;display:inline-block;"></span>
          ${pend} pendente${pend !== 1 ? 's' : ''}
        </span>
      </div>`;

    const footerHtml = `
      <div style="padding:16px 32px;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;margin-top:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>Gerado em ${today} · AgroIdeas Calendário Editorial</span>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:10px;color:#6b7280;border-right:1px solid #e5e7eb;padding-right:12px;">Siga o podcast</span>
          ${socialLinksHtml(16)}
        </div>
      </div>`;

    const pageStyle = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111827; }
        @page { margin: 18mm 14mm; }
        table { width: 100%; border-collapse: collapse; }
        tr { page-break-inside: avoid; }
      </style>`;

    if (isAll) {
      const groupRows = allGroups.map(group => {
        const groupHeader = `
          <tr style="background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
            <td colspan="4" style="padding:16px 40px;border-top:2px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
              <div style="font-size:13px;font-weight:800;color:#1a3a2e;text-transform:uppercase;letter-spacing:0.5px;">
                ${group.ep?.episodeNumber != null ? `EP ${group.ep.episodeNumber} — ` : ''}${group.name}
                ${group.ep?.company ? `<span style="color:#64748b;font-weight:400;margin-left:12px;font-size:12px;text-transform:none;">${group.ep.company}</span>` : ''}
              </div>
            </td>
          </tr>`;
        const epRow = group.ep ? generateEpPdfRow(group.ep, group.ep.publishDate) : '';
        const cutRows = group.cuts.map(generateCutPdfRow).join('');
        return groupHeader + epRow + cutRows;
      }).join('');

      const allPosted = allGroups.flatMap(g => g.cuts).filter(c => c.status === 'postado').length;
      const allScheduled = allGroups.flatMap(g => g.cuts).filter(c => c.status === 'agendado').length;
      const allPending = allGroups.flatMap(g => g.cuts).filter(c => c.status === 'pendente').length;

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Calendário Completo — AgroIdeas</title>${pageStyle}</head>
<body>
  <div style="background:#1a3a2e;color:white;padding:28px 32px 22px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:0.6;margin-bottom:10px;">AgroIdeas · Calendário Editorial</div>
    <div style="font-size:22px;font-weight:800;margin-bottom:14px;">Calendário de Conteúdo Completo</div>
    <div style="font-size:13px;opacity:0.8;display:flex;flex-wrap:wrap;gap:14px;">
      <span>📅 ${allGroups.length} episódio${allGroups.length !== 1 ? 's' : ''}</span>
      <span>✂️ ${totalCuts} recorte${totalCuts !== 1 ? 's' : ''}</span>
    </div>
  </div>
  ${statsBarHtml(allPosted, allScheduled, allPending)}
  <table><tbody>${groupRows}</tbody></table>
  ${footerHtml}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      return;
    }

    // ── Single episode PDF ────────────────────────────────────────────────────

    const timelineRows = timeline.map(item =>
      item.kind === 'episode'
        ? generateEpPdfRow(item.ep, epPublishDate)
        : generateCutPdfRow(item.cut)
    ).join('');

    const metaItems = [
      headerCompany ? `<span>🏢 ${headerCompany}</span>` : '',
      headerGuest   ? `<span>👤 ${headerGuest}</span>` : '',
      headerRecordingDate ? `<span>🎙️ Gravação: ${fmtDate(headerRecordingDate)}</span>` : '',
      epPublishDate       ? `<span>📅 Publicação: ${fmtDate(epPublishDate)}</span>` : '',
      `<span>✂️ ${totalCuts} recorte${totalCuts !== 1 ? 's' : ''}</span>`,
    ].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>${selectedName} — Calendário Editorial</title>${pageStyle}</head>
<body>
  <div style="background:#1a3a2e;color:white;padding:28px 32px 22px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:0.6;margin-bottom:10px;">AgroIdeas · Calendário Editorial</div>
    <div style="font-size:22px;font-weight:800;margin-bottom:14px;">
      ${episode?.episodeNumber != null ? 'EP ' + episode.episodeNumber + ' — ' : ''}${selectedName}
    </div>
    <div style="font-size:13px;opacity:0.8;display:flex;flex-wrap:wrap;gap:14px;">${metaItems}</div>
  </div>
  ${statsBarHtml(posted, scheduled, pending)}
  <table><tbody>${timelineRows}</tbody></table>
  ${footerHtml}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  // ── Renderização ──────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h2>Exportar Calendário de Conteúdo</h2>
          <p>Escolha entre exportar um episódio específico ou o planejamento completo de todos os conteúdos.</p>
        </div>
      </header>

      {/* ── Seletor de Modo ────────────────────────────────────────────── */}
      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeBtn} ${!isAll ? styles.modeBtnActive : ''}`}
          onClick={() => { setSelectedName(''); setExpanded(new Set()); }}
        >
          <User size={16} /> Episódio Individual
        </button>
        <button
          className={`${styles.modeBtn} ${isAll ? styles.modeBtnActive : ''}`}
          onClick={() => { setSelectedName('__ALL__'); setExpanded(new Set()); }}
        >
          <FileText size={16} /> Calendário Completo
        </button>
      </div>

      {/* ── Filtros e Ações ────────────────────────────────────────────── */}
      {!isAll && (
        <div className={styles.filters}>
          <span className={styles.filterLabel}>Selecionar Episódio</span>
          <select
            className={styles.filterSelect}
            value={selectedName}
            onChange={e => { setSelectedName(e.target.value); setExpanded(new Set()); }}
          >
            <option value="">— Selecione um episódio —</option>
            {sortedEpisodes.length > 0 && (
              <optgroup label="Episódios cadastrados">
                {sortedEpisodes.map(ep => (
                  <option key={ep.id} value={ep.name}>
                    {ep.episodeNumber != null ? `EP ${ep.episodeNumber} — ` : ''}{ep.name}
                    {ep.company ? ` · ${ep.company}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {cutsOnlyNames.length > 0 && (
              <optgroup label="Só com cortes (sem cadastro de EP)">
                {cutsOnlyNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
            )}
          </select>

          <div className={styles.actionGroup}>
            <button
              className={styles.shareBtn}
              onClick={handleCopyLink}
              disabled={!canExport}
              title="Copiar link compartilhável"
            >
              {copied ? <><Check size={15} /> Link copiado!</> : <><Link2 size={15} /> Copiar link</>}
            </button>
            <button
              className={styles.exportBtn}
              onClick={handlePrint}
              disabled={!canExport}
            >
              <FileDown size={16} /> Exportar PDF
            </button>
          </div>
        </div>
      )}

      {isAll && (
        <div className={styles.fullExportActions}>
          <div className={styles.fullExportInfo}>
            <FileText size={20} color="var(--primary)" />
            <div>
              <strong>Modo: Calendário Completo</strong>
              <span>Exportação de todos os {allGroups.length} episódios e {totalCuts} recortes.</span>
            </div>
          </div>
          <button className={styles.exportBtn} onClick={handlePrint}>
            <FileDown size={16} /> Exportar PDF Completo
          </button>
        </div>
      )}

      {/* ── Estado vazio ────────────────────────────────────────────────── */}
      {!selectedName && (
        <div className={styles.empty}>
          <FileText size={48} strokeWidth={1.2} />
          <p>Selecione um episódio acima para visualizar<br />e exportar seu calendário completo.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PREVIEW
          ══════════════════════════════════════════════════════════════════ */}
      {selectedName && (
        <div className={styles.preview}>
          {isAll ? (
            <>
              {/* ── Cabeçalho (calendário completo) ──────────────────── */}
              <div className={`${styles.previewHeader} ${styles.printHeader}`}>
                <div className={styles.previewLogo}>AgroIdeas · Calendário Editorial</div>
                <div className={styles.previewTitle}>Calendário de Conteúdo Completo</div>
                <div className={styles.previewMeta}>
                  <span className={styles.previewMetaItem}>
                    <FileText size={14} />
                    {allGroups.length} episódio{allGroups.length !== 1 ? 's' : ''}
                  </span>
                  <span className={styles.previewMetaItem}>
                    <Scissors size={14} />
                    {totalCuts} recorte{totalCuts !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* ── Grupos ───────────────────────────────────────────── */}
              {allGroups.length === 0 && (
                <div style={{ padding: '32px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                  Nenhum conteúdo cadastrado.
                </div>
              )}

              {allGroups.map(group => (
                <React.Fragment key={group.name}>
                  <div className={styles.groupDivider}>
                    {group.ep?.episodeNumber != null ? `EP ${group.ep.episodeNumber} — ` : ''}
                    {group.name}
                    {group.ep?.company && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                        {group.ep.company}
                      </span>
                    )}
                  </div>
                  {group.ep && renderEpRow(group.ep, group.ep.publishDate, 'all')}
                  {group.cuts.map(cut => renderCutRow(cut, 'all'))}
                </React.Fragment>
              ))}
            </>
          ) : (
            <>
              {/* ── Cabeçalho (episódio único) ────────────────────────── */}
              <div className={`${styles.previewHeader} ${styles.printHeader}`}>
                <div className={styles.previewLogo}>AgroIdeas · Calendário Editorial</div>
                <div className={styles.previewTitle}>
                  {episode?.episodeNumber != null ? `EP ${episode.episodeNumber} — ` : ''}{selectedName}
                </div>
                <div className={styles.previewMeta}>
                  {headerCompany && (
                    <span className={styles.previewMetaItem}><Building2 size={14} />{headerCompany}</span>
                  )}
                  {headerGuest && (
                    <span className={styles.previewMetaItem}><User size={14} />{headerGuest}</span>
                  )}
                  {headerRecordingDate && (
                    <span className={styles.previewMetaItem}>
                      <Mic size={14} />Gravação: {format(headerRecordingDate, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  {epPublishDate && (
                    <span className={styles.previewMetaItem}>
                      <Calendar size={14} />Publicação do EP: {format(epPublishDate, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  <span className={styles.previewMetaItem}>
                    <Scissors size={14} />{totalCuts} recorte{totalCuts !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {timeline.length === 0 && (
                <div style={{ padding: '32px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                  Nenhum conteúdo encontrado para este episódio.
                </div>
              )}

              {timeline.map((item, idx) =>
                item.kind === 'episode'
                  ? renderEpRow(item.ep, epPublishDate, `single-${idx}`)
                  : renderCutRow(item.cut, 'single')
              )}
            </>
          )}

          {/* ── Rodapé stats + redes sociais ─────────────────────────── */}
          {(totalCuts > 0 || isAll) && (
            <div className={styles.stats}>
              <div className={styles.statsLeft}>
                <span className={styles.statItem}>
                  <span className={styles.statDot} style={{ background: '#22c55e' }} />
                  {posted} postado{posted !== 1 ? 's' : ''}
                </span>
                <span className={styles.statItem}>
                  <span className={styles.statDot} style={{ background: '#f59e0b' }} />
                  {scheduled} agendado{scheduled !== 1 ? 's' : ''}
                </span>
                <span className={styles.statItem}>
                  <span className={styles.statDot} style={{ background: '#9ca3af' }} />
                  {pending} pendente{pending !== 1 ? 's' : ''}
                </span>
                <span className={styles.statItem} style={{ color: '#9ca3af', fontSize: 11 }}>
                  · Gerado em {today}
                </span>
              </div>
              <div className={styles.socialBar}>
                <span className={styles.socialBarLabel}>Siga o podcast</span>
                <SocialLinksBar size={20} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportView;
