import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Transaction, SavingGoal, UserProfile, Category, InventoryItem, DailySalesSummary } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export const subscribeToUserProfile = (userId: string, callback: (profile: UserProfile | null) => void) => {
  const path = `users/${userId}`;
  return onSnapshot(doc(db, path), (snapshot) => {
    if (snapshot.exists()) {
      callback({ ...snapshot.data(), uid: snapshot.id } as UserProfile);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const createUserProfile = async (profile: UserProfile) => {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, path), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Transactions
export const subscribeToTransactions = (userId: string, callback: (transactions: Transaction[]) => void) => {
  const path = `users/${userId}/transactions`;
  const q = query(collection(db, path), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
    callback(transactions);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addTransaction = async (userId: string, transaction: Omit<Transaction, 'id'>) => {
  const path = `users/${userId}/transactions`;
  try {
    await addDoc(collection(db, path), { ...transaction, uid: userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Goals
export const subscribeToGoals = (userId: string, callback: (goals: SavingGoal[]) => void) => {
  const path = `users/${userId}/goals`;
  return onSnapshot(collection(db, path), (snapshot) => {
    const goals = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SavingGoal));
    callback(goals);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addGoal = async (userId: string, goal: Omit<SavingGoal, 'id'>) => {
  const path = `users/${userId}/goals`;
  try {
    await addDoc(collection(db, path), { ...goal, uid: userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateGoalAmount = async (userId: string, goalId: string, newAmount: number) => {
  const path = `users/${userId}/goals/${goalId}`;
  try {
    await updateDoc(doc(db, path), { currentAmount: newAmount });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteGoal = async (userId: string, goalId: string) => {
  const path = `users/${userId}/goals/${goalId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Inventory
export const subscribeToInventory = (userId: string, callback: (items: InventoryItem[]) => void) => {
  const path = `users/${userId}/inventory`;
  return onSnapshot(collection(db, path), (snapshot) => {
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addInventoryItem = async (userId: string, item: Omit<InventoryItem, 'id'>) => {
  const path = `users/${userId}/inventory`;
  try {
    await addDoc(collection(db, path), { ...item, uid: userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteInventoryItem = async (userId: string, itemId: string) => {
  const path = `users/${userId}/inventory/${itemId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateInventoryItemNotes = async (userId: string, itemId: string, notes: string) => {
  const path = `users/${userId}/inventory/${itemId}`;
  try {
    await updateDoc(doc(db, path), { notes });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateInventoryItem = async (userId: string, itemId: string, updates: Partial<InventoryItem>) => {
  const path = `users/${userId}/inventory/${itemId}`;
  try {
    await updateDoc(doc(db, path), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Daily Sales Summaries History
export const subscribeToDailySummaries = (userId: string, callback: (summaries: DailySalesSummary[]) => void) => {
  const path = `users/${userId}/daily_summaries`;
  return onSnapshot(collection(db, path), (snapshot) => {
    const summaries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DailySalesSummary));
    callback(summaries);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addDailySummary = async (userId: string, summary: Omit<DailySalesSummary, 'id'>) => {
  const path = `users/${userId}/daily_summaries`;
  try {
    const docRef = await addDoc(collection(db, path), { ...summary, uid: userId });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteDailySummary = async (userId: string, summaryId: string) => {
  const path = `users/${userId}/daily_summaries/${summaryId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};


// System Settings & Credentials Configuration (EmailJS & Gemini API Key)
export const getSystemSettings = async (): Promise<any | null> => {
  const path = 'settings/credentials';
  try {
    const docSnap = await getDoc(doc(db, path));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error fetching global credentials from Firestore:', error);
  }
  return null;
};

export const saveSystemSettings = async (settings: { 
  emailjs_service_id?: string;
  emailjs_template_id?: string;
  emailjs_public_key?: string;
  gemini_api_key?: string;
}) => {
  const path = 'settings/credentials';
  try {
    await setDoc(doc(db, path), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// --- SaaS SUBSCRIPTION & PHONE CONTROL SYSTEM HELPERS ---

export const isPhoneRegistered = async (phone: string): Promise<boolean> => {
  const path = `registered_phones/${phone}`;
  try {
    const docSnap = await getDoc(doc(db, path));
    return docSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return false;
  }
};

export const registerUserPhone = async (uid: string, email: string, phone: string): Promise<void> => {
  const phonePath = `registered_phones/${phone}`;
  const userPath = `users/${uid}`;
  try {
    // 1. Lock phone to UID
    await setDoc(doc(db, phonePath), { uid, email });
    
    // 2. Set default subscription dates and details on user profile
    const today = new Date().toISOString().split('T')[0];
    // Give 30 days of standard free trial / subscription start
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await updateDoc(doc(db, userPath), {
      phone: phone,
      subscriptionStart: today,
      subscriptionEnd: expiryDate,
      subscriptionStatus: 'activa'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${phonePath} or ${userPath}`);
  }
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  const path = 'users';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const users: UserProfile[] = [];
    querySnapshot.forEach((d) => {
      users.push({ ...d.data(), uid: d.id } as UserProfile);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateUserProfileByAdmin = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, path), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const releaseRegisteredPhone = async (phone: string): Promise<void> => {
  const path = `registered_phones/${phone}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

