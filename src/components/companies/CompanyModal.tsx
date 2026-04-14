import React, { useState, useEffect } from 'react';
import { useEvents } from '../../contexts/EventsContext';
import styles from './CompanyModal.module.css';
import type { PartnerCompany } from '../../types';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: PartnerCompany;
}

const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, company }) => {
  const { addCompany, updateCompany } = useEvents();
  const [formData, setFormData] = useState<Partial<PartnerCompany>>({
    name: '',
    category: '',
    email: '',
    phone: '',
    contactName: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    if (company) {
      setFormData(company);
    } else {
      setFormData({
        name: '',
        category: '',
        email: '',
        phone: '',
        contactName: '',
        website: '',
        description: '',
      });
    }
  }, [company, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (company?.id) {
      updateCompany(company.id, formData);
    } else {
      addCompany(formData as Omit<PartnerCompany, 'id'>);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <h2 className={styles.title}>{company ? 'Editar Empresa' : 'Nova Empresa Parceira'}</h2>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Nome da Empresa *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Ex: Pulver Farm"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="category">Categoria</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category || ''}
                onChange={handleChange}
                placeholder="Ex: Consultoria, Tecnologia..."
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </div>

          <h3 className={styles.sectionTitle}>Informações de Contato</h3>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="contactName">Nome do Contato</label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                value={formData.contactName || ''}
                onChange={handleChange}
                placeholder="Responsável pela empresa"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Telefone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Descrição / Notas</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Informações adicionais sobre o parceiro..."
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn}>
              {company ? 'Salvar Alterações' : 'Cadastrar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
