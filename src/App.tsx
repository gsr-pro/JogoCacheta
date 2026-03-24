import React from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { useGame } from './GameContext';
import { Lobby } from './Lobby';
import { GameRoom } from './GameRoom';
import { Beer, LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Invite } from './types';
import { BannerAd } from './components/BannerAd';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const { user, profile, loading, logout } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Check for accepted invites to join a room
    if (!user) return;
    const q = query(collection(db, 'invites'), 
      where('toId', '==', user.uid), 
      where('status', '==', 'accepted')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(async (docSnap) => {
        const invite = docSnap.data() as Invite;
        // Join the room
        if (invite.status === 'accepted') {
          navigate(`/room/${invite.roomId}`);
          // Delete the invite after joining
          await deleteDoc(doc(db, 'invites', docSnap.id));
        }
      });
    });
    return () => unsubscribe();
  }, [user?.uid, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <p className="text-white/60 font-serif italic text-lg">Entrando no bar...</p>
      </div>
    );
  }

  const isRoomPage = location.pathname.startsWith('/room/');
  const hasPremium = profile?.premiumUntil && new Date(profile.premiumUntil) > new Date();
  const showAds = user && profile && !hasPremium;

  return (
    <div className={`min-h-screen bg-stone-950 text-white selection:bg-amber-500/30 ${showAds ? 'pb-16' : ''}`}>
      {/* Global Atmosphere */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#3a1510_0%,_transparent_50%)] opacity-20 pointer-events-none"></div>
      
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route 
              path="/" 
              element={
                <RequireAuth>
                  <motion.div
                    key="lobby"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <ErrorBoundary>
                      <Lobby />
                    </ErrorBoundary>
                  </motion.div>
                </RequireAuth>
              } 
            />
            <Route 
              path="/room/:roomId" 
              element={
                <RequireAuth>
                  <motion.div
                    key="game"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="w-full"
                  >
                    <ErrorBoundary>
                      <GameRoomWrapper />
                    </ErrorBoundary>
                  </motion.div>
                </RequireAuth>
              } 
            />
            <Route path="/invite/:friendId" element={<InviteHandler />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      {user && profile && !isRoomPage && (
        <footer className="max-w-4xl mx-auto p-6 mt-12 border-t border-white/5 flex justify-between items-center opacity-40 text-[10px] uppercase tracking-widest font-bold">
          <p>© 2026 Cacheta dos Amigos</p>
          <div className="flex gap-4">
            <button onClick={logout} className="hover:text-amber-500 transition-colors">Sair da Conta</button>
            <span>Versão 1.0.0-Beta</span>
          </div>
        </footer>
      )}

      {showAds && <BannerAd />}
    </div>
  );
}

function LoginScreen() {
  const { login, error } = useGame();
  
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_#3a1510_0%,_transparent_60%),_radial-gradient(circle_at_10%_80%,_#f59e0b_0%,_transparent_50%)] opacity-20 blur-[60px] pointer-events-none"></div>
      
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 max-w-md w-full"
      >
        <div className="mb-12 flex flex-col items-center">
          <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-6">
            <Beer className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-6xl font-black text-white italic font-serif tracking-tighter mb-4">Cacheta dos Amigos</h1>
          <p className="text-amber-500/60 font-mono text-sm uppercase tracking-[0.3em]">Cacheta & Pife Online</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo ao Boteco!</h2>
          <p className="text-white/40 mb-8 text-sm">Entre com sua conta Google para começar a jogar e apostar suas fichas.</p>
          
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-amber-500 hover:text-white transition-all group shadow-xl"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Entrar com Google
          </button>
          
          {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
        </div>

        <div className="mt-12 flex gap-8 justify-center opacity-30 grayscale">
           <img src="https://picsum.photos/seed/beer/100/100" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
           <img src="https://picsum.photos/seed/cards/100/100" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
           <img src="https://picsum.photos/seed/bar/100/100" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
        </div>
      </motion.div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile } = useGame();
  if (!user || !profile) return <LoginScreen />;
  return <>{children}</>;
}

function GameRoomWrapper() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  
  if (!roomId) return <Navigate to="/" replace />;
  
  return <GameRoom roomId={roomId} onLeave={() => navigate('/')} />;
}

function InviteHandler() {
  const { user, profile } = useGame();
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [inviter, setInviter] = React.useState<any>(null);

  React.useEffect(() => {
    if (friendId) {
      getDoc(doc(db, 'users', friendId)).then(snap => {
        if (snap.exists()) setInviter(snap.data());
      });
    }
  }, [friendId]);

  React.useEffect(() => {
    if (!user || !profile || !friendId || friendId === user.uid) {
      if (user && profile && friendId === user.uid) navigate('/', { replace: true });
      return;
    }

    const handleFriendLink = async () => {
      try {
        const inviterSnap = await getDoc(doc(db, 'users', friendId));
        const inviterData = inviterSnap.exists() ? inviterSnap.data() : null;

        const friendshipId = [user.uid, friendId].sort().join('_');
        const friendshipRef = doc(db, 'friendships', friendshipId);
        const friendshipSnap = await getDoc(friendshipRef);
        
        let isNewFriend = false;
        if (!friendshipSnap.exists()) {
          await setDoc(friendshipRef, {
            uids: [user.uid, friendId],
            createdAt: serverTimestamp()
          });
          console.log("Amizade ativada via link!");
          isNewFriend = true;
        }
        
        if (isNewFriend && inviterData) {
          navigate('/', { replace: true, state: { welcomeFriend: inviterData } });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error("Erro ao processar link de amizade:", err);
        navigate('/', { replace: true });
      }
    };

    handleFriendLink();
  }, [user, profile, friendId, navigate]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_#3a1510_0%,_transparent_60%),_radial-gradient(circle_at_10%_80%,_#f59e0b_0%,_transparent_50%)] opacity-20 blur-[60px] pointer-events-none"></div>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 max-w-md w-full">
          {inviter && (
            <div className="mb-8 flex flex-col items-center">
              <img src={inviter.photoURL} className="w-20 h-20 rounded-full border-4 border-amber-500 mb-4 shadow-2xl" />
              <h2 className="text-xl font-bold text-white">Convite de {inviter.displayName}</h2>
              <p className="text-white/40 text-sm">Entre no bar para aceitar este convite!</p>
            </div>
          )}
          <LoginScreen />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center">
      <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
      <p className="text-white/60 font-serif italic text-lg">Processando convite...</p>
    </div>
  );
}
