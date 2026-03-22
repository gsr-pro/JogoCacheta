import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, GameState } from './types';

const GameContext = createContext<GameState & { 
  login: () => Promise<void>; 
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
} | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Listen to user profile
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const today = new Date().toISOString().split('T')[0];
            
            if (data.lastDailyClaim !== today) {
              try {
                await setDoc(userRef, {
                  coins: (data.coins || 0) + 1,
                  lastDailyClaim: today,
                  adClaimsToday: 0,
                  lastAdClaimDate: today
                }, { merge: true });
                // The snapshot will fire again with updated data
              } catch (error) {
                console.error("Error claiming daily reward:", error);
                setState(prev => ({ ...prev, user, profile: data, loading: false }));
              }
            } else {
              setState(prev => ({ ...prev, user, profile: data, loading: false }));
            }
          } else {
            // Create new profile
            const today = new Date().toISOString().split('T')[0];
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Jogador',
              photoURL: user.photoURL,
              coins: 10, // Start with 10 fichas
              matchesWon: 0,
              matchesPlayed: 0,
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              lastDailyClaim: today,
              adClaimsToday: 0,
              lastAdClaimDate: today,
              inventory: [],
              equipped: {}
            };
            try {
              await setDoc(userRef, newProfile);
              // We don't need to setState here because the onSnapshot will fire again
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });

        return () => unsubscribeProfile();
      } else {
        setState({ user: null, profile: null, loading: false, error: null });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!state.user) return;

    const updateLastSeen = async () => {
      try {
        await setDoc(doc(db, 'users', state.user!.uid), {
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating lastSeen:', error);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [state.user?.uid]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, error: 'Erro ao fazer login' }));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!state.user) return;
    try {
      await setDoc(doc(db, 'users', state.user.uid), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${state.user.uid}`);
    }
  };

  return (
    <GameContext.Provider value={{ ...state, login, logout, updateProfile }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
