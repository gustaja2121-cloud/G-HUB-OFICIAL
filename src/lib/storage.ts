import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  getDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError } from './firebase';
import { 
  Note, 
  PerformanceState, 
  DailyChecklistTask, 
  FinanceEntry,
  ClipLog,
  VideoPostRecord,
  Account
} from '../types';

const COLLECTIONS = {
  NOTES: 'notes',
  PERFORMANCE: 'users',
  DAILY_CHECKLIST: 'dailyChecklist',
  FINANCE: 'finance',
  CLIPS: 'clips',
  VIDEO_PERFORMANCE: 'videoPerformance',
  ACCOUNTS: 'accounts',
  CLIP_LINKS: 'clipLinks',
};

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthenticated');
  return user.uid;
};

const LOCAL_STORAGE_KEY = 'ghub_backup_data';

const getBackup = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveBackup = (section: string, data: any) => {
  try {
    const backup = getBackup();
    backup[section] = data;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(backup));
  } catch (e) {
    console.error('Backup failure:', e);
  }
};

export const storage = {
  // Notes
  getNotes: async (): Promise<Note[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.NOTES), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Note));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.NOTES);
    }
  },
  saveNote: async (note: Note) => {
    try {
      const userId = getUserId();
      await setDoc(doc(db, COLLECTIONS.NOTES, note.id), { 
        ...note, 
        userId,
        updatedAt: serverTimestamp()
      });
      await storage.addXP(10);
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.NOTES);
    }
  },
  deleteNote: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.NOTES, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.NOTES);
    }
  },

  // Daily Checklist
  getDailyChecklist: async (): Promise<DailyChecklistTask[]> => {
    try {
      const userId = getUserId();
      const q = query(collection(db, COLLECTIONS.DAILY_CHECKLIST), where('userId', '==', userId));
      const snap = await getDocs(q);
      
      let tasks = snap.docs.map(d => ({ ...d.data(), id: d.id } as DailyChecklistTask));
      
      if (tasks.length === 0) {
        tasks = [
          { id: '1', title: 'Postar vídeo', completed: false, type: 'post' },
          { id: '2', title: 'Editar vídeo', completed: false, type: 'edit' },
          { id: '3', title: 'Criar ideia', completed: false, type: 'idea' },
        ];
        // Save initial tasks
        for (const t of tasks) {
          await setDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, t.id), { ...t, userId });
        }
      }

      // Check for daily reset
      const perf = await storage.getPerformance();
      const today = new Date().toDateString();
      if (perf.lastResetDate !== today) {
        const resetTasks = tasks.map(t => ({ ...t, completed: false }));
        for (const t of resetTasks) {
          await setDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, t.id), { ...t, userId });
        }
        perf.lastResetDate = today;
        await storage.savePerformance(perf);
        return resetTasks;
      }
      
      return tasks;
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.DAILY_CHECKLIST);
    }
  },
  saveDailyChecklist: async (tasks: DailyChecklistTask[]) => {
    try {
      const userId = getUserId();
      for (const t of tasks) {
        await setDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, t.id), { 
          ...t, 
          userId,
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.DAILY_CHECKLIST);
    }
  },

  // Finance
  getFinance: async (): Promise<FinanceEntry[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.FINANCE), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as FinanceEntry));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.FINANCE);
    }
  },
  saveFinance: async (entry: FinanceEntry) => {
    try {
      const userId = getUserId();
      await setDoc(doc(db, COLLECTIONS.FINANCE, entry.id), { 
        ...entry, 
        userId,
        updatedAt: serverTimestamp()
      });
      await storage.addXP(25);
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.FINANCE);
    }
  },
  deleteFinance: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.FINANCE, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.FINANCE);
    }
  },

  // Performance
  getPerformance: async (): Promise<PerformanceState> => {
    try {
      const userId = getUserId();
      const docRef = doc(db, COLLECTIONS.PERFORMANCE, userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as PerformanceState;
      
      const initial: PerformanceState = {
        streak: 0,
        lastActiveDate: new Date().toISOString(),
        totalVideosCreated: 0,
        totalVideosPosted: 0,
        xp: 0,
        level: 1,
        lastResetDate: new Date().toDateString()
      };
      return initial;
    } catch (e) {
      return handleFirestoreError(e, 'get', COLLECTIONS.PERFORMANCE);
    }
  },
  savePerformance: async (perf: PerformanceState) => {
    try {
      const userId = getUserId();
      await setDoc(doc(db, COLLECTIONS.PERFORMANCE, userId), { 
        ...perf, 
        userId,
        updatedAt: serverTimestamp() 
      });
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.PERFORMANCE);
    }
  },
  addXP: async (amount: number) => {
    try {
      const perf = await storage.getPerformance();
      perf.xp += amount;
      const nextLevelXp = perf.level * 1000;
      if (perf.xp >= nextLevelXp) {
        perf.level += 1;
        perf.xp -= nextLevelXp;
      }
      await storage.savePerformance(perf);
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.PERFORMANCE);
    }
  },

  // Clips
  getClips: async (): Promise<ClipLog[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.CLIPS), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ClipLog));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.CLIPS);
    }
  },
  saveClip: async (clip: ClipLog) => {
    try {
      const userId = getUserId();
      await setDoc(doc(db, COLLECTIONS.CLIPS, clip.id), { 
        ...clip, 
        userId,
        updatedAt: serverTimestamp() 
      });
      await storage.addXP(5);
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.CLIPS);
    }
  },
  
  // Video Performance
  getVideoPerformance: async (): Promise<VideoPostRecord[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.VIDEO_PERFORMANCE), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as VideoPostRecord));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.VIDEO_PERFORMANCE);
    }
  },
  saveVideoPerformance: async (record: Omit<VideoPostRecord, 'id' | 'userId'> & { id?: string }) => {
    try {
      const userId = getUserId();
      const id = record.id || Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTIONS.VIDEO_PERFORMANCE, id), { 
        ...record, 
        id,
        userId,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.VIDEO_PERFORMANCE);
    }
  },
  subscribeVideoPerformance: (callback: (records: VideoPostRecord[]) => void) => {
    const q = query(collection(db, COLLECTIONS.VIDEO_PERFORMANCE), where('userId', '==', getUserId()));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as VideoPostRecord)));
    });
  },
  deleteClip: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CLIPS, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.CLIPS);
    }
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.ACCOUNTS), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Account));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.ACCOUNTS);
    }
  },
  saveAccount: async (account: Account) => {
    try {
      const userId = getUserId();
      await setDoc(doc(db, COLLECTIONS.ACCOUNTS, account.id), { 
        ...account, 
        userId,
        updatedAt: serverTimestamp() 
      });
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.ACCOUNTS);
    }
  },
  deleteAccount: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ACCOUNTS, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.ACCOUNTS);
    }
  },
  subscribeAccounts: (callback: (accounts: Account[]) => void) => {
    const q = query(collection(db, COLLECTIONS.ACCOUNTS), where('userId', '==', getUserId()));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Account)));
    });
  },

  // Listeners
  subscribeFinance: (callback: (entries: FinanceEntry[]) => void) => {
    const q = query(collection(db, COLLECTIONS.FINANCE), where('userId', '==', getUserId()));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as FinanceEntry)));
    });
  },
  subscribePerformance: (callback: (perf: PerformanceState) => void) => {
    const userId = getUserId();
    return onSnapshot(doc(db, COLLECTIONS.PERFORMANCE, userId), (snap) => {
      if (snap.exists()) callback(snap.data() as PerformanceState);
    });
  },
  subscribeClips: (callback: (clips: ClipLog[]) => void) => {
    const q = query(collection(db, COLLECTIONS.CLIPS), where('userId', '==', getUserId()));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ClipLog)));
    });
  },

  // Clip Links
  getClipLinks: async (): Promise<ClipLink[]> => {
    try {
      const q = query(collection(db, COLLECTIONS.CLIP_LINKS), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ClipLink));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.CLIP_LINKS);
    }
  },
  saveClipLink: async (link: ClipLink) => {
    try {
      const userId = getUserId();
      await setDoc(doc(db, COLLECTIONS.CLIP_LINKS, link.id), { 
        ...link, 
        userId,
        updatedAt: serverTimestamp() 
      });
      await storage.addXP(15);
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.CLIP_LINKS);
    }
  },
  deleteClipLink: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CLIP_LINKS, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.CLIP_LINKS);
    }
  },
  subscribeClipLinks: (callback: (links: ClipLink[]) => void) => {
    const q = query(collection(db, COLLECTIONS.CLIP_LINKS), where('userId', '==', getUserId()));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as ClipLink)));
    });
  },
};
