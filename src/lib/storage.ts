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
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError } from './firebase';
import { 
  Note, 
  PerformanceState, 
  DailyChecklistTask, 
  FinanceEntry,
  VideoPostRecord,
  Account,
  RankingSimulation
} from '../types';

const COLLECTIONS = {
  NOTES: 'notes',
  PERFORMANCE: 'users',
  DAILY_CHECKLIST: 'dailyChecklist',
  FINANCE: 'finance',
  VIDEO_PERFORMANCE: 'videoPerformance',
  ACCOUNTS: 'accounts',
  RANKINGS: 'rankings',
};

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthenticated');
  return user.uid;
};

export const storage = {
  // Notes
  getNotes: async (): Promise<Note[]> => {
    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.NOTES),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Note));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.NOTES);
    }
  },
  saveNote: async (note: Omit<Note, 'id'> & { id?: string }) => {
    try {
      const userId = getUserId();
      const id = note.id || Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTIONS.NOTES, id), { 
        ...note, 
        id,
        userId,
        updatedAt: serverTimestamp()
      });
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

  // Performance / XP
  getPerformance: async (): Promise<PerformanceState> => {
    try {
      const userId = getUserId();
      const d = await getDoc(doc(db, COLLECTIONS.PERFORMANCE, userId));
      if (d.exists()) return d.data() as PerformanceState;
      
      const initial: PerformanceState = {
        streak: 0,
        lastActiveDate: new Date().toISOString(),
        totalVideosCreated: 0,
        totalVideosPosted: 0,
        xp: 0,
        level: 1,
        userId
      };
      await setDoc(doc(db, COLLECTIONS.PERFORMANCE, userId), initial);
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
      const current = await storage.getPerformance();
      let newXp = current.xp + amount;
      let newLevel = current.level;
      
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
    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.DAILY_CHECKLIST),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as DailyChecklistTask));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.DAILY_CHECKLIST);
    }
  },
  saveChecklistTask: async (task: Omit<DailyChecklistTask, 'id'> & { id?: string }) => {
    try {
      const userId = getUserId();
      const id = task.id || Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, id), { 
        ...task, 
        id,
        userId,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.DAILY_CHECKLIST);
    }
  },
  deleteChecklistTask: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DAILY_CHECKLIST, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.DAILY_CHECKLIST);
    }
  },

  // Finance
  getFinance: async (): Promise<FinanceEntry[]> => {
    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.FINANCE),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as FinanceEntry));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.FINANCE);
    }
  },
  saveFinance: async (entry: Omit<FinanceEntry, 'id'> & { id?: string }) => {
    try {
      const userId = getUserId();
      const id = entry.id || Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTIONS.FINANCE, id), { 
        ...entry, 
        id,
        userId,
        updatedAt: serverTimestamp()
      });
      await storage.addXP(50);
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

  // Rankings
  getRankings: async (): Promise<RankingSimulation[]> => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return [];
      const q = query(
        collection(db, COLLECTIONS.RANKINGS), 
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as RankingSimulation));
      return data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.RANKINGS) as any;
    }
  },
  saveRanking: async (ranking: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Unauthenticated');
      
      await addDoc(collection(db, COLLECTIONS.RANKINGS), { 
        ...ranking, 
        userId,
        createdAt: serverTimestamp()
      });
      await storage.addXP(30);
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.RANKINGS);
    }
  },
  deleteRanking: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.RANKINGS, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.RANKINGS);
    }
  },
  subscribeRankings: (callback: (rankings: RankingSimulation[]) => void) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        callback([]);
        return () => {};
      }
      const q = query(
        collection(db, COLLECTIONS.RANKINGS), 
        where('userId', '==', userId)
      );
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as RankingSimulation));
        callback(data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      }, (error) => {
        console.error("Firestore snapshot error:", error);
        callback([]);
      });
    } catch (e) {
      console.error("Subscribe error:", e);
      callback([]);
      return () => {};
    }
  },

  // Video Performance
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
    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.VIDEO_PERFORMANCE),
        where('userId', '==', userId),
        orderBy('data', 'desc')
      );
      return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as VideoPostRecord)));
      });
    } catch (e) {
      console.error('Error subscribing to video performance:', e);
      callback([]);
      return () => {};
    }
  },

  // Accounts
  saveAccount: async (account: Omit<Account, 'id' | 'userId'> & { id?: string }) => {
    try {
      const userId = getUserId();
      const id = account.id || Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTIONS.ACCOUNTS, id), { 
        ...account, 
        id,
        userId,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, 'write', COLLECTIONS.ACCOUNTS);
    }
  },
  getAccounts: async (): Promise<Account[]> => {
    try {
      const userId = getUserId();
      const q = query(
        collection(db, COLLECTIONS.ACCOUNTS),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Account));
    } catch (e) {
      return handleFirestoreError(e, 'list', COLLECTIONS.ACCOUNTS);
    }
  },
  deleteAccount: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ACCOUNTS, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', COLLECTIONS.ACCOUNTS);
    }
  }
};
