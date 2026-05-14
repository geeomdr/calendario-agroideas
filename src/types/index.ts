export type ViewType = 'year' | 'month' | 'list' | 'dashboard' | 'episodes' | 'companies' | 'export' | 'analisador' | 'templates';

export interface ContentTemplate {
  id: string;
  name: string;
  channel: string;
  pieceType: string;
  partnerCompany?: string;
  editableLink: string;
  notes?: string;
  createdAt: string;
}

export type Status = 'em-edicao' | 'em-aprovacao' | 'pendente' | 'agendado' | 'postado';

export interface PartnerCompany {
  id: string;
  name: string;
  logo?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  category?: string;
}

export interface AgroEvent {
  id: string;
  title: string;
  date: Date;
  time?: string; // HH:MM format, e.g. "09:00"
  status: Status;
  episode: string;
  company: string;
  companyId?: string;
  cutNumber: number;
  platforms?: string;
  cutType?: 'curto' | 'longo';
  notes?: string;
  linkProducao?: string;
  publishedLinks?: { channel: string; url: string }[];
}

export interface EpisodeRecord {
  id: string;
  episodeNumber?: number;
  name: string;
  company: string;
  companyId?: string;
  guest: string;
  recordingDate: Date;
  publishDate?: Date;
  status: 'gravado' | 'agendado' | 'editando' | 'publicado';
  notes?: string;
  linkVideo?: string;
  linkCarrossel?: string;
  linkThumbnail?: string;
  publishedLinks?: { channel: string; url: string }[];
  instagramCollabs?: string[];
}

