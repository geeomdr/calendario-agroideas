import { useState, useEffect } from 'react';

export interface WorkspaceSettings {
  orgName: string;
  orgEmail: string;
  orgLogo: string; // base64 data URL
  userName: string;
  userEmail: string;
  userRole: string;
}

const STORAGE_KEY = 'agroideas_workspace';

const DEFAULTS: WorkspaceSettings = {
  orgName: 'AgroIdeas',
  orgEmail: '',
  orgLogo: '',
  userName: 'Geovana',
  userEmail: 'geovana.silva@appmoove.com.br',
  userRole: 'Produtora',
};

export function useWorkspace() {
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<WorkspaceSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  return { settings, update };
}
