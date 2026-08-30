import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { PerformanceState } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginGuest: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ghub_guest_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        localStorage.removeItem('ghub_guest_user');
      }
      setLoading(false);
      
      if (u) {
        // Ensure user document exists
        const userDocRef = doc(db, 'users', u.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const initialPerf: PerformanceState = {
            streak: 0,
            lastActiveDate: new Date().toISOString(),
            totalVideosCreated: 0,
            totalVideosPosted: 0,
            xp: 0,
            level: 1,
            lastResetDate: new Date().toDateString()
          };
          await setDoc(userDocRef, { ...initialPerf, userId: u.uid });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginGuest = () => {
    const guestUser = {
      uid: 'guest-local-user',
      email: 'criador@g-hub.com',
      displayName: 'Criador G-HUB',
      emailVerified: true,
      isAnonymous: false,
    } as unknown as User;
    setUser(guestUser);
    localStorage.setItem('ghub_guest_user', JSON.stringify(guestUser));
  };

  const logout = async () => {
    localStorage.removeItem('ghub_guest_user');
    setUser(null);
    await signOut(auth).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
