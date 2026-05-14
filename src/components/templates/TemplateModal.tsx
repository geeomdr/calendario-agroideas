import React, { useState, useEffect } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import { PLATFORMS } from '../calendar/platformOptions';
import styles from './TemplateModal.module.css';
import type { ContentTemplate } from '../../types';

const PIECE_TYPES = [
  'Thumbnail',
  'Capa de Carrossel',
  'Post Feed',
  'Story',
  'Reels',
  'Shorts',
  'Vídeo',
  'Arte Gráfica',
  'Outro',
];

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContentTemplate;
}

const EMPTY_FORM = {
  name: '',
  channel: '',
  pieceType: '',
  partnerCompany: '',
  editableLink: '',
  notes: '',
};

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, template }) => {
  const { addTemplate, updateTemplate } = useTemplates();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [customChannel, setCustomChannel] = useState('');
  const [customPieceType, setCustomPieceType] = useState('');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        channel: PLATFORMS.includes(template.channel) ? template.channel : '__custom__',
        pieceType: PIECE_TYPES.includes(template.pieceType) ? template.pieceType : '__custom__',
        partnerCompany: template.partnerCompany || '',
        editableLink: template.editableLink,
        notes: template.notes || '',
      });
      if (!PLATFORMS.includes(template.channel)) setCustomChannel(template.channel);
      if (!PIECE_TYPES.includes(template.pieceType)) setCustomPieceType(template.pieceType);
    } else {
      setFormData(EMPTY_FORM);
      setCustomChannel('');
      setCustomPieceType('');
    }
  }, [template, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resolvedChannel = formData.channel === '__custom__' ? customChannel : formData.channel;
  const resolvedPieceType = formData.pieceType === '__custom__' ? customPieceType : formData.pieceType;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !resolvedChannel || !resolvedPieceType || !formData.editableLink) return;

    const payload = {
      name: formData.name,
      channel: resolvedChannel,
      pieceType: resolvedPieceType,
      partnerCompany: formData.partnerCompany || undefined,
      editableLink: formData.editableLink,
      notes: formData.notes || undefined,
    };

    if (template?.id) {
      updateTemplate(template.id, payload);
    } else {
      addTemplate(payload);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <h2 className={styles.title}>{template ? 'Editar Template' : 'Novo Template'}</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Nome do Template *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Thumbnail padrão YouTube"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="channel">Canal *</label>
              <select id="channel" name="channel" required value={formData.channel} onChange={handleChange}>
                <option value="">Selecione o canal</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">Outro (personalizado)</option>
              </select>
              {formData.channel === '__custom__' && (
                <input
                  type="text"
                  placeholder="Nome do canal"
                  value={customChannel}
                  onChange={e => setCustomChannel(e.target.value)}
                  className={styles.customInput}
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pieceType">Tipo de Peça *</label>
              <select id="pieceType" name="pieceType" required value={formData.pieceType} onChange={handleChange}>
                <option value="">Selecione o tipo</option>
                {PIECE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__custom__">Outro (personalizado)</option>
              </select>
              {formData.pieceType === '__custom__' && (
                <input
                  type="text"
                  placeholder="Nome do tipo de peça"
                  value={customPieceType}
                  onChange={e => setCustomPieceType(e.target.value)}
                  className={styles.customInput}
                />
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="partnerCompany">Empresa Parceira <span className={styles.optional}>(opcional)</span></label>
            <input
              type="text"
              id="partnerCompany"
              name="partnerCompany"
              value={formData.partnerCompany}
              onChange={handleChange}
              placeholder="Ex: Pulver Farm"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="editableLink">Link Editável *</label>
            <input
              type="url"
              id="editableLink"
              name="editableLink"
              required
              value={formData.editableLink}
              onChange={handleChange}
              placeholder="https://www.canva.com/... ou drive.google.com/..."
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes">Observações <span className={styles.optional}>(opcional)</span></label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Instruções de uso, dimensões, cores da marca..."
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.saveBtn}>
              {template ? 'Salvar Alterações' : 'Cadastrar Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateModal;
