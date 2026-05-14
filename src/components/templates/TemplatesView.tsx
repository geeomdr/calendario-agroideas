import React, { useState } from 'react';
import { Trash2, ExternalLink, Search } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { PLATFORM_COLOR } from '../calendar/platformOptions';
import styles from './TemplatesView.module.css';
import type { ContentTemplate } from '../../types';
import TemplateModal from './TemplateModal';

const PIECE_TYPE_COLOR: Record<string, string> = {
  'Thumbnail': '#7c3aed',
  'Capa de Carrossel': '#db2777',
  'Post Feed': '#0891b2',
  'Story': '#d97706',
  'Reels': '#dc2626',
  'Shorts': '#ea580c',
  'Vídeo': '#16a34a',
  'Arte Gráfica': '#6d28d9',
  'Outro': '#6b7280',
};

const TemplatesView: React.FC = () => {
  const { templates, deleteTemplate } = useTemplates();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterPieceType, setFilterPieceType] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const channels = [...new Set(templates.map(t => t.channel))].sort();
  const pieceTypes = [...new Set(templates.map(t => t.pieceType))].sort();

  const filtered = templates.filter(t => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.partnerCompany || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchChannel = !filterChannel || t.channel === filterChannel;
    const matchPiece = !filterPieceType || t.pieceType === filterPieceType;
    return matchSearch && matchChannel && matchPiece;
  });

  const handleEdit = (t: ContentTemplate) => {
    setSelectedTemplate(t);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedTemplate(undefined);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const channelColor = (channel: string) => PLATFORM_COLOR[channel] || '#6b7280';
  const pieceColor = (pieceType: string) => PIECE_TYPE_COLOR[pieceType] || '#6b7280';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Templates de Criação</h1>
          <p>Centralize os links de templates editáveis por canal e tipo de peça.</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.searchBar}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={filterChannel}
            onChange={e => setFilterChannel(e.target.value)}
          >
            <option value="">Todos os canais</option>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className={styles.filterSelect}
            value={filterPieceType}
            onChange={e => setFilterPieceType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {pieceTypes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className={styles.addButton} onClick={handleAdd}>
            + Novo Template
          </button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {templates.length === 0 ? (
            <>
              <div className={styles.emptyIcon}>🎨</div>
              <h3>Nenhum template cadastrado ainda</h3>
              <p>Cadastre templates editáveis para thumbnails, posts, stories e mais.</p>
              <button className={styles.addButton} onClick={handleAdd}>+ Cadastrar primeiro template</button>
            </>
          ) : (
            <p>Nenhum template encontrado com os filtros selecionados.</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(t => (
            <div key={t.id} className={styles.card} onClick={() => handleEdit(t)}>
              <div className={styles.cardHeader}>
                <div className={styles.badges}>
                  <span
                    className={styles.channelBadge}
                    style={{ backgroundColor: `${channelColor(t.channel)}18`, color: channelColor(t.channel), borderColor: `${channelColor(t.channel)}40` }}
                  >
                    {t.channel}
                  </span>
                  <span
                    className={styles.pieceBadge}
                    style={{ backgroundColor: `${pieceColor(t.pieceType)}18`, color: pieceColor(t.pieceType), borderColor: `${pieceColor(t.pieceType)}40` }}
                  >
                    {t.pieceType}
                  </span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={e => handleDeleteClick(e, t.id)}
                  title="Excluir template"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 className={styles.templateName}>{t.name}</h3>

              {t.partnerCompany && (
                <div className={styles.companyTag}>
                  <span>{t.partnerCompany}</span>
                </div>
              )}

              {t.notes && <p className={styles.notes}>{t.notes}</p>}

              <a
                href={t.editableLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openLink}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={15} />
                Abrir Template
              </a>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h3>Excluir template?</h3>
            <p>Esta ação não pode ser desfeita.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelConfirm} onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
              <button
                className={styles.confirmDelete}
                onClick={() => { deleteTemplate(confirmDeleteId); setConfirmDeleteId(null); }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        template={selectedTemplate}
      />
    </div>
  );
};

export default TemplatesView;
