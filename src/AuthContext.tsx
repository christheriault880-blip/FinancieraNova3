import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { UserProfile, Transaction, SavingGoal } from './types';
import { 
  subscribeToUserProfile, 
  createUserProfile, 
  subscribeToTransactions, 
  subscribeToGoals, 
  updateUserProfileByAdmin,
  subscribeToSystemSettings
} from './services/firestoreService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  transactions: Transaction[];
  goals: SavingGoal[];
  isAdmin: boolean;
  isSaaSAccessGranted: boolean;
  isPhoneMissing: boolean;
  isSubExpired: boolean;
  isSubSuspended: boolean;
  isMaintenanceModeActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [isMaintenanceModeActive, setIsMaintenanceModeActive] = useState(false);

  const isAdmin = user?.email === 'christheriault880@gmail.com';

  const todayStr = new Date().toISOString().split('T')[0];
  const isExpired = profile?.subscriptionEnd ? (profile.subscriptionEnd < todayStr) : false;
  const isSuspended = profile?.subscriptionStatus === 'suspendida';

  const isSaaSAccessGranted = isAdmin || (
    profile ? (
      !!profile.phone && 
      profile.subscriptionStatus === 'activa' && 
      !isExpired && 
      !isSuspended
    ) : false
  );

  const isPhoneMissing = !isAdmin && profile !== null && !profile.phone;
  const isSubExpired = !isAdmin && profile !== null && !!profile.phone && (isExpired || profile.subscriptionStatus === 'vencida');
  const isSubSuspended = !isAdmin && profile !== null && !!profile.phone && (isSuspended || profile.subscriptionStatus === 'suspendida');

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;
    let unsubscribeGoals: (() => void) | null = null;
    let unsubscribeSystemSettings: (() => void) | null = null;

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
      if (unsubscribeSystemSettings) {
        unsubscribeSystemSettings();
        unsubscribeSystemSettings = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupSubscriptions();
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Subscribe to global system settings (under firestore doc systems/credentials)
        unsubscribeSystemSettings = subscribeToSystemSettings((settings) => {
          if (settings && typeof settings.maintenanceMode === 'boolean') {
            setIsMaintenanceModeActive(settings.maintenanceMode);
          } else {
            setIsMaintenanceModeActive(false);
          }
        });

        // Subscribe to profile
        unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, async (p) => {
          try {
            if (!p) {
              // Create initial profile if it doesn't exist
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Usuario',
                email: firebaseUser.email || `${firebaseUser.uid}@temp-financieranova.com`,
                monthlyBudget: 2000,
                autoSaveEnabled: true,
                roundUpEnabled: true
              };
              await createUserProfile(newProfile);
            } else {
              setProfile(p);
              // Auto-expire check: update status to 'vencida' in database if expired
              if (p.subscriptionStatus === 'activa' && p.subscriptionEnd && p.subscriptionEnd < todayStr) {
                updateUserProfileByAdmin(p.uid, { subscriptionStatus: 'vencida' }).catch(console.error);
              }
            }
          } catch (subscriptionErr) {
            console.error("Error setting up or creating user profile snapshot:", subscriptionErr);
            // Non-fatal fallback configuration so app doesn't hang or crash completely
            setProfile({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Usuario',
              email: firebaseUser.email || `${firebaseUser.uid}@temp-financieranova.com`,
              monthlyBudget: 2000,
              autoSaveEnabled: true,
              roundUpEnabled: true
            });
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
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      transactions, 
      goals, 
      isAdmin,
      isSaaSAccessGranted,
      isPhoneMissing,
      isSubExpired,
      isSubSuspended,
      isMaintenanceModeActive
    }}>
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
