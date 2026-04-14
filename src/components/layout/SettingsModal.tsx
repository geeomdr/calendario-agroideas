import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{ width: '500px', background: 'white', borderRadius: '16px', overflow: 'hidden' }} 
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Configurações do Sistema</h2>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Configurações gerais do sistema em desenvolvimento.</p>
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <input type="checkbox" defaultChecked />
                Notificações por E-mail
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <input type="checkbox" defaultChecked />
                Lembretes no WhatsApp
              </label>
            </div>
          </div>
          <div style={{ padding: '16px 20px', background: '#f9fafb', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Salvar Configurações</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default SettingsModal;
