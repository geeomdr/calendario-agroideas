import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, Loader2, AlertCircle, RotateCcw, Sparkles, History, Search, ChevronLeft, Trash2 } from 'lucide-react';
import { analyzeTranscription, extractTextFromFile } from '../../lib/claudeAnalyzer';
import { supabase } from '../../lib/supabase';
import styles from './AnalisadorView.module.css';

type Stage = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error';
type Tab = 'nova' | 'historico';

interface AnaliseRecord {
  id: string;
  episode_name: string | null;
  result: string;
  created_at: string;
}

// --- Result renderer ---

const FIELD_LABELS: Record<string, string> = {
  'Pauta principal': 'Pauta',
  'Tema editorial': 'Tema',
  'Tese central': 'Tese',
  'Trecho exato da transcrição': 'Trecho',
  'Início exato do corte': 'Início',
  'Fim exato do corte': 'Fim',
  'Duração estimada': 'Duração',
  'Quem fala': 'Quem fala',
  'Por que esse trecho é forte': 'Por que é forte',
  'Por que esse trecho NÃO é apenas uma fala genérica': 'Diferencial',
  'Potencial de atenção': 'Atenção',
  'Potencial de autoridade': 'Autoridade',
  'Potencial de compartilhamento': 'Compartilhamento',
  'Potencial de conversão': 'Conversão',
  'Gancho sugerido': 'Gancho',
  'Headline sugerida': 'Headline',
  'Tema que vamos abordar com esse recorte': 'Tema do recorte',
  'Observações de edição': 'Obs. de edição',
};

const RATING_FIELDS = ['Potencial de atenção', 'Potencial de autoridade', 'Potencial de compartilhamento', 'Potencial de conversão'];
const HIGHLIGHT_FIELDS = ['Trecho exato da transcrição', 'Tese central', 'Gancho sugerido', 'Headline sugerida'];

function parseField(line: string): { key: string; value: string } | null {
  const match = line.match(/^-\s+(.+?):\s*(.*)/);
  if (!match) return null;
  return { key: match[1].trim(), value: match[2].trim() };
}

function RecorteCard({ block, index }: { block: string; index: number }) {
  const lines = block.split('\n').filter(l => l.trim());
  const fields: { key: string; value: string }[] = [];

  for (const line of lines) {
    const parsed = parseField(line);
    if (parsed) fields.push(parsed);
  }

  const duration = fields.find(f => f.key === 'Duração estimada')?.value ?? '';

  return (
    <div className={styles.recorteCard}>
      <div className={styles.recorteCardHeader}>
        <span className={styles.recorteNum}>#{index}</span>
        <span className={styles.recorteLabel}>Recorte</span>
        {duration && <span className={styles.durationBadge}>⏱ {duration}</span>}
      </div>
      <div className={styles.recorteFields}>
        {fields.map((f, i) => {
          const label = FIELD_LABELS[f.key] ?? f.key;
          const isRating = RATING_FIELDS.some(r => f.key.startsWith(r.split(' ')[0]) && f.key.includes('Potencial'));
          const isHighlight = HIGHLIGHT_FIELDS.includes(f.key);
          return (
            <div key={i} className={`${styles.recorteField} ${isHighlight ? styles.fieldHighlight : ''}`}>
              <span className={styles.fieldKey}>{label}</span>
              <span className={`${styles.fieldValue} ${isRating ? styles.fieldRating : ''}`}>{f.value || '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultRenderer({ text }: { text: string }) {
  const blocks = text.split(/(?=##\s)/);

  return (
    <div className={styles.renderedResult}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (/^##\s+PARTE\s+\d+/i.test(trimmed)) {
          const title = trimmed.replace(/^##\s+/, '').split('\n')[0];
          return <div key={i} className={styles.parteDivider}><span>{title}</span></div>;
        }

        const recorteMatch = trimmed.match(/^##\s+RECORTE\s+(\d+)/i);
        if (recorteMatch) {
          const body = trimmed.split('\n').slice(1).join('\n');
          return <RecorteCard key={i} block={body} index={parseInt(recorteMatch[1])} />;
        }

        const lines = trimmed.split('\n');
        const title = lines[0].replace(/^#+\s*/, '');
        const body = lines.slice(1).join('\n').trim();

        return (
          <div key={i} className={styles.genericSection}>
            {title && <h3 className={styles.sectionTitle}>{title}</h3>}
            {body && <p className={styles.sectionBody}>{body}</p>}
          </div>
        );
      })}
    </div>
  );
}

// --- Histórico ---

function HistoricoView() {
  const [analises, setAnalises] = useState<AnaliseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AnaliseRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalises();
  }, []);

  async function fetchAnalises() {
    setLoading(true);
    const { data } = await supabase
      .from('analises')
      .select('id, episode_name, result, created_at')
      .order('created_at', { ascending: false });
    setAnalises(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('analises').delete().eq('id', id);
    setAnalises(prev => prev.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
  }

  const filtered = analises.filter(a =>
    (a.episode_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    a.result.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className={styles.historicoDetail}>
        <div className={styles.historicoDetailHeader}>
          <button className={styles.backBtn} onClick={() => setSelected(null)}>
            <ChevronLeft size={16} /> Voltar
          </button>
          <span className={styles.historicoDetailTitle}>
            {selected.episode_name || 'Sem nome'}
          </span>
          <span className={styles.historicoDate}>
            {new Date(selected.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className={styles.historicoDetailContent}>
          <ResultRenderer text={selected.result} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.historicoArea}>
      <div className={styles.historicoSearch}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscar por nome do episódio ou conteúdo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.historicoLoading}><Loader2 size={20} className={styles.spin} /> Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.historicoEmpty}>
          {search ? 'Nenhum resultado encontrado.' : 'Nenhuma análise salva ainda.'}
        </div>
      ) : (
        <div className={styles.historicoList}>
          {filtered.map(a => (
            <div key={a.id} className={styles.historicoItem} onClick={() => setSelected(a)}>
              <div className={styles.historicoItemInfo}>
                <span className={styles.historicoItemName}>{a.episode_name || <em>Sem nome</em>}</span>
                <span className={styles.historicoItemDate}>
                  {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                disabled={deleting === a.id}
                title="Excluir análise"
              >
                {deleting === a.id ? <Loader2 size={14} className={styles.spin} /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Componente principal ---

const AnalisadorView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('nova');
  const [stage, setStage] = useState<Stage>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [episodeName, setEpisodeName] = useState('');
  const [numRecortes, setNumRecortes] = useState(10);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const resultAccRef = useRef('');

  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'text/plain'];
    const isAllowed = allowed.includes(f.type) || f.name.endsWith('.pdf') || f.name.endsWith('.txt');
    if (!isAllowed) {
      setError('Formato não suportado. Envie um arquivo PDF ou TXT.');
      return;
    }
    setFile(f);
    setError('');
    setResult('');
    setStage('idle');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const handleAnalyze = async () => {
    if (!file) return;

    setStage('extracting');
    setResult('');
    setError('');
    resultAccRef.current = '';

    try {
      const text = await extractTextFromFile(file);

      if (text.trim().length < 200) {
        throw new Error('O arquivo parece vazio ou não contém texto suficiente para análise.');
      }

      setStage('analyzing');

      await analyzeTranscription(text, episodeName, (chunk) => {
        resultAccRef.current += chunk;
        setResult(prev => {
          const next = prev + chunk;
          setTimeout(() => {
            resultRef.current?.scrollTo({ top: resultRef.current.scrollHeight, behavior: 'smooth' });
          }, 0);
          return next;
        });
      }, numRecortes);

      // Salva no Supabase
      await supabase.from('analises').insert({
        episode_name: episodeName.trim() || null,
        result: resultAccRef.current,
      });

      setStage('done');
    } catch (err: any) {
      setError(err.message || 'Erro inesperado. Tente novamente.');
      setStage('error');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setFile(null);
    setEpisodeName('');
    setResult('');
    setError('');
    resultAccRef.current = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = stage === 'extracting' || stage === 'analyzing';

  const stageLabel = {
    extracting: 'Lendo o arquivo...',
    analyzing: 'IA analisando a transcrição...',
    done: 'Análise concluída',
    error: 'Erro na análise',
    idle: '',
  }[stage];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className={styles.title}>Analisador de Transcrições</h1>
          <p className={styles.subtitle}>Faça upload da transcrição do episódio e receba o relatório editorial completo com os melhores recortes.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'nova' ? styles.tabActive : ''}`}
          onClick={() => setTab('nova')}
        >
          <Sparkles size={15} /> Nova Análise
        </button>
        <button
          className={`${styles.tab} ${tab === 'historico' ? styles.tabActive : ''}`}
          onClick={() => setTab('historico')}
        >
          <History size={15} /> Histórico
        </button>
      </div>

      {tab === 'historico' ? (
        <HistoricoView />
      ) : (
        <>
          <div className={styles.formArea}>
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${file ? styles.hasFile : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                disabled={isLoading}
              />
              {file ? (
                <div className={styles.fileInfo}>
                  <FileText size={28} color="var(--primary)" />
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</span>
                </div>
              ) : (
                <div className={styles.uploadHint}>
                  <Upload size={32} color="var(--text-muted)" />
                  <span className={styles.uploadTitle}>Arraste o arquivo aqui ou clique para selecionar</span>
                  <span className={styles.uploadSub}>PDF ou TXT — transcrição do episódio</span>
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Nome do episódio <span className={styles.optional}>(opcional)</span></label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Ex: EP. #52 — João Silva sobre crédito rural"
                  value={episodeName}
                  onChange={e => setEpisodeName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className={styles.field} style={{ width: 140 }}>
                <label className={styles.label}>Nº de recortes</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={30}
                  value={numRecortes}
                  onChange={e => setNumRecortes(Math.max(1, Math.min(30, Number(e.target.value))))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.analyzeBtn}
                onClick={handleAnalyze}
                disabled={!file || isLoading}
              >
                {isLoading ? (
                  <><Loader2 size={18} className={styles.spin} /> {stageLabel}</>
                ) : (
                  <><Sparkles size={18} /> Analisar Transcrição</>
                )}
              </button>

              {(file || result) && !isLoading && (
                <button className={styles.resetBtn} onClick={handleReset}>
                  <RotateCcw size={16} /> Nova análise
                </button>
              )}
            </div>

            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {result && (
            <div className={styles.resultArea}>
              <div className={styles.resultHeader}>
                <span className={styles.resultTitle}>Relatório Editorial</span>
                {stage === 'done' && <span className={styles.doneBadge}>Salvo ✓</span>}
                {stage === 'analyzing' && <span className={styles.analyzingBadge}><Loader2 size={12} className={styles.spin} /> Gerando...</span>}
              </div>
              <div ref={resultRef} className={styles.resultContent}>
                <ResultRenderer text={result} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalisadorView;
