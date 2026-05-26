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

export interface VideoChecklistStep {
  id: string;
  label: string;
  done: boolean;
}

export interface VideoChecklist {
  id: string;
  title: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'WhatsApp' | 'Outro';
  steps: VideoChecklistStep[];
  createdAt: string;
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
  rankings?: RankingSimulation[];
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

export interface RankingSimulation {
  id: string;
  myRank: string;
  myViews: string;
  leaderRank: string;
  leaderViews: string;
  leaderGrowth: string;
  results: {
    diff: number;
    daysRemaining: number;
    projectedLeaderGrowth: number;
    totalToOvertake: number;
    dailyNeeded: number;
    safetyBuffer: number;
    progress: number;
  };
  createdAt?: any;
}

