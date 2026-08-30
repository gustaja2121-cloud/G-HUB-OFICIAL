import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  Note, 
  PerformanceState, 
  DailyChecklistTask, 
  FinanceEntry,
  VideoPostRecord,
  Account,
  RankingSimulation,
  JarvisChatMessage,
  JarvisFact,
  Competition
} from '../types';

const COLLECTIONS = {
  NOTES: 'notes',
  PERFORMANCE: 'users',
  DAILY_CHECKLIST: 'dailyChecklist',
  FINANCE: 'finance',
  VIDEO_PERFORMANCE: 'videoPerformance',
  ACCOUNTS: 'accounts',
  RANKINGS: 'arena',
};

const isGuestOrOffline = () => {
  const guestUser = localStorage.getItem('ghub_guest_user');
  const isGuest = !auth.currentUser || auth.currentUser.uid === 'guest-local-user' || !!guestUser;
  return isGuest;
};

const getUserId = () => {
  const user = auth.currentUser;
  if (user && user.uid && user.uid !== 'guest-local-user') {
    return user.uid;
  }
  return 'guest-local-user';
};

export const storage = {
  // Notes
  getNotes: async (): Promise<Note[]> => {
    const getLocal = (): Note[] => {
      try {
        const saved = localStorage.getItem('ghub_local_notes');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    };

    if (isGuestOrOffline()) {
      return getLocal().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.NOTES),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const notes = snap.docs.map(d => ({ ...d.data(), id: d.id } as Note));
      const sorted = notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localStorage.setItem('ghub_local_notes', JSON.stringify(sorted));
      return sorted;
    } catch (e) {
      console.warn('Firestore getNotes failed, fallback to local storage:', e);
      return getLocal().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  saveNote: async (note: Omit<Note, 'id'> & { id?: string }) => {
    const id = note.id || Math.random().toString(36).substring(2, 9);
    const userId = getUserId();
    const noteData: Note = {
      ...note,
      id,
      createdAt: note.createdAt || new Date().toISOString(),
    };

    // Save to local storage first
    try {
      const currentNotes = await storage.getNotes();
      const existingIdx = currentNotes.findIndex(n => n.id === id);
      let updated: Note[];
      if (existingIdx >= 0) {
        updated = currentNotes.map(n => n.id === id ? noteData : n);
      } else {
        updated = [noteData, ...currentNotes];
      }
      localStorage.setItem('ghub_local_notes', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving note to local storage:', e);
    }

    // Attempt Firestore sync if logged in via Firebase
    if (!isGuestOrOffline()) {
      try {
        await setDoc(doc(db, COLLECTIONS.NOTES, id), { 
          ...noteData, 
          userId,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore saveNote failed, saved locally:', e);
      }
    }
  },

  deleteNote: async (id: string) => {
    try {
      const currentNotes = await storage.getNotes();
      const updated = currentNotes.filter(n => n.id !== id);
      localStorage.setItem('ghub_local_notes', JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting note locally:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.NOTES, id));
      } catch (e) {
        console.warn('Firestore deleteNote failed, deleted locally:', e);
      }
    }
  },

  // Performance / XP
  getPerformance: async (): Promise<PerformanceState> => {
    const userId = getUserId();
    const initial: PerformanceState = {
      streak: 0,
      lastActiveDate: new Date().toISOString(),
      totalVideosCreated: 0,
      totalVideosPosted: 0,
      xp: 0,
      level: 1,
      userId
    };

    const getLocal = (): PerformanceState => {
      try {
        const saved = localStorage.getItem('ghub_local_performance');
        return saved ? JSON.parse(saved) : initial;
      } catch {
        return initial;
      }
    };

    if (isGuestOrOffline()) {
      return getLocal();
    }

    try {
      const d = await getDoc(doc(db, COLLECTIONS.PERFORMANCE, userId));
      if (d.exists()) {
        const perf = d.data() as PerformanceState;
        localStorage.setItem('ghub_local_performance', JSON.stringify(perf));
        return perf;
      }
      await setDoc(doc(db, COLLECTIONS.PERFORMANCE, userId), initial);
      localStorage.setItem('ghub_local_performance', JSON.stringify(initial));
      return initial;
    } catch (e) {
      console.warn('Firestore getPerformance failed, using local storage:', e);
      return getLocal();
    }
  },

  savePerformance: async (perf: PerformanceState) => {
    try {
      localStorage.setItem('ghub_local_performance', JSON.stringify(perf));
    } catch (e) {
      console.error('Error saving local performance:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        const userId = getUserId();
        await setDoc(doc(db, COLLECTIONS.PERFORMANCE, userId), { 
          ...perf, 
          userId,
          updatedAt: serverTimestamp() 
        });
      } catch (e) {
        console.warn('Firestore savePerformance failed:', e);
      }
    }
  },

  addXP: async (amount: number) => {
    try {
      const current = await storage.getPerformance();
      let newXp = (current.xp || 0) + amount;
      let newLevel = current.level || 1;
      
      while (newXp >= newLevel * 1000) {
        newXp -= newLevel * 1000;
        newLevel++;
      }
      
      await storage.savePerformance({ 
        ...current, 
        xp: newXp, 
        level: newLevel 
      });
    } catch (e) {
      console.error('Error adding XP:', e);
    }
  },

  // Checklist
  getChecklist: async (): Promise<DailyChecklistTask[]> => {
    const getLocal = (): DailyChecklistTask[] => {
      try {
        const saved = localStorage.getItem('ghub_local_checklist');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    };

    if (isGuestOrOffline()) {
      return getLocal();
    }

    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.DAILY_CHECKLIST),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const tasks = snap.docs.map(d => ({ ...d.data(), id: d.id } as DailyChecklistTask));
      localStorage.setItem('ghub_local_checklist', JSON.stringify(tasks));
      return tasks;
    } catch (e) {
      console.warn('Firestore getChecklist failed, using local:', e);
      return getLocal();
    }
  },

  saveChecklistTask: async (task: Omit<DailyChecklistTask, 'id'> & { id?: string }) => {
    const id = task.id || Math.random().toString(36).substring(2, 9);
    const userId = getUserId();
    const taskData: DailyChecklistTask = { ...task, id, userId };

    try {
      const current = await storage.getChecklist();
      const idx = current.findIndex(t => t.id === id);
      const updated = idx >= 0 ? current.map(t => t.id === id ? taskData : t) : [...current, taskData];
      localStorage.setItem('ghub_local_checklist', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving checklist task locally:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        await setDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, id), { 
          ...taskData, 
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore saveChecklistTask failed:', e);
      }
    }
  },

  deleteChecklistTask: async (id: string) => {
    try {
      const current = await storage.getChecklist();
      const updated = current.filter(t => t.id !== id);
      localStorage.setItem('ghub_local_checklist', JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting checklist task locally:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, id));
      } catch (e) {
        console.warn('Firestore deleteChecklistTask failed:', e);
      }
    }
  },

  // Finance — stored as special notes to bypass collection permission issues & ensure full offline support
  getFinance: async (): Promise<FinanceEntry[]> => {
    try {
      const notes = await storage.getNotes();
      return notes
        .filter(n => n.title.startsWith('[FINANCE_ENTRY]'))
        .map(n => {
          try {
            return JSON.parse(n.content || '{}') as FinanceEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is FinanceEntry => entry !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error('Error loading finance:', e);
      return [];
    }
  },

  saveFinance: async (entry: Omit<FinanceEntry, 'id'> & { id?: string }) => {
    try {
      const id = entry.id || Math.random().toString(36).substring(2, 9);
      const entryWithId: FinanceEntry = { ...(entry as FinanceEntry), id };
      const noteData: Note = {
        id: `finance_${id}`,
        title: `[FINANCE_ENTRY] ${id}`,
        content: JSON.stringify(entryWithId),
        createdAt: new Date().toISOString(),
      };
      await storage.saveNote(noteData);
      storage.addXP(50).catch(() => {});
    } catch (e) {
      console.error('Error saving finance entry:', e);
      throw e;
    }
  },

  deleteFinance: async (id: string) => {
    try {
      await storage.deleteNote(`finance_${id}`);
    } catch (e) {
      console.error('Error deleting finance entry:', e);
    }
  },

  // Competitions
  getCompetitions: async (): Promise<Competition[]> => {
    try {
      const savedLocal = localStorage.getItem('ghub_local_competitions');
      const localComps: Competition[] = savedLocal ? JSON.parse(savedLocal) : [];
      
      const notes = await storage.getNotes();
      const noteComps = notes
        .filter(n => n.title.startsWith('[COMPETITION]'))
        .map(n => {
          try {
            const parsed = JSON.parse(n.content || '{}') as Competition;
            const noteDocId = n.id.startsWith('comp_') ? n.id.substring(5) : (parsed.id || n.id);
            const cleanId = noteDocId.replace(/[^a-zA-Z0-9_-]/g, '_');
            return {
              ...parsed,
              id: cleanId,
            };
          } catch {
            return null;
          }
        })
        .filter((c): c is Competition => c !== null);

      const map = new Map<string, Competition>();
      noteComps.forEach(c => map.set(c.id, c));
      localComps.forEach(c => {
        const existing = map.get(c.id);
        map.set(c.id, { ...existing, ...c });
      });

      const merged = Array.from(map.values());
      localStorage.setItem('ghub_local_competitions', JSON.stringify(merged));
      return merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (e) {
      console.error('Error loading competitions:', e);
      const savedLocal = localStorage.getItem('ghub_local_competitions');
      return savedLocal ? JSON.parse(savedLocal) : [];
    }
  },

  saveCompetition: async (comp: Omit<Competition, 'id'> & { id?: string }) => {
    try {
      const rawId = comp.id || Math.random().toString(36).substring(2, 9);
      const strippedId = rawId.startsWith('comp_') ? rawId.substring(5) : rawId;
      const cleanId = strippedId.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const compWithId: Competition = { 
        ...(comp as Competition), 
        id: cleanId, 
        createdAt: comp.createdAt || new Date().toISOString() 
      };
      
      Object.keys(compWithId).forEach(k => {
        if ((compWithId as any)[k] === undefined) {
          delete (compWithId as any)[k];
        }
      });

      // 1. Save directly to dedicated local storage key
      const savedLocal = localStorage.getItem('ghub_local_competitions');
      let localComps: Competition[] = savedLocal ? JSON.parse(savedLocal) : [];
      const idx = localComps.findIndex(c => c.id === cleanId);
      if (idx >= 0) {
        localComps[idx] = compWithId;
      } else {
        localComps = [compWithId, ...localComps];
      }
      localStorage.setItem('ghub_local_competitions', JSON.stringify(localComps));

      // 2. Save as Note entry for backup sync
      const noteData: Note = {
        id: `comp_${cleanId}`,
        title: `[COMPETITION] ${cleanId}`,
        content: JSON.stringify(compWithId),
        createdAt: new Date().toISOString(),
      };
      await storage.saveNote(noteData);
      storage.addXP(40).catch(() => {});
    } catch (e) {
      console.error('Error saving competition:', e);
      throw e;
    }
  },

  deleteCompetition: async (id: string) => {
    try {
      const strippedId = id.startsWith('comp_') ? id.substring(5) : id;
      const cleanId = strippedId.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const savedLocal = localStorage.getItem('ghub_local_competitions');
      if (savedLocal) {
        const localComps: Competition[] = JSON.parse(savedLocal);
        const updated = localComps.filter(c => c.id !== cleanId && c.id !== id);
        localStorage.setItem('ghub_local_competitions', JSON.stringify(updated));
      }

      await storage.deleteNote(`comp_${cleanId}`);
      
      const entries = await storage.getFinance();
      const compEntries = entries.filter(e => e.competitionId === id || e.competitionId === cleanId);
      for (const entry of compEntries) {
        await storage.deleteFinance(entry.id);
      }
    } catch (e) {
      console.error('Error deleting competition:', e);
    }
  },

  // Rankings (Arena)
  getRankings: async (): Promise<RankingSimulation[]> => {
    try {
      const notes = await storage.getNotes();
      return notes
        .filter(n => n.title.startsWith('[ARENA_DATA]'))
        .map(n => {
          try {
            return JSON.parse(n.content || '{}') as RankingSimulation;
          } catch {
            return null;
          }
        })
        .filter((r): r is RankingSimulation => r !== null)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (e) {
      return [];
    }
  },

  saveRanking: async (ranking: any) => {
    try {
      const id = Math.random().toString(36).substring(2, 9);
      const simulation = { 
        ...ranking, 
        id,
        createdAt: new Date().toISOString()
      };
      
      const noteData: Note = {
        id,
        title: `[ARENA_DATA] ${new Date().toLocaleString()}`,
        content: JSON.stringify(simulation),
        createdAt: new Date().toISOString()
      };
      
      await storage.saveNote(noteData);
      storage.addXP(30).catch(() => {}); 
      return id;
    } catch (e) {
      console.error('Error saving ranking:', e);
    }
  },

  deleteRanking: async (id: string) => {
    try {
      await storage.deleteNote(id);
    } catch (e) {
      console.error('Error deleting ranking:', e);
    }
  },

  subscribeRankings: (callback: (rankings: RankingSimulation[]) => void) => {
    storage.getRankings().then(callback).catch(() => callback([]));

    if (isGuestOrOffline()) {
      return () => {};
    }

    try {
      const userId = getUserId();
      return onSnapshot(
        query(collection(db, COLLECTIONS.NOTES), where('userId', '==', userId)),
        (snap) => {
          const data = snap.docs
            .map(d => d.data() as Note)
            .filter(n => n.title.startsWith('[ARENA_DATA]'))
            .map(n => {
              try {
                return JSON.parse(n.content || '{}') as RankingSimulation;
              } catch {
                return null;
              }
            })
            .filter((r): r is RankingSimulation => r !== null);
            
          callback(data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        },
        (error) => {
          console.warn("Arena sync fallback to local:", error);
          storage.getRankings().then(callback);
        }
      );
    } catch (e) {
      console.warn("Subscribe rankings error:", e);
      return () => {};
    }
  },

  // Video Performance
  saveVideoPerformance: async (record: Omit<VideoPostRecord, 'id' | 'userId'> & { id?: string }) => {
    const id = record.id || Math.random().toString(36).substring(2, 9);
    const userId = getUserId();
    const videoRecord: VideoPostRecord = { ...record, id, userId };

    try {
      const saved = localStorage.getItem('ghub_local_videoperf');
      const current: VideoPostRecord[] = saved ? JSON.parse(saved) : [];
      const idx = current.findIndex(v => v.id === id);
      const updated = idx >= 0 ? current.map(v => v.id === id ? videoRecord : v) : [...current, videoRecord];
      localStorage.setItem('ghub_local_videoperf', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving local video performance:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        await setDoc(doc(db, COLLECTIONS.VIDEO_PERFORMANCE, id), { 
          ...videoRecord, 
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore saveVideoPerformance failed:', e);
      }
    }
  },

  getVideoPerformance: async (): Promise<VideoPostRecord[]> => {
    const getLocal = (): VideoPostRecord[] => {
      try {
        const saved = localStorage.getItem('ghub_local_videoperf');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    };

    if (isGuestOrOffline()) {
      return getLocal();
    }

    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.VIDEO_PERFORMANCE),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map(d => ({ ...d.data(), id: d.id } as VideoPostRecord));
      localStorage.setItem('ghub_local_videoperf', JSON.stringify(records));
      return records;
    } catch (e) {
      console.warn('Firestore getVideoPerformance failed:', e);
      return getLocal();
    }
  },

  subscribeVideoPerformance: (callback: (records: VideoPostRecord[]) => void) => {
    storage.getVideoPerformance().then(callback).catch(() => callback([]));

    if (isGuestOrOffline()) {
      return () => {};
    }

    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.VIDEO_PERFORMANCE),
        where('userId', '==', userId)
      );
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as VideoPostRecord));
        callback(data.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
      }, (error) => {
        console.warn('Video performance subscription fallback:', error);
        storage.getVideoPerformance().then(callback);
      });
    } catch (e) {
      console.warn('Error subscribing to video performance:', e);
      return () => {};
    }
  },

  // Accounts
  saveAccount: async (account: Omit<Account, 'id' | 'userId'> & { id?: string }) => {
    const id = account.id || Math.random().toString(36).substring(2, 9);
    const userId = getUserId();
    const accData: Account = { ...account, id, userId };

    try {
      const saved = localStorage.getItem('ghub_accounts_vault_v2');
      let current: Account[] = [];
      if (saved) {
        try {
          current = JSON.parse(decodeURIComponent(window.atob(saved)));
        } catch {
          current = [];
        }
      }
      const idx = current.findIndex(a => a.id === id);
      const updated = idx >= 0 ? current.map(a => a.id === id ? accData : a) : [accData, ...current];
      const encoded = window.btoa(encodeURIComponent(JSON.stringify(updated)));
      localStorage.setItem('ghub_accounts_vault_v2', encoded);
    } catch (e) {
      console.error('Error saving local account:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        await setDoc(doc(db, COLLECTIONS.ACCOUNTS, id), { 
          ...accData, 
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore saveAccount failed:', e);
      }
    }
  },

  getAccounts: async (): Promise<Account[]> => {
    const getLocal = (): Account[] => {
      try {
        const saved = localStorage.getItem('ghub_accounts_vault_v2');
        if (!saved) return [];
        return JSON.parse(decodeURIComponent(window.atob(saved)));
      } catch {
        return [];
      }
    };

    if (isGuestOrOffline()) {
      return getLocal();
    }

    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.ACCOUNTS),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const remoteAccounts = snap.docs.map(d => ({ ...d.data(), id: d.id } as Account));
      return remoteAccounts.length > 0 ? remoteAccounts : getLocal();
    } catch (e) {
      console.warn('Firestore getAccounts failed:', e);
      return getLocal();
    }
  },

  deleteAccount: async (id: string) => {
    try {
      const saved = localStorage.getItem('ghub_accounts_vault_v2');
      if (saved) {
        const current: Account[] = JSON.parse(decodeURIComponent(window.atob(saved)));
        const updated = current.filter(a => a.id !== id);
        const encoded = window.btoa(encodeURIComponent(JSON.stringify(updated)));
        localStorage.setItem('ghub_accounts_vault_v2', encoded);
      }
    } catch (e) {
      console.error('Error deleting account locally:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.ACCOUNTS, id));
      } catch (e) {
        console.warn('Firestore deleteAccount failed:', e);
      }
    }
  },

  // Checklist Helpers
  getDailyChecklist: async (): Promise<DailyChecklistTask[]> => {
    return storage.getChecklist();
  },

  saveDailyChecklist: async (tasks: DailyChecklistTask[]) => {
    try {
      localStorage.setItem('ghub_local_checklist', JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving local checklist:', e);
    }

    if (!isGuestOrOffline()) {
      try {
        const userId = getUserId();
        for (const task of tasks) {
          const id = task.id || Math.random().toString(36).substring(2, 9);
          await setDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, id), {
            ...task,
            id,
            userId,
            updatedAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn('Firestore saveDailyChecklist failed:', e);
      }
    }
  },

  getVideosByAccount: async (accountId: string): Promise<FinanceEntry[]> => {
    const entries = await storage.getFinance();
    return entries.filter(e => e.accountId === accountId);
  },

  subscribeFinance: (callback: (entries: FinanceEntry[]) => void) => {
    storage.getFinance().then(callback).catch(() => callback([]));

    if (isGuestOrOffline()) {
      return () => {};
    }

    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.NOTES),
        where('userId', '==', userId)
      );
      return onSnapshot(q, (snap) => {
        const entries = snap.docs
          .map(d => d.data() as Note)
          .filter(n => n.title.startsWith('[FINANCE_ENTRY]'))
          .map(n => {
            try {
              return JSON.parse(n.content || '{}') as FinanceEntry;
            } catch {
              return null;
            }
          })
          .filter((e): e is FinanceEntry => e !== null)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(entries);
      }, (error) => {
        console.warn('Finance subscription fallback to local:', error);
        storage.getFinance().then(callback);
      });
    } catch (e) {
      console.warn('Error setting up finance subscription:', e);
      return () => {};
    }
  },

  subscribePerformance: (callback: (perf: PerformanceState | null) => void) => {
    storage.getPerformance().then(callback).catch(() => callback(null));

    if (isGuestOrOffline()) {
      return () => {};
    }

    try {
      const userId = getUserId();
      return onSnapshot(doc(db, COLLECTIONS.PERFORMANCE, userId), (snap) => {
        if (snap.exists()) {
          callback(snap.data() as PerformanceState);
        } else {
          storage.getPerformance().then(callback);
        }
      }, (error) => {
        console.warn("Performance snapshot fallback to local:", error);
        storage.getPerformance().then(callback);
      });
    } catch (e) {
      console.warn("Subscribe performance error:", e);
      return () => {};
    }
  },

  // JARVAS METHODS
  getJarvasMessages: async (): Promise<JarvisChatMessage[]> => {
    try {
      const notes = await storage.getNotes();
      const chatNote = notes.find(n => n.title === '[JARVAS_CHAT_LOG]');
      if (chatNote) {
        return JSON.parse(chatNote.content || '[]') as JarvisChatMessage[];
      }
      return [];
    } catch (e) {
      console.error('Error loading Jarvas chat:', e);
      return [];
    }
  },

  saveJarvasMessages: async (messages: JarvisChatMessage[]): Promise<void> => {
    try {
      const noteData: Note = {
        id: 'jarvas_chat_log',
        title: '[JARVAS_CHAT_LOG]',
        content: JSON.stringify(messages),
        createdAt: new Date().toISOString()
      };
      await storage.saveNote(noteData);
    } catch (e) {
      console.error('Error saving Jarvas chat:', e);
    }
  },

  getJarvasFacts: async (): Promise<JarvisFact[]> => {
    try {
      const notes = await storage.getNotes();
      const factsNote = notes.find(n => n.title === '[JARVAS_MEMORY_FACTS]');
      if (factsNote) {
        return JSON.parse(factsNote.content || '[]') as JarvisFact[];
      }
      return [];
    } catch (e) {
      console.error('Error loading Jarvas facts:', e);
      return [];
    }
  },

  saveJarvasFacts: async (facts: JarvisFact[]): Promise<void> => {
    try {
      const noteData: Note = {
        id: 'jarvas_memory_facts',
        title: '[JARVAS_MEMORY_FACTS]',
        content: JSON.stringify(facts),
        createdAt: new Date().toISOString()
      };
      await storage.saveNote(noteData);
    } catch (e) {
      console.error('Error saving Jarvas facts:', e);
    }
  }
};
