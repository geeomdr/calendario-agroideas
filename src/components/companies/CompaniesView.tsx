import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useEvents } from '../../contexts/EventsContext';
import styles from './CompaniesView.module.css';
import type { PartnerCompany } from '../../types';
import CompanyModal from './CompanyModal';

const CompaniesView: React.FC = () => {
  const { companies, episodes, events, deleteCompany } = useEvents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<PartnerCompany | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredCompanies = companies.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompanyStats = (companyId: string) => {
    const companyEpisodes = episodes.filter(e => e.companyId === companyId);
    const companyEvents = events.filter(e => e.companyId === companyId);
    return { episodesCount: companyEpisodes.length, eventsCount: companyEvents.length };
  };

  const handleEdit = (company: PartnerCompany) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCompany(undefined);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      deleteCompany(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Gestão de Parceiros</h1>
          <p>Gerencie suas empresas parceiras e seus vínculos de conteúdo.</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.addButton} onClick={handleAdd}>
            Nova Empresa
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        {filteredCompanies.map(company => {
          const stats = getCompanyStats(company.id);
          return (
            <div key={company.id} className={styles.card} onClick={() => handleEdit(company)}>
              <div className={styles.cardHeader}>
                <div className={styles.logoPlaceholder}>
                  {company.logo ? <img src={company.logo} alt={company.name} /> : company.name.charAt(0)}
                </div>
                <div className={styles.companyInfo}>
                  <h3>{company.name}</h3>
                  <span className={styles.category}>{company.category || 'Sem categoria'}</span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDeleteClick(e, company.id)}
                  title="Excluir empresa"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p className={styles.description}>{company.description || 'Nenhuma descrição fornecida.'}</p>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{stats.episodesCount}</span>
                  <span className={styles.statLabel}>Podcasts</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{stats.eventsCount}</span>
                  <span className={styles.statLabel}>Cortes</span>
                </div>
              </div>

              <div className={styles.contactFooter}>
                {company.contactName && (
                  <div className={styles.contactInfo}>
                    <span className={styles.contactLabel}>Contato:</span> {company.contactName}
                  </div>
                )}
                {company.email && (
                  <div className={styles.contactInfo}>
                    <span className={styles.contactLabel}>E-mail:</span> {company.email}
                  </div>
                )}
              </div>

              <button className={styles.viewDetails}>Ver Detalhes</button>
            </div>
          );
        })}

        {filteredCompanies.length === 0 && (
          <div className={styles.emptyState}>
            <p>Nenhuma empresa encontrada com os termos buscados.</p>
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDeleteId && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h3>Excluir empresa?</h3>
            <p>Esta ação não pode ser desfeita.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelConfirm} onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
              <button className={styles.confirmDelete} onClick={handleDeleteConfirm}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        company={selectedCompany}
      />
    </div>
  );
};

export default CompaniesView;
