import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { UserProfile, Transaction, SavingGoal } from './types';
import { subscribeToUserProfile, createUserProfile, subscribeToTransactions, subscribeToGoals } from './services/firestoreService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  transactions: Transaction[];
  goals: SavingGoal[];
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  const isAdmin = user?.email === 'christheriault880@gmail.com';

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;
    let unsubscribeGoals: (() => void) | null = null;

    const cleanupSubscriptions = () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
        unsubscribeTransactions = null;
      }
      if (unsubscribeGoals) {
        unsubscribeGoals();
        unsubscribeGoals = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupSubscriptions();
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Subscribe to profile
        unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, async (p) => {
          if (!p) {
            // Create initial profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Usuario',
              email: firebaseUser.email || '',
              monthlyBudget: 2000,
              autoSaveEnabled: true,
              roundUpEnabled: true
            };
            await createUserProfile(newProfile);
          } else {
            setProfile(p);
          }
        });

        // Subscribe to transactions
        unsubscribeTransactions = subscribeToTransactions(firebaseUser.uid, (txs) => {
          setTransactions(txs);
        });

        // Subscribe to goals
        unsubscribeGoals = subscribeToGoals(firebaseUser.uid, (gs) => {
          setGoals(gs);
        });

        setLoading(false);
      } else {
        setProfile(null);
        setTransactions([]);
        setGoals([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupSubscriptions();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, transactions, goals, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
