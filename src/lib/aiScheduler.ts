import type { AgroEvent } from '../types';

export interface EpisodeInput {
  name: string;
  company: string;
  recordingDate: string;  // YYYY-MM-DD
  publishDate?: string;   // YYYY-MM-DD
  cutCount: number;
  topics: string[];
  existingEvents: AgroEvent[]; // calendário atual para análise
}

export interface SuggestedCut {
  cutNumber: number;
  topic: string;
  suggestedDate: string; // YYYY-MM-DD
  rationale: string;
}

// Converte YYYY-MM-DD para Date (meio-dia para evitar problema de fuso)
function parseDate(str: string): Date {
  return new Date(str + 'T12:00:00');
}

// Formata Date para YYYY-MM-DD
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Conta quantos eventos existem em uma data
function countEventsOnDate(events: AgroEvent[], dateStr: string): number {
  return events.filter(e => formatDate(e.date) === dateStr).length;
}

// Verifica se é dia útil (seg–sex)
function isWeekday(d: Date): boolean {
  const day = d.getDay(); // 0=dom, 6=sab
  return day >= 1 && day <= 5;
}

// Dia da semana em português para o rationale
function weekdayPt(d: Date): string {
  const names = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return names[d.getDay()];
}

export function suggestSchedule(input: EpisodeInput, attempt = 0): SuggestedCut[] {
  const { recordingDate, publishDate, cutCount, topics, existingEvents } = input;

  // Data de início: 3 dias após gravação + offset de tentativa (para variar ao regenerar)
  const startDate = parseDate(recordingDate);
  startDate.setDate(startDate.getDate() + 3 + attempt);

  // Data final de referência: publishDate + 7 dias, ou startDate + 45 dias
  const endRef = publishDate
    ? (() => { const d = parseDate(publishDate); d.setDate(d.getDate() + 7); return d; })()
    : (() => { const d = new Date(startDate); d.setDate(d.getDate() + 45); return d; })();

  // Janela total em dias
  const totalWindow = Math.max(
    Math.round((endRef.getTime() - startDate.getTime()) / 86400000),
    cutCount * 3
  );

  // Monta candidatos: todos os dias úteis na janela, ordenados pelo menos ocupado
  const candidates: { dateStr: string; load: number; date: Date }[] = [];
  for (let i = 0; i <= totalWindow + 14; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (!isWeekday(d)) continue;
    const ds = formatDate(d);
    candidates.push({ dateStr: ds, load: countEventsOnDate(existingEvents, ds), date: d });
  }

  // Seleciona N datas com mínimo de 2 dias entre cada uma, priorizando dias com menos carga
  // Estratégia: distribui em "slots" espaçados na janela, depois ajusta para dia menos carregado
  const slotSize = Math.floor(totalWindow / cutCount);
  const chosen: { dateStr: string; date: Date; load: number }[] = [];

  for (let i = 0; i < cutCount; i++) {
    // Janela ideal para este slot
    const slotStart = i * slotSize;
    const slotEnd = slotStart + slotSize + 2;

    // Candidatos neste slot, ainda não usados e com gap mínimo de 2 dias do último escolhido
    const lastChosen = chosen.length > 0 ? chosen[chosen.length - 1].date : null;

    const slotCandidates = candidates.filter(c => {
      const idx = candidates.indexOf(c);
      if (idx < slotStart || idx > slotEnd + 4) return false;
      if (chosen.some(ch => ch.dateStr === c.dateStr)) return false;
      if (lastChosen) {
        const gap = Math.abs(c.date.getTime() - lastChosen.getTime()) / 86400000;
        if (gap < 2) return false;
      }
      return true;
    });

    if (slotCandidates.length === 0) {
      // fallback: pega o primeiro disponível após o último escolhido
      const fallback = candidates.find(c => {
        if (chosen.some(ch => ch.dateStr === c.dateStr)) return false;
        if (lastChosen) {
          const gap = (c.date.getTime() - lastChosen.getTime()) / 86400000;
          if (gap < 2) return false;
        }
        return true;
      });
      if (fallback) chosen.push(fallback);
      continue;
    }

    // Ordena por carga; entre iguais embaralha para variar a cada tentativa
    slotCandidates.sort((a, b) => {
      if (a.load !== b.load) return a.load - b.load;
      // Aleatoriedade baseada no attempt para produzir resultados diferentes
      return (attempt * 7 + i * 13) % 3 === 0 ? 1 : -1;
    });
    chosen.push(slotCandidates[0]);
  }

  // Monta os recortes sugeridos
  return chosen.map((c, i) => {
    const topic = topics[i] || `Recorte ${i + 1}`;
    const wd = weekdayPt(c.date);
    const load = c.load;

    let rationale = '';
    if (load === 0) {
      rationale = `${wd.charAt(0).toUpperCase() + wd.slice(1)} sem publicações previstas — dia livre no calendário`;
    } else if (load === 1) {
      rationale = `${wd.charAt(0).toUpperCase() + wd.slice(1)} com apenas 1 publicação — boa distribuição`;
    } else {
      rationale = `Melhor opção disponível no período — ${wd} com ${load} publicações`;
    }

    return {
      cutNumber: i + 1,
      topic,
      suggestedDate: c.dateStr,
      rationale,
    };
  });
}
