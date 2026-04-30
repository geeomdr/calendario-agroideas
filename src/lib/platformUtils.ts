import type { AgroEvent } from '../types';

export const MAX_PER_PLATFORM = 3;

/** Plataformas rastreadas no limite diário */
export const PANEL_PLATFORMS = ['Reels', 'Shorts', 'TikTok'] as const;
export type PanelPlatform = (typeof PANEL_PLATFORMS)[number];

/** Mapeamento dos valores do select → plataformas individuais */
const PLATFORM_MAP: Record<string, string[]> = {
  'Reels+Shorts+TT': ['Reels', 'Shorts', 'TikTok'],
  'Reels+TT':        ['Reels', 'TikTok'],
  'Shorts+TT':       ['Shorts', 'TikTok'],
  'Reels+Shorts':    ['Reels', 'Shorts'],
  'Apenas Reels':    ['Reels'],
  'Apenas Shorts':   ['Shorts'],
  'Apenas TT':       ['TikTok'],
  'Longo YT':        ['YouTube'],
  'Spotify+Áudio':   ['Spotify'],
};

/** Decompõe uma string de plataformas em nomes individuais. */
export function parsePlatforms(platformStr: string | undefined): string[] {
  if (!platformStr) return [];
  return PLATFORM_MAP[platformStr] ?? [];
}

/**
 * Conta quantos cortes cada plataforma tem em um determinado dia.
 * @param events   Lista completa de cortes
 * @param dateStr  Data no formato YYYY-MM-DD
 * @param excludeEventId  ID do corte a ignorar (modo edição)
 */
export function getOccupancy(
  events: AgroEvent[],
  dateStr: string,
  excludeEventId?: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of PANEL_PLATFORMS) counts[p] = 0;

  for (const ev of events) {
    if (excludeEventId && ev.id === excludeEventId) continue;
    // Converte a data do evento para YYYY-MM-DD sem depender de date-fns
    const evDate = ev.date.toISOString().slice(0, 10);
    if (evDate !== dateStr) continue;
    for (const p of parsePlatforms(ev.platforms)) {
      if (p in counts) counts[p]++;
    }
  }
  return counts;
}

/**
 * Retorna as plataformas selecionadas que já estão lotadas na data.
 */
export function getConflictingPlatforms(
  occupancy: Record<string, number>,
  selectedPlatformStr: string | undefined,
): string[] {
  return parsePlatforms(selectedPlatformStr).filter(
    p => (occupancy[p] ?? 0) >= MAX_PER_PLATFORM,
  );
}

/** Formata YYYY-MM-DD → DD/MM/YYYY (sem dependência de date-fns) */
export function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
