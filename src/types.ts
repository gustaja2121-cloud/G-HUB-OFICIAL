export type Platform = 'TikTok' | 'YouTube' | 'WhatsApp' | 'Instagram';

export interface Note {
  id: string;
  title: string;
  content?: string;
  createdAt: string; // ISO string
}

export interface DailyChecklistTask {
  id: string;
  title: string;
  completed: boolean;
  type: 'post' | 'edit' | 'idea' | 'other';
}

export interface FinanceEntry {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface UserLevel {
  xp: number;
  level: number;
  totalXp: number;
}

export interface PerformanceState {
  streak: number;
  lastActiveDate: string;
  totalVideosCreated: number;
  totalVideosPosted: number;
  xp: number;
  level: number;
  lastResetDate?: string;
}

export interface ClipLog {
  id: string;
  data: string; // YYYY-MM-DD
  quantidade: number;
}

export interface VideoPostRecord {
  id: string;
  data: string; // YYYY-MM-DD
  quantidade: number;
  userId: string;
}

export interface Account {
  id: string;
  platform: string;
  login: string;
  password?: string;
  url?: string;
  notes?: string;
  userId: string;
  updatedAt?: any;
}

export interface ClipLink {
  id: string;
  title: string;
  rawUrl?: string;
  editedUrl?: string;
  status: 'ideia' | 'editando' | 'pronto' | 'postado';
  createdAt: string;
}
