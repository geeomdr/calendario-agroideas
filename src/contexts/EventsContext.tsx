import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AgroEvent, EpisodeRecord, PartnerCompany, Status } from '../types';
import { supabase } from '../lib/supabase';

// ─── Mapeamento JS ↔ Supabase (snake_case) ──────────────────────────────────

function eventToRow(e: AgroEvent) {
  return {
    id: e.id, title: e.title,
    date: e.date.toISOString(),
    time: e.time ?? null,
    status: e.status, episode: e.episode, company: e.company,
    company_id: e.companyId ?? null,
    cut_number: e.cutNumber,
    platforms: e.platforms ?? null, notes: e.notes ?? null,
    link_producao: e.linkProducao ?? null,
    published_links: e.publishedLinks ? JSON.stringify(e.publishedLinks) : null,
  };
}

function rowToEvent(r: Record<string, unknown>): AgroEvent {
  let publishedLinks: { channel: string; url: string }[] | undefined;
  if (r.published_links) {
    try { publishedLinks = JSON.parse(r.published_links as string); } catch { publishedLinks = undefined; }
  }
  return {
    id: String(r.id), title: String(r.title),
    date: new Date(r.date as string),
    time: r.time as string | undefined,
    status: r.status as Status,
    episode: String(r.episode), company: String(r.company),
    companyId: r.company_id as string | undefined,
    cutNumber: Number(r.cut_number),
    platforms: r.platforms as string | undefined,
    notes: r.notes as string | undefined,
    linkProducao: r.link_producao as string | undefined,
    publishedLinks,
  };
}

function episodeToRow(e: EpisodeRecord) {
  return {
    id: e.id,
    episode_number: e.episodeNumber ?? null,
    name: e.name, company: e.company,
    company_id: e.companyId ?? null,
    guest: e.guest,
    recording_date: e.recordingDate.toISOString(),
    publish_date: e.publishDate?.toISOString() ?? null,
    status: e.status, notes: e.notes ?? null,
    link_video: e.linkVideo ?? null,
    link_carrossel: e.linkCarrossel ?? null,
    link_thumbnail: e.linkThumbnail ?? null,
    published_links: e.publishedLinks ? JSON.stringify(e.publishedLinks) : null,
  };
}

function rowToEpisode(r: Record<string, unknown>): EpisodeRecord {
  let publishedLinks: { channel: string; url: string }[] | undefined;
  if (r.published_links) {
    try { publishedLinks = JSON.parse(r.published_links as string); } catch { publishedLinks = undefined; }
  }
  return {
    id: String(r.id),
    episodeNumber: r.episode_number as number | undefined,
    name: String(r.name), company: String(r.company),
    companyId: r.company_id as string | undefined,
    guest: String(r.guest),
    recordingDate: new Date(r.recording_date as string),
    publishDate: r.publish_date ? new Date(r.publish_date as string) : undefined,
    status: r.status as EpisodeRecord['status'],
    notes: r.notes as string | undefined,
    linkVideo: r.link_video as string | undefined,
    linkCarrossel: r.link_carrossel as string | undefined,
    linkThumbnail: r.link_thumbnail as string | undefined,
    publishedLinks,
  };
}

function companyToRow(c: PartnerCompany) {
  return {
    id: c.id, name: c.name, logo: c.logo ?? null,
    contact_name: c.contactName ?? null,
    email: c.email ?? null, phone: c.phone ?? null,
    website: c.website ?? null, description: c.description ?? null,
    category: c.category ?? null,
  };
}

function rowToCompany(r: Record<string, unknown>): PartnerCompany {
  return {
    id: String(r.id), name: String(r.name),
    logo: r.logo as string | undefined,
    contactName: r.contact_name as string | undefined,
    email: r.email as string | undefined,
    phone: r.phone as string | undefined,
    website: r.website as string | undefined,
    description: r.description as string | undefined,
    category: r.category as string | undefined,
  };
}

// ─── Dados iniciais ──────────────────────────────────────────────────────────

const initialCompanies: PartnerCompany[] = [
  { id: 'agrilean', name: 'AgriLean', category: 'Consultoria Agrícola', email: 'contato@agrilean.com.br', contactName: 'Ricardo Agri', phone: '(11) 98888-7777', website: 'https://agrilean.com.br', description: 'Especialistas em gestão eficiente de lavouras e redução de custos.' },
  { id: 'agrinvest', name: 'Agrinvest', category: 'Mercado Financeiro', email: 'vendas@agrinvest.com.br', contactName: 'Marcos Invest', phone: '(11) 97777-6666', website: 'https://agrinvest.com.br', description: 'Monitoramento de mercado e estratégias de comercialização de commodities.' },
  { id: 'pulver', name: 'Pulver Farm', category: 'Tecnologia Aplicada', email: 'suporte@pulverfarm.com', contactName: 'Bruno Alvim', phone: '(11) 96666-5555', website: 'https://pulverfarm.com', description: 'Sistemas inteligentes de pulverização e drones para agricultura de precisão.' },
  { id: 'agroideas', name: 'AgroIdeas', category: 'Educação e Mídia', email: 'adm@agroideas.com.br', contactName: 'Ana Agro', phone: '(11) 95555-4444', website: 'https://agroideas.com.br', description: 'Plataforma de conteúdo técnico e podcasts para o agronegócio.' },
];

const initialEvents: AgroEvent[] = [
  { id: 'al1-1', title: 'Fomosafen ou Lactofen', date: new Date(2026, 2, 24), status: 'postado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 1, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-2', title: 'Soja: O fim do glifosato e o retorno do pré-emergente', date: new Date(2026, 2, 24), status: 'postado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 2, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-3', title: 'Lactofem — fitoxicidade e seletividade e/ou controle do caruru', date: new Date(2026, 2, 24), status: 'postado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 3, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-4', title: 'Caruru: A semente que viaja no pássaro', date: new Date(2026, 2, 24), status: 'postado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 4, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-5', title: 'Lactofem — estruturador/regulador de porte da soja', date: new Date(2026, 2, 24), status: 'postado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 5, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-6', title: 'Santa Luzia e Corda de Viola', date: new Date(2026, 2, 24), status: 'postado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 6, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-7', title: 'Lactofem — encontrar outro assunto', date: new Date(2026, 3, 10), status: 'agendado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 7, platforms: 'Reels+Shorts+TT' },
  { id: 'al1-8', title: 'Tecnologia soja enlist i2x ipro', date: new Date(2026, 2, 24), status: 'agendado', episode: 'AgriLean EP1', company: 'AgriLean', companyId: 'agrilean', cutNumber: 8, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-1', title: 'O maior erro do produtor não está na lavoura', date: new Date(2026, 2, 20), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 1, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-2', title: 'O erro que faz produtor perder dinheiro todo ano', date: new Date(2026, 2, 21), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 2, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-3', title: 'A exportação americana de soja', date: new Date(2026, 2, 21), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 3, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-4', title: 'Informação não paga safra. Decisão paga.', date: new Date(2026, 2, 22), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 4, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-5', title: 'Exportação barata no Brasil', date: new Date(2026, 2, 30), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 5, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-6', title: 'Guerra Irã e seus impactos', date: new Date(2026, 3, 2), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 6, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-7', title: 'Como a China lucra com o Brasil', date: new Date(2026, 3, 9), status: 'postado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 7, platforms: 'Reels+Shorts+TT' },
  { id: 'ai1-8', title: 'O inimigo invisível do produtor', date: new Date(2026, 3, 16), status: 'agendado', episode: 'Agrinvest EP1', company: 'Agrinvest', companyId: 'agrinvest', cutNumber: 8, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-1', title: 'Como surgiu o influenciador', date: new Date(2026, 2, 26), status: 'postado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 1, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-2', title: 'Drone substituir pulverizador', date: new Date(2026, 2, 31), status: 'postado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 2, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-3', title: 'História da DJI', date: new Date(2026, 3, 4), status: 'postado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 3, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-4', title: 'O que levou ir para o Mato Grosso?', date: new Date(2026, 3, 8), status: 'postado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 4, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-5', title: 'Drone ou pulverizador?', date: new Date(2026, 2, 12), status: 'postado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 5, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-6', title: 'A realidade de usar drone na lavoura', date: new Date(2026, 3, 14), status: 'agendado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 6, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-7', title: 'Drone, gerador e misturador em uma carreta só', date: new Date(2026, 3, 17), status: 'agendado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 7, platforms: 'Reels+Shorts+TT' },
  { id: 'pjm-8', title: 'Perdi 37 hectares usando pulverizador', date: new Date(2026, 3, 21), status: 'agendado', episode: 'Pulver + José Marcos EP1', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 8, platforms: 'Reels+Shorts+TT' },
  { id: 'pba-1', title: 'O autopropelido está com os dias contados', date: new Date(2026, 2, 15), status: 'postado', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 1, platforms: 'Reels+Shorts+TT' },
  { id: 'pba-2', title: 'O erro que faz seu drone cair', date: new Date(2026, 3, 7), status: 'postado', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 2, platforms: 'Reels+Shorts+TT' },
  { id: 'pba-3', title: 'O problema oculto na manutenção de drone', date: new Date(2026, 3, 10), status: 'agendado', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 3, platforms: 'Reels+Shorts+TT' },
  { id: 'pba-4', title: 'O risco que todo operador de drone corre', date: new Date(2026, 3, 10), status: 'em-edicao', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 4, platforms: 'Reels+Shorts+TT' },
  { id: 'pba-5', title: 'Corte 05', date: new Date(2026, 3, 10), status: 'pendente', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 5 },
  { id: 'pba-6', title: 'Corte 06', date: new Date(2026, 3, 11), status: 'pendente', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 6 },
  { id: 'pba-7', title: 'Corte 07', date: new Date(2026, 3, 12), status: 'pendente', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 7 },
  { id: 'pba-8', title: 'Corte 08', date: new Date(2026, 3, 13), status: 'pendente', episode: 'Pulver + Bruno Alvim EP2', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 8 },
  { id: 'pty-1', title: 'Equipamentos a combustão vão acabar?', date: new Date(2026, 3, 7), status: 'postado', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 1, platforms: 'Reels+Shorts+TT' },
  { id: 'pty-2', title: 'A bateria vai substituir o gerador no drone?', date: new Date(2026, 3, 9), status: 'agendado', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 2, platforms: 'Reels+Shorts+TT' },
  { id: 'pty-3', title: 'O que inutiliza o gerador no campo', date: new Date(2026, 3, 14), status: 'em-edicao', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 3, platforms: 'Reels+Shorts+TT' },
  { id: 'pty-4', title: 'Corte 04', date: new Date(2026, 3, 15), status: 'pendente', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 4 },
  { id: 'pty-5', title: 'Corte 05', date: new Date(2026, 3, 16), status: 'pendente', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 5 },
  { id: 'pty-6', title: 'Corte 06', date: new Date(2026, 3, 17), status: 'pendente', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 6 },
  { id: 'pty-7', title: 'Corte 07', date: new Date(2026, 3, 18), status: 'pendente', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 7 },
  { id: 'pty-8', title: 'Corte 08', date: new Date(2026, 3, 19), status: 'pendente', episode: 'Pulver + Toyama EP3', company: 'Pulver Farm', companyId: 'pulver', cutNumber: 8 },
  { id: 'sj-1', title: 'Corte 01', date: new Date(2026, 3, 10), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 1 },
  { id: 'sj-2', title: 'Corte 02', date: new Date(2026, 3, 15), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 2 },
  { id: 'sj-3', title: 'Corte 03', date: new Date(2026, 3, 19), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 3 },
  { id: 'sj-4', title: 'Corte 04', date: new Date(2026, 3, 21), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 4 },
  { id: 'sj-5', title: 'Corte 05', date: new Date(2026, 3, 23), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 5 },
  { id: 'sj-6', title: 'Corte 06', date: new Date(2026, 3, 25), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 6 },
  { id: 'sj-7', title: 'Corte 07', date: new Date(2026, 3, 27), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 7 },
  { id: 'sj-8', title: 'Corte 08', date: new Date(2026, 3, 29), status: 'pendente', episode: 'São José EP1', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 8 },
  { id: 'mg-1', title: 'Corte 01', date: new Date(2026, 3, 17), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 1 },
  { id: 'mg-2', title: 'Corte 02', date: new Date(2026, 3, 18), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 2 },
  { id: 'mg-3', title: 'Corte 03', date: new Date(2026, 3, 19), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 3 },
  { id: 'mg-4', title: 'Corte 04', date: new Date(2026, 3, 20), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 4 },
  { id: 'mg-5', title: 'Corte 05', date: new Date(2026, 3, 21), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 5 },
  { id: 'mg-6', title: 'Corte 06', date: new Date(2026, 3, 22), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 6 },
  { id: 'mg-7', title: 'Corte 07', date: new Date(2026, 3, 24), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 7 },
  { id: 'mg-8', title: 'Corte 08', date: new Date(2026, 3, 27), status: 'pendente', episode: 'Morgan EP2', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 8 },
  { id: 'mr-1', title: 'Corte 01', date: new Date(2026, 3, 24), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 1 },
  { id: 'mr-2', title: 'Corte 02', date: new Date(2026, 3, 25), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 2 },
  { id: 'mr-3', title: 'Corte 03', date: new Date(2026, 3, 26), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 3 },
  { id: 'mr-4', title: 'Corte 04', date: new Date(2026, 3, 27), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 4 },
  { id: 'mr-5', title: 'Corte 05', date: new Date(2026, 3, 28), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 5 },
  { id: 'mr-6', title: 'Corte 06', date: new Date(2026, 3, 29), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 6 },
  { id: 'mr-7', title: 'Corte 07', date: new Date(2026, 3, 30), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 7 },
  { id: 'mr-8', title: 'Corte 08', date: new Date(2026, 3, 30), status: 'pendente', episode: 'Michel Rech EP3', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 8 },
  { id: 'hm-1', title: 'Corte 01', date: new Date(2026, 3, 21), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 1 },
  { id: 'hm-2', title: 'Corte 02', date: new Date(2026, 3, 22), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 2 },
  { id: 'hm-3', title: 'Corte 03', date: new Date(2026, 3, 23), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 3 },
  { id: 'hm-4', title: 'Corte 04', date: new Date(2026, 3, 24), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 4 },
  { id: 'hm-5', title: 'Corte 05', date: new Date(2026, 3, 25), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 5 },
  { id: 'hm-6', title: 'Corte 06', date: new Date(2026, 3, 26), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 6 },
  { id: 'hm-7', title: 'Corte 07', date: new Date(2026, 3, 27), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 7 },
  { id: 'hm-8', title: 'Corte 08', date: new Date(2026, 3, 28), status: 'pendente', episode: 'Hiran Moreira EP4', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 8 },
  { id: 'gs-1', title: 'Corte 01', date: new Date(2026, 3, 14), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 1 },
  { id: 'gs-2', title: 'Corte 02', date: new Date(2026, 3, 15), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 2 },
  { id: 'gs-3', title: 'Corte 03', date: new Date(2026, 3, 16), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 3 },
  { id: 'gs-4', title: 'Corte 04', date: new Date(2026, 3, 18), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 4 },
  { id: 'gs-5', title: 'Corte 05', date: new Date(2026, 3, 20), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 5 },
  { id: 'gs-6', title: 'Corte 06', date: new Date(2026, 3, 22), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 6 },
  { id: 'gs-7', title: 'Corte 07', date: new Date(2026, 3, 23), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 7 },
  { id: 'gs-8', title: 'Corte 08', date: new Date(2026, 3, 26), status: 'pendente', episode: 'Guilherme Sanches EP5', company: 'AgroIdeas', companyId: 'agroideas', cutNumber: 8 },
];

// ─── Context ─────────────────────────────────────────────────────────────────

interface EventsContextType {
  loading: boolean;
  events: AgroEvent[];
  addEvent: (event: Omit<AgroEvent, 'id'>) => void;
  addEvents: (events: Omit<AgroEvent, 'id'>[]) => void;
  updateEvent: (id: string, updates: Partial<AgroEvent>) => void;
  deleteEvent: (id: string) => void;
  episodes: EpisodeRecord[];
  addEpisode: (ep: Omit<EpisodeRecord, 'id'>) => void;
  updateEpisode: (id: string, ep: Partial<EpisodeRecord>) => void;
  deleteEpisode: (id: string) => void;
  companies: PartnerCompany[];
  addCompany: (company: Omit<PartnerCompany, 'id'>) => void;
  updateCompany: (id: string, company: Partial<PartnerCompany>) => void;
  deleteCompany: (id: string) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

const genId = () => Math.random().toString(36).substring(2, 11);

export const EventsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AgroEvent[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const [companies, setCompanies] = useState<PartnerCompany[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Carrega tudo do Supabase na inicialização ──────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [
          { data: companiesData, error: ce },
          { data: eventsData, error: ee },
          { data: episodesData, error: epe },
        ] = await Promise.all([
          supabase.from('companies').select('*'),
          supabase.from('events').select('*'),
          supabase.from('episodes').select('*'),
        ]);

        if (ce || ee || epe) {
          console.error('Supabase load errors:', ce, ee, epe);
        }

        // Empresas: seed se vazio
        if (companiesData && companiesData.length > 0) {
          setCompanies(companiesData.map(rowToCompany));
        } else {
          await supabase.from('companies').insert(initialCompanies.map(companyToRow));
          setCompanies(initialCompanies);
        }

        // Cortes: seed se vazio
        if (eventsData && eventsData.length > 0) {
          setEvents(eventsData.map(rowToEvent));
        } else {
          const rows = initialEvents.map(eventToRow);
          // Insere em lotes de 30 para não exceder limite de payload
          for (let i = 0; i < rows.length; i += 30) {
            await supabase.from('events').insert(rows.slice(i, i + 30));
          }
          setEvents(initialEvents);
        }

        // Episódios: carrega (sem seed — usuário cria os seus)
        if (episodesData && episodesData.length > 0) {
          setEpisodes(episodesData.map(rowToEpisode));
        }
      } catch (err) {
        console.error('Erro ao conectar ao Supabase:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // ── Cortes ────────────────────────────────────────────────────────────────

  const addEvent = (event: Omit<AgroEvent, 'id'>) => {
    const e = { ...event, id: genId() };
    setEvents(prev => [...prev, e]);
    supabase.from('events').insert(eventToRow(e)).then(({ error }) => {
      if (error) console.error('Erro ao salvar corte:', error);
    });
  };

  const addEvents = (newEvents: Omit<AgroEvent, 'id'>[]) => {
    const withIds = newEvents.map(e => ({ ...e, id: genId() }));
    setEvents(prev => [...prev, ...withIds]);
    supabase.from('events').insert(withIds.map(eventToRow)).then(({ error }) => {
      if (error) console.error('Erro ao salvar cortes:', error);
    });
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    supabase.from('events').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Erro ao deletar corte:', error);
    });
  };

  const updateEvent = (id: string, updates: Partial<AgroEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const row: Record<string, unknown> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.date !== undefined) row.date = updates.date.toISOString();
    if (updates.time !== undefined) row.time = updates.time;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.episode !== undefined) row.episode = updates.episode;
    if (updates.company !== undefined) row.company = updates.company;
    if (updates.companyId !== undefined) row.company_id = updates.companyId;
    if (updates.cutNumber !== undefined) row.cut_number = updates.cutNumber;
    if (updates.platforms !== undefined) row.platforms = updates.platforms;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.linkProducao !== undefined) row.link_producao = updates.linkProducao ?? null;
    if (updates.publishedLinks !== undefined) row.published_links = JSON.stringify(updates.publishedLinks);
    supabase.from('events').update(row).eq('id', id).then(({ error }) => {
      if (error) console.error('Erro ao atualizar corte:', error);
    });
  };

  // ── Episódios ─────────────────────────────────────────────────────────────

  const addEpisode = (ep: Omit<EpisodeRecord, 'id'>) => {
    const e = { ...ep, id: genId() };
    setEpisodes(prev => [...prev, e]);
    supabase.from('episodes').insert(episodeToRow(e)).then(({ error }) => {
      if (error) console.error('Erro ao salvar episódio:', error);
    });
  };

  const updateEpisode = (id: string, ep: Partial<EpisodeRecord>) => {
    setEpisodes(prev => prev.map(e => e.id === id ? { ...e, ...ep } : e));
    const row: Record<string, unknown> = {};
    if (ep.episodeNumber !== undefined) row.episode_number = ep.episodeNumber;
    if (ep.name !== undefined) row.name = ep.name;
    if (ep.company !== undefined) row.company = ep.company;
    if (ep.companyId !== undefined) row.company_id = ep.companyId;
    if (ep.guest !== undefined) row.guest = ep.guest;
    if (ep.recordingDate !== undefined) row.recording_date = ep.recordingDate.toISOString();
    if (ep.publishDate !== undefined) row.publish_date = ep.publishDate?.toISOString() ?? null;
    if (ep.status !== undefined) row.status = ep.status;
    if (ep.notes !== undefined) row.notes = ep.notes;
    if (ep.linkVideo !== undefined) row.link_video = ep.linkVideo ?? null;
    if (ep.linkCarrossel !== undefined) row.link_carrossel = ep.linkCarrossel ?? null;
    if (ep.linkThumbnail !== undefined) row.link_thumbnail = ep.linkThumbnail ?? null;
    if (ep.publishedLinks !== undefined) row.published_links = JSON.stringify(ep.publishedLinks);
    supabase.from('episodes').update(row).eq('id', id).then(({ error }) => {
      if (error) console.error('Erro ao atualizar episódio:', error);
    });
  };

  const deleteEpisode = (id: string) => {
    const ep = episodes.find(e => e.id === id);
    setEpisodes(prev => prev.filter(e => e.id !== id));
    supabase.from('episodes').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Erro ao deletar episódio:', error);
    });
    // Remove também todos os cortes vinculados ao nome do episódio
    if (ep) {
      setEvents(prev => prev.filter(ev => ev.episode !== ep.name));
      supabase.from('events').delete().eq('episode', ep.name).then(({ error }) => {
        if (error) console.error('Erro ao deletar cortes do episódio:', error);
      });
    }
  };

  // ── Empresas ──────────────────────────────────────────────────────────────

  const addCompany = (company: Omit<PartnerCompany, 'id'>) => {
    const c = { ...company, id: genId() };
    setCompanies(prev => [...prev, c]);
    supabase.from('companies').insert(companyToRow(c)).then(({ error }) => {
      if (error) console.error('Erro ao salvar empresa:', error);
    });
  };

  const updateCompany = (id: string, company: Partial<PartnerCompany>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...company } : c));
    const row: Record<string, unknown> = {};
    if (company.name !== undefined) row.name = company.name;
    if (company.logo !== undefined) row.logo = company.logo;
    if (company.contactName !== undefined) row.contact_name = company.contactName;
    if (company.email !== undefined) row.email = company.email;
    if (company.phone !== undefined) row.phone = company.phone;
    if (company.website !== undefined) row.website = company.website;
    if (company.description !== undefined) row.description = company.description;
    if (company.category !== undefined) row.category = company.category;
    supabase.from('companies').update(row).eq('id', id).then(({ error }) => {
      if (error) console.error('Erro ao atualizar empresa:', error);
    });
  };

  const deleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    supabase.from('companies').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Erro ao deletar empresa:', error);
    });
  };

  return (
    <EventsContext.Provider value={{
      loading,
      events, addEvent, addEvents, updateEvent, deleteEvent,
      episodes, addEpisode, updateEpisode, deleteEpisode,
      companies, addCompany, updateCompany, deleteCompany,
    }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) throw new Error('useEvents must be used within an EventsProvider');
  return context;
};
