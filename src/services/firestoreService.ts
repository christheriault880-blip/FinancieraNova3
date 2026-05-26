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
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Transaction, SavingGoal, UserProfile, Category, InventoryItem } from '../types';

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

