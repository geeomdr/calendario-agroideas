import { useState } from 'react';
import type { ContentTemplate } from '../types';

const STORAGE_KEY = 'agroideas_templates';

export function useTemplates() {
  const [templates, setTemplates] = useState<ContentTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const save = (updated: ContentTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addTemplate = (t: Omit<ContentTemplate, 'id' | 'createdAt'>) => {
    const newT: ContentTemplate = { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    save([...templates, newT]);
  };

  const updateTemplate = (id: string, updates: Partial<ContentTemplate>) => {
    save(templates.map(t => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTemplate = (id: string) => {
    save(templates.filter(t => t.id !== id));
  };

  return { templates, addTemplate, updateTemplate, deleteTemplate };
}
