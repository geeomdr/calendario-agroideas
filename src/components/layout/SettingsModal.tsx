import React, { useState, useRef } from 'react';
import { X, Building2, User, Save, CheckCircle2, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '../../hooks/useWorkspace';
import styles from './SettingsModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { settings, update } = useWorkspace();
  const [tab, setTab] = useState<'org' | 'user'>('org');
  const [toast, setToast] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local draft state
  const [orgName, setOrgName] = useState(settings.orgName);
  const [orgEmail, setOrgEmail] = useState(settings.orgEmail);
  const [orgLogo, setOrgLogo] = useState(settings.orgLogo);
  const [userName, setUserName] = useState(settings.userName);
  const [userEmail, setUserEmail] = useState(settings.userEmail);
  const [userRole, setUserRole] = useState(settings.userRole);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setOrgLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    update({ orgName, orgEmail, orgLogo, userName, userEmail, userRole });
    setToast(true);
    setTimeout(() => { setToast(false); onClose(); }, 1200);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2>Configurações</h2>
              <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'org' ? styles.tabActive : ''}`}
                onClick={() => setTab('org')}
              >
                <Building2 size={14} /> Empresa
              </button>
              <button
                className={`${styles.tab} ${tab === 'user' ? styles.tabActive : ''}`}
                onClick={() => setTab('user')}
              >
                <User size={14} /> Meu Perfil
              </button>
            </div>

            <div className={styles.body}>
              {tab === 'org' ? (
                <>
                  {/* Logo */}
                  <div className={styles.logoSection}>
                    <div className={styles.logoPreview} onClick={() => fileRef.current?.click()} title="Clique para trocar o logo">
                      {orgLogo
                        ? <img src={orgLogo} alt="Logo" />
                        : <ImagePlus size={28} color="var(--text-muted)" />
                      }
                    </div>
                    <div className={styles.logoUploadInfo}>
                      <span className={styles.logoUploadTitle}>Logotipo da empresa</span>
                      <span className={styles.logoUploadHint}>PNG, JPG ou SVG. Recomendado 200×200px.</span>
                      <button className={styles.logoUploadBtn} onClick={() => fileRef.current?.click()}>
                        {orgLogo ? 'Trocar imagem' : 'Enviar imagem'}
                      </button>
                      {orgLogo && (
                        <button className={styles.logoRemoveBtn} onClick={() => setOrgLogo('')}>
                          Remover
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.field}>
                    <label>Nome da empresa / podcast</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder="Ex: AgroIdeas"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>E-mail de contato</label>
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={e => setOrgEmail(e.target.value)}
                      placeholder="contato@agroideas.com.br"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.field}>
                    <label>Nome</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      placeholder="seu@email.com.br"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Cargo / Função</label>
                    <input
                      type="text"
                      value={userRole}
                      onChange={e => setUserRole(e.target.value)}
                      placeholder="Ex: Produtora, Editor..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave}>
                <Save size={14} /> Salvar
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {toast && (
        <div className={styles.toast}>
          <CheckCircle2 size={16} /> Configurações salvas!
        </div>
      )}
    </>
  );
};

export default SettingsModal;
