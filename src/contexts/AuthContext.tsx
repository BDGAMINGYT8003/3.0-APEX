import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  xp: number;
  level: number;
  total_xp: number;
  tokens: number;
  market_stock?: { [itemId: string]: number };
  purchase_history: {
    id: string;
    itemName: string;
    amount: number;
    tokensUsed: number;
    timestamp: number;
  }[];
  activity_log?: {
    id: string;
    reason: string;
    amount: number;
    timestamp: number;
  }[];
  lottery: {
    current_tickets: number;
    lifetime_tickets: number;
    wins: { first: number; second: number; third: number };
    joined: number;
  };
  last_message_content: string;
  onboarded: boolean;
  joinedAt: number;
  game_uid?: string;
  isDiscordVerified?: boolean;
  discord_avatar?: string;
  discord_banner?: string;
  discord_username?: string;
  discord_id?: string;
  avatar_preference?: 'discord' | 'google';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();

    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);
      
      if (firebaseUser) {
        // Check for re-registration lock
        if (firebaseUser.email) {
          try {
            const deletedRef = doc(db, 'deleted_accounts', firebaseUser.email);
            const deletedDoc = await getDoc(deletedRef);
            
            if (deletedDoc.exists()) {
              const deletedData = deletedDoc.data();
              const deletedAt = deletedData.deletedAt;
              const now = new Date();
              const deletionDate = new Date(deletedAt);
              
              // Lock until end of next month
              const lockUntil = new Date(deletionDate.getFullYear(), deletionDate.getMonth() + 2, 0);
              
              if (now < lockUntil) {
                await auth.signOut();
                setError(`This email is currently locked due to a recent account deletion. You can re-register after ${lockUntil.toLocaleDateString()}.`);
                setLoading(false);
                return;
              } else {
                // Lock expired, clean up
                await deleteDoc(deletedRef);
              }
            }
          } catch (e) {
            console.error('Error checking deleted accounts:', e);
          }
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial check to create profile if it doesn't exist
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Agent',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              xp: 0,
              level: 1,
              total_xp: 0,
              tokens: 0,
              market_stock: {},
              purchase_history: [],
              lottery: {
                current_tickets: 0,
                lifetime_tickets: 0,
                wins: { first: 0, second: 0, third: 0 },
                joined: 0
              },
              last_message_content: '',
              onboarded: true,
              joinedAt: Date.now(),
              isDiscordVerified: false
            };
            await setDoc(userRef, newProfile);
          } else {
            // Update email if missing
            const data = docSnap.data();
            if (!data.email && firebaseUser.email) {
              await setDoc(userRef, { email: firebaseUser.email }, { merge: true });
            }
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }

        // Listen for real-time updates
        unsubscribeSnapshot = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, isOnline, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
