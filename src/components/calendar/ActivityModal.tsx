import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, Link2, CheckCircle2, Plus } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import type { Status, AgroEvent } from '../../types';
import CompanyModal from '../companies/CompanyModal';
import styles from './ActivityModal.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { PLATFORMS, PLATFORM_COLOR } from './platformOptions';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEpisode?: string;
  defaultCompanyId?: string;
}

const REQUIRED_COLS = ['title', 'date', 'episode', 'company'];

const ActivityModal: React.FC<ActivityModalProps> = ({ isOpen, onClose, defaultEpisode, defaultCompanyId }) => {
  const { addEvent, addEvents, companies } = useEvents();
  const [tab, setTab] = useState<'manual' | 'import'>('manual');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Manual form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [episode, setEpisode] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [company, setCompany] = useState('');

  // Pre-fill when modal opens with context (e.g. from episode edit form)
  React.useEffect(() => {
    if (!isOpen) return;
    if (defaultEpisode) setEpisode(defaultEpisode);
    if (defaultCompanyId) {
      setCompanyId(defaultCompanyId);
      const comp = companies.find(c => c.id === defaultCompanyId);
      if (comp) setCompany(comp.name);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cutNumber, setCutNumber] = useState('1');
  const [status, setStatus] = useState<Status>('em-aprovacao');
  const [time, setTime] = useState('');
  const [platforms, setPlatforms] = useState('Reels+Shorts+TT');
  const [notes, setNotes] = useState('');
  const [linkProducao, setLinkProducao] = useState('');
  const [pubLinks, setPubLinks] = useState<{ channel: string; url: string }[]>([]);

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<Omit<AgroEvent, 'id'>[]>([]);
  const [importError, setImportError] = useState('');
  const [fileName, setFileName] = useState('');

  const resetManual = () => { setTitle(''); setDate(''); setTime(''); setEpisode(''); setCompanyId(''); setCompany(''); setCutNumber('1'); setStatus('em-aprovacao'); setPlatforms('Reels+Shorts+TT'); setNotes(''); setLinkProducao(''); setPubLinks([]); };

  const addPubLink = () => setPubLinks(prev => [...prev, { channel: '', url: '' }]);
  const removePubLink = (idx: number) => setPubLinks(prev => prev.filter((_, i) => i !== idx));
  const changePubLink = (idx: number, field: 'channel' | 'url', value: string) =>
    setPubLinks(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  const resetImport = () => { setImportRows([]); setImportError(''); setFileName(''); };

  const handleClose = () => { resetManual(); resetImport(); setTab('manual'); onClose(); };

  const handleManualSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    addEvent({ title, date: new Date(date + 'T12:00:00'), time: time || undefined, status, episode, company, companyId, cutNumber: parseInt(cutNumber), platforms: platforms || undefined, notes: notes || undefined, linkProducao: linkProducao.trim() || undefined, publishedLinks: pubLinks.filter(p => p.channel || p.url) });
    resetManual();
    handleClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportError('');
    setImportRows([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (rows.length === 0) { setImportError('Planilha vazia.'); return; }

        const missing = REQUIRED_COLS.filter(col => !(col in rows[0]));
        if (missing.length > 0) {
          setImportError(`Colunas obrigatórias ausentes: ${missing.join(', ')}\n\nColunas encontradas: ${Object.keys(rows[0]).join(', ')}`);
          return;
        }

        const validStatuses: Status[] = ['postado', 'agendado', 'em-aprovacao', 'pendente', 'em-edicao'];
        const parsed: Omit<AgroEvent, 'id'>[] = rows.map((row, i) => {
          const rawDate = row.date;
          let parsedDate: Date;
          // Try Excel serial number first
          const serial = parseFloat(rawDate);
          if (!isNaN(serial) && serial > 1000) {
            parsedDate = XLSX.SSF.parse_date_code(serial) ? new Date((serial - 25569) * 86400 * 1000) : new Date(rawDate);
          } else {
            parsedDate = new Date(rawDate + (rawDate.includes('T') ? '' : 'T12:00:00'));
          }
          if (isNaN(parsedDate.getTime())) throw new Error(`Linha ${i + 2}: data inválida "${rawDate}"`);

          const rowStatus = (row.status || 'em-aprovacao').toLowerCase().replace(' ', '-') as Status;
          const compName = row.company || '';
          const matchingComp = companies.find(c => c.name.toLowerCase() === compName.toLowerCase() || c.id.toLowerCase() === compName.toLowerCase());

          return {
            title: row.title || `Corte ${i + 1}`,
            date: parsedDate,
            status: validStatuses.includes(rowStatus) ? rowStatus : 'em-aprovacao',
            episode: row.episode || '',
            company: matchingComp ? matchingComp.name : compName,
            companyId: matchingComp ? matchingComp.id : undefined,
            cutNumber: parseInt(row.cutNumber) || i + 1,
            platforms: row.platforms || undefined,
            notes: row.notes || undefined,
          };
        });

        setImportRows(parsed);
      } catch (err) {
        setImportError(String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportConfirm = () => {
    addEvents(importRows);
    resetImport();
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={styles.modal}
          >
            <div className={styles.header}>
              <h2>Novo Corte</h2>
              <button onClick={handleClose} className={styles.closeBtn}><X size={24} /></button>
            </div>

            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === 'manual' ? styles.tabActive : ''}`} onClick={() => setTab('manual')}>Cadastro Manual</button>
              <button className={`${styles.tab} ${tab === 'import' ? styles.tabActive : ''}`} onClick={() => setTab('import')}><Upload size={14} /> Importar Planilha</button>
            </div>

            {tab === 'manual' ? (
              <form onSubmit={handleManualSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <label>Empresa Parceira</label>
                    <select required value={companyId} onChange={e => {
                      const compId = e.target.value;
                      if (compId === 'CREATE_NEW') {
                        setIsCompanyModalOpen(true);
                        return;
                      }
                      setCompanyId(compId);
                      const comp = companies.find(c => c.id === compId);
                      setCompany(comp?.name || '');
                      setEpisode('');
                    }}>
                      <option value="" disabled>Selecione...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="CREATE_NEW" style={{ fontWeight: 'bold' }}>+ Cadastrar nova empresa...</option>
                    </select>
                  </div>

                <div className={styles.field}>
                  <label>Nome do Episódio</label>
                  <input type="text" value={episode} onChange={e => setEpisode(e.target.value)} placeholder="Ex: AgriLean EP2" required />
                </div>

                <div className={styles.field}>
                  <label>Título do Corte</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: O maior erro do produtor" required />
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Data de Publicação</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className={styles.field}>
                    <label>Horário</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} placeholder="Ex: 09:00" />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Corte #</label>
                    <input type="number" min="1" max="20" value={cutNumber} onChange={e => setCutNumber(e.target.value)} required />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value as Status)}>
                      <option value="em-edicao">Em Edição</option>
                      <option value="em-aprovacao">Em Aprovação</option>
                      <option value="pendente">Pendente</option>
                      <option value="agendado">Agendado</option>
                      <option value="postado">Postado</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Plataformas</label>
                    <select value={platforms} onChange={e => setPlatforms(e.target.value)}>
                      <option value="Reels+Shorts+TT">Reels + Shorts + TT</option>
                      <option value="Reels+TT">Reels + TikTok</option>
                      <option value="Shorts+TT">Shorts + TikTok</option>
                      <option value="Reels+Shorts">Reels + Shorts</option>
                      <option value="Apenas Reels">Apenas Reels</option>
                      <option value="Apenas Shorts">Apenas Shorts</option>
                      <option value="Apenas TT">Apenas TikTok</option>
                      <option value="Longo YT">Formato Longo (YT)</option>
                      <option value="Spotify+Áudio">Spotify / Áudio</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Observações</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
                </div>

                {/* Link de Produção */}
                <div className={styles.field}>
                  <label><Link2 size={11} style={{ display: 'inline', marginRight: 4 }} />Link de Produção</label>
                  <input
                    type="text"
                    value={linkProducao}
                    onChange={e => setLinkProducao(e.target.value)}
                    placeholder="Cole o link (Drive, Dropbox...)"
                  />
                </div>

                {/* Links dos conteúdos publicados — só quando postado */}
                {status === 'postado' && (
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

                <div className={styles.footer}>
                  <button type="button" onClick={handleClose} className={styles.cancelBtn}>Cancelar</button>
                  <button type="submit" className={styles.submitBtn}>Criar Corte</button>
                </div>
              </form>
            ) : (
              <div className={styles.form}>
                <div className={styles.importInfo}>
                  <p>A planilha deve ter as colunas (1ª linha como cabeçalho):</p>
                  <code>title · date · episode · company · cutNumber · status · platforms · notes</code>
                  <p className={styles.importHint}>Formato de data: <strong>DD/MM/AAAA</strong> ou <strong>AAAA-MM-DD</strong></p>
                  <p className={styles.importHint}>Status aceitos: <strong>postado · agendado · pendente · em-aprovacao · em-edicao</strong></p>
                </div>

                <div
                  className={styles.dropZone}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileSpreadsheet size={36} strokeWidth={1.2} />
                  {fileName ? <span className={styles.fileName}>{fileName}</span> : <span>Clique para selecionar a planilha (.xlsx, .xls, .csv)</span>}
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
                </div>

                {importError && (
                  <div className={styles.errorBox}>
                    <AlertCircle size={16} />
                    <pre>{importError}</pre>
                  </div>
                )}

                {importRows.length > 0 && (
                  <div className={styles.previewBox}>
                    <strong>{importRows.length} cortes encontrados</strong>
                    <div className={styles.previewList}>
                      {importRows.slice(0, 5).map((r, i) => (
                        <div key={i} className={styles.previewItem}>
                          <span className={styles.previewEp}>{r.episode}</span>
                          <span>{r.title}</span>
                          <span className={styles.previewDate}>{r.date.toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                      {importRows.length > 5 && <p className={styles.previewMore}>+{importRows.length - 5} mais...</p>}
                    </div>
                  </div>
                )}

                <div className={styles.footer}>
                  <button type="button" onClick={handleClose} className={styles.cancelBtn}>Cancelar</button>
                  <button type="button" onClick={handleImportConfirm} disabled={importRows.length === 0} className={styles.submitBtn}>
                    Importar {importRows.length > 0 ? `${importRows.length} cortes` : ''}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      <CompanyModal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} />
    </AnimatePresence>
  );
};

export default ActivityModal;
