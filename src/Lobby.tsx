import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc, setDoc, writeBatch, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useGame } from './GameContext';
import { Room, PlayerState, Scenario, Invite, UserProfile } from './types';
import { createDeck, INITIAL_SCORE } from './gameLogic';
import { Beer, Users, Plus, Play, LogOut, TreePine, Waves, Home, Flame, UserPlus, Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FriendsList } from './components/FriendsList';
import { Store } from './components/Store';
import { ShoppingBag } from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';

export const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useGame();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('bar');
  const [gameMode, setGameMode] = useState<'pife' | 'cacheta'>('cacheta');
  const [curingaMode, setCuringaMode] = useState<'original' | 'all'>('original');
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [welcomeFriend, setWelcomeFriend] = useState<UserProfile | null>(null);
  const [showRanking, setShowRanking] = useState(false);
  const [rankings, setRankings] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!showRanking) return;
    const fetchRanking = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('matchesWon', 'desc'), limit(10));
        const snap = await getDocs(q);
        setRankings(snap.docs.map(d => d.data() as UserProfile));
      } catch (err) {
        console.error("Erro ao buscar ranking:", err);
      }
    };
    fetchRanking();
  }, [showRanking]);

  const myRoom = rooms.find(r => r.creatorId === user?.uid);

  useEffect(() => {
    if (location.state?.welcomeFriend) {
      setWelcomeFriend(location.state.welcomeFriend as UserProfile);
      // Clear state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('status', '==', 'waiting'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(roomsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });
    return () => unsubscribe();
  }, []);

  const createRoom = async () => {
    if (!user || !profile || creating) return;
    setCreating(true);
    try {
      const playerIds = [user.uid];
      const playerNames = [profile.displayName];
      const playerPhotos = [profile.photoURL || ''];
      const playerScores: { [uid: string]: number } = { [user.uid]: INITIAL_SCORE };

      const roomData: Partial<Room> = {
        name: `Mesa do ${profile.displayName}`,
        status: 'waiting',
        scenario: selectedScenario,
        gameMode: gameMode,
        curingaMode: curingaMode,
        betAmount: 100,
        maxPlayers: 4,
        playerIds,
        playerNames,
        playerPhotos,
        playerScores,
        currentTurnIndex: 0,
        deck: [],
        discardPile: [],
        winnerId: null,
        isBotGame: false,
        creatorId: user.uid,
        pendingRequests: [],
        createdAt: serverTimestamp(),
        lastActionAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      
      // Create initial player state
      await setDoc(doc(db, `rooms/${docRef.id}/playerStates`, user.uid), {
        userId: user.uid,
        hand: [],
        isReady: false
      });

      navigate(`/room/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    } finally {
      setCreating(false);
    }
  };

  const requestToJoin = async (room: Room) => {
    if (!user || !profile) return;
    if (room.playerIds.includes(user.uid)) {
      navigate(`/room/${room.id}`);
      return;
    }
    if (room.playerIds.length >= room.maxPlayers) return;

    // Check if already requested
    if (room.pendingRequests?.some(r => r.uid === user.uid)) {
      return;
    }

    try {
      const newRequest = {
        uid: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        status: 'pending'
      };
      await updateDoc(doc(db, 'rooms', room.id), {
        pendingRequests: arrayUnion(newRequest),
        lastActionAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const joinRoom = async (room: Room) => {
    if (!user || !profile) return;
    try {
      const newScores = { ...room.playerScores, [user.uid]: INITIAL_SCORE };
      await updateDoc(doc(db, 'rooms', room.id), {
        playerIds: arrayUnion(user.uid),
        playerNames: arrayUnion(profile.displayName),
        playerPhotos: arrayUnion(profile.photoURL || ''),
        playerScores: newScores,
        lastActionAt: serverTimestamp(),
      });

      await setDoc(doc(db, `rooms/${room.id}/playerStates`, user.uid), {
        userId: user.uid,
        hand: [],
        isReady: false
      });

      navigate(`/room/${room.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const playerStatesSnap = await getDocs(collection(db, `rooms/${roomId}/playerStates`));
      playerStatesSnap.forEach(docSnap => batch.delete(docSnap.ref));
      batch.delete(doc(db, 'rooms', roomId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${roomId}`);
    }
  };

  const handleRequest = async (room: Room, requestId: string, approve: boolean) => {
    if (!user || room.creatorId !== user.uid) return;

    const request = room.pendingRequests?.find(r => r.uid === requestId);
    if (!request) return;

    try {
      const updatedRequests = room.pendingRequests?.filter(r => r.uid !== requestId) || [];
      
      if (approve) {
        const newScores = { ...room.playerScores, [requestId]: INITIAL_SCORE };
        await updateDoc(doc(db, 'rooms', room.id), {
          playerIds: arrayUnion(requestId),
          playerNames: arrayUnion(request.displayName),
          playerPhotos: arrayUnion(request.photoURL || ''),
          playerScores: newScores,
          pendingRequests: updatedRequests,
          lastActionAt: serverTimestamp(),
        });

        await setDoc(doc(db, `rooms/${room.id}/playerStates`, requestId), {
          userId: requestId,
          hand: [],
          isReady: false
        });
      } else {
        await updateDoc(doc(db, 'rooms', room.id), {
          pendingRequests: updatedRequests,
          lastActionAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Removed auto-join useEffect to give user control

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <Beer className="w-10 h-10 text-amber-500" />
          <h1 className="text-4xl font-bold tracking-tight text-white italic font-serif">Cacheta dos Amigos</h1>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
          <button 
            onClick={() => setIsStoreOpen(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
          >
            <ShoppingBag className="w-5 h-5" />
            Loja
          </button>
          <img src={profile?.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-amber-500" referrerPolicy="no-referrer" />
          <div>
            <p className="text-sm font-medium text-white">{profile?.displayName}</p>
            <p className="text-xs text-amber-500 font-mono">Fichas: {profile?.coins}</p>
          </div>
        </div>
      </header>

      <Store isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Modo de Jogo</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button
                    onClick={() => setGameMode('cacheta')}
                    className={`p-3 rounded-2xl font-bold uppercase text-xs sm:text-sm transition-all border ${gameMode === 'cacheta' ? 'bg-amber-500 border-amber-400 text-white shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                  >
                    Cacheta (Pontos)
                  </button>
                  <button
                    onClick={() => setGameMode('pife')}
                    className={`p-3 rounded-2xl font-bold uppercase text-xs sm:text-sm transition-all border ${gameMode === 'pife' ? 'bg-amber-500 border-amber-400 text-white shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                  >
                    Pife (1 Rodada)
                  </button>
                </div>

                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Escolha o Cenário</h2>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'bar', icon: Beer, label: 'Bar' },
                    { id: 'churrasco', icon: Flame, label: 'Churras' },
                    { id: 'praia', icon: Waves, label: 'Praia' },
                    { id: 'sitio', icon: TreePine, label: 'Sítio' },
                    { id: 'quintal', icon: Home, label: 'Quintal' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedScenario(s.id as Scenario)}
                      className={`flex flex-col items-center p-3 rounded-2xl transition-all border ${selectedScenario === s.id ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                    >
                      <s.icon className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold uppercase">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => createRoom()}
                  disabled={creating}
                  className="flex flex-col items-center justify-center p-6 bg-amber-600 hover:bg-amber-500 text-white rounded-3xl transition-colors border-4 border-amber-700/50 shadow-xl group"
                >
                  <Plus className="w-8 h-8 mb-2 group-hover:rotate-90 transition-transform" />
                  <span className="text-sm font-bold uppercase tracking-widest">Nova Mesa</span>
                </motion.button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-5 h-5" /> Mesas Disponíveis
              </h2>
              {rooms.length === 0 ? (
                <div className="p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/20">
                  <p className="text-white/40 italic">Nenhuma mesa aberta no momento...</p>
                </div>
              ) : (
                rooms.map(room => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex justify-between items-center group transition-all"
                  >
                    <div>
                      <h3 className="text-white font-bold text-lg">{room.name}</h3>
                      <p className="text-white/40 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" /> {room.playerIds.length}/{room.maxPlayers} Jogadores
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {room.playerIds.includes(user?.uid || '') ? (
                        <button 
                          onClick={() => navigate(`/room/${room.id}`)}
                          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
                        >
                          Voltar para Mesa
                        </button>
                      ) : room.pendingRequests?.some(r => r.uid === user?.uid) ? (
                        <span className="px-4 py-2 bg-white/10 text-white/40 rounded-xl text-sm italic">
                          Aguardando aprovação...
                        </span>
                      ) : (
                        <button 
                          onClick={() => requestToJoin(room)}
                          className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
                        >
                          Pedir para Entrar
                        </button>
                      )}

                      {room.creatorId === user?.uid && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                          className="p-2 text-red-500/40 hover:text-red-500 transition-colors mb-2"
                          title="Excluir Mesa"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                      
                      {room.creatorId === user?.uid && room.pendingRequests && room.pendingRequests.length > 0 && (
                        <div className="flex flex-col gap-1 mb-2">
                          <p className="text-[10px] text-amber-500 font-bold uppercase text-right">Solicitações:</p>
                          {room.pendingRequests.map(req => (
                            <div key={req.uid} className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                              <img src={req.photoURL || ''} alt="" className="w-6 h-6 rounded-full" />
                              <span className="text-[10px] text-white/60 truncate max-w-[60px]">{req.displayName}</span>
                              <div className="flex gap-1">
                                <button onClick={() => handleRequest(room, req.uid, true)} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleRequest(room, req.uid, false)} className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors">
                                  <LogOut className="w-3 h-3 rotate-180" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <FriendsList 
            currentRoomId={myRoom?.id} 
            currentRoomName={myRoom?.name} 
          />
        </div>
      </div>

      {/* AdSense Unit */}
      <div className="w-full mt-12 mb-8 bg-black/40 backdrop-blur-sm border border-white/10 rounded-[2rem] p-4 flex flex-col items-center justify-center overflow-hidden min-h-[120px] shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-50 pointer-events-none transition-opacity group-hover:opacity-70"></div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2 z-10">Publicidade</p>
        <div className="w-full flex justify-center z-10">
          <ins className="adsbygoogle"
               style={{ display: 'block', width: '100%', maxWidth: '728px', height: '90px' }}
               data-ad-client="ca-pub-3602701444744839"
               data-ad-slot=""
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>
      </div>

      <AnimatePresence>
        {welcomeFriend && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-stone-900 border border-amber-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl shadow-amber-500/10 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent opacity-50 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="mx-auto w-24 h-24 mb-6 relative">
                  <img src={welcomeFriend.photoURL || ''} alt={welcomeFriend.displayName} className="w-full h-full rounded-full border-4 border-amber-500 object-cover" />
                  <div className="absolute -bottom-2 -right-2 bg-amber-500 text-stone-900 p-1.5 rounded-full border-2 border-stone-900">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-white italic font-serif tracking-tight mb-2">Bem-vindo ao Boteco!</h2>
                <p className="text-white/60 mb-8 text-sm leading-relaxed">
                  Você aceitou o convite de <strong className="text-amber-500">{welcomeFriend.displayName}</strong>. Agora vocês são amigos no jogo e podem jogar juntos!
                </p>
                
                <button 
                  onClick={() => setWelcomeFriend(null)}
                  className="w-full py-4 bg-amber-500 text-stone-900 font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-amber-400 transition-colors shadow-lg"
                >
                  Bora Jogar!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
