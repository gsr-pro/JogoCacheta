import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, or, and } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useGame } from '../GameContext';
import { UserProfile, FriendRequest, Friendship, Invite } from '../types';
import { UserPlus, UserCheck, UserX, Search, MessageCircle, Circle, Play, Send, Link as LinkIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useNavigate } from 'react-router-dom';

export const FriendsList: React.FC<{ currentRoomId?: string, currentRoomName?: string }> = ({ currentRoomId, currentRoomName }) => {
  const navigate = useNavigate();
  const { user, profile } = useGame();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/invite/${user.uid}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!user) return;

    // Listen to friendships
    const qFriendships = query(collection(db, 'friendships'), where('uids', 'array-contains', user.uid));
    const unsubscribeFriendships = onSnapshot(qFriendships, async (snapshot) => {
      const friendIds = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as Friendship;
        return data.uids.find(id => id !== user.uid);
      }).filter(Boolean) as string[];

      if (friendIds.length > 0) {
        // Fetch friend profiles
        const qProfiles = query(collection(db, 'users'), where('uid', 'in', friendIds));
        const unsubscribeProfiles = onSnapshot(qProfiles, (snap) => {
          const profiles = snap.docs.map(d => d.data() as UserProfile);
          setFriends(profiles);
        });
        return () => unsubscribeProfiles();
      } else {
        setFriends([]);
      }
    });

    // Listen to pending requests
    const qRequests = query(collection(db, 'friendRequests'), 
      where('toId', '==', user.uid), 
      where('status', '==', 'pending')
    );
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      const requests = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FriendRequest));
      setPendingRequests(requests);
    });

    // Listen to invites
    const qInvites = query(collection(db, 'invites'), 
      where('toId', '==', user.uid), 
      where('status', '==', 'pending')
    );
    const unsubscribeInvites = onSnapshot(qInvites, (snapshot) => {
      const invites = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Invite));
      setReceivedInvites(invites);
    });

    return () => {
      unsubscribeFriendships();
      unsubscribeRequests();
      unsubscribeInvites();
    };
  }, [user?.uid]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const lowerQuery = searchQuery.toLowerCase();
      const results = snap.docs
        .map(d => d.data() as UserProfile)
        .filter(p => p.uid !== user.uid && p.displayName && p.displayName.toLowerCase().includes(lowerQuery))
        .slice(0, 10);
      setSearchResults(results);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUser: UserProfile) => {
    if (!user || !profile) return;
    try {
      if (friends.some(f => f.uid === targetUser.uid)) return;

      await addDoc(collection(db, 'friendRequests'), {
        fromId: user.uid,
        fromName: profile.displayName,
        fromPhoto: profile.photoURL,
        toId: targetUser.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('Pedido de amizade enviado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'friendRequests');
    }
  };

  const respondToRequest = async (request: FriendRequest, accept: boolean) => {
    try {
      if (accept) {
        await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' });
        await addDoc(collection(db, 'friendships'), {
          uids: [request.fromId, request.toId],
          createdAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'friendRequests', request.id), { status: 'rejected' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `friendRequests/${request.id}`);
    }
  };

  const sendInvite = async (friend: UserProfile) => {
    if (!user || !profile || !currentRoomId || !currentRoomName) {
      alert('Crie ou entre em uma mesa primeiro para convidar amigos!');
      return;
    }
    try {
      await addDoc(collection(db, 'invites'), {
        fromId: user.uid,
        fromName: profile.displayName,
        toId: friend.uid,
        roomId: currentRoomId,
        roomName: currentRoomName,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert(`Convite enviado para ${friend.displayName}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invites');
    }
  };

  const respondToInvite = async (invite: Invite, accept: boolean) => {
    try {
      if (accept) {
        await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' });
        navigate(`/room/${invite.roomId}`);
      } else {
        await updateDoc(doc(db, 'invites', invite.id), { status: 'rejected' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invites/${invite.id}`);
    }
  };

  const isOnline = (lastSeen: any) => {
    if (!lastSeen) return false;
    const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    return (now.getTime() - lastSeenDate.getTime()) < 5 * 60 * 1000; // 5 minutes
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-amber-500" /> Amigos
        </h2>
        <button 
          onClick={copyInviteLink}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-full transition-all text-xs font-bold border border-amber-500/20"
          title="Copiar link para convidar amigos"
        >
          {copied ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
          {copied ? 'Copiado!' : 'Convidar'}
        </button>
      </div>

      {/* Search */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar jogadores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Resultados</p>
            {searchResults.map(res => (
              <div key={res.uid} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <img src={res.photoURL || ''} alt="" className="w-8 h-8 rounded-full" />
                  <span className="text-sm text-white">{res.displayName}</span>
                </div>
                <button
                  onClick={() => sendFriendRequest(res)}
                  className="p-2 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => setSearchResults([])} className="text-[10px] text-white/40 hover:text-white underline w-full text-center">Limpar Busca</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Solicitações de Amizade</p>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <div className="flex items-center gap-2">
                <img src={req.fromPhoto || ''} alt="" className="w-8 h-8 rounded-full" />
                <span className="text-sm text-white">{req.fromName}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => respondToRequest(req, true)} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-400 transition-colors">
                  <UserCheck className="w-4 h-4" />
                </button>
                <button onClick={() => respondToRequest(req, false)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors">
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Received Invites */}
      {receivedInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Convites para Jogar</p>
          {receivedInvites.map(inv => (
            <div key={inv.id} className="flex flex-col gap-2 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white"><b>{inv.fromName}</b> te convidou para <b>{inv.roomName}</b></span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => respondToInvite(inv, true)} className="flex-1 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors text-xs font-bold">
                  Aceitar
                </button>
                <button onClick={() => respondToInvite(inv, false)} className="px-3 py-1 bg-white/10 text-white/40 rounded-lg hover:bg-white/20 transition-colors text-xs">
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Seus Amigos</p>
        {friends.length === 0 ? (
          <p className="text-xs text-white/20 italic text-center py-8">Você ainda não tem amigos adicionados.</p>
        ) : (
          friends.map(friend => {
            const online = isOnline(friend.lastSeen);
            return (
              <div key={friend.uid} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={friend.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-stone-900 ${online ? 'bg-green-500' : 'bg-stone-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{friend.displayName}</p>
                    <p className={`text-[10px] uppercase tracking-widest font-bold ${online ? 'text-green-500' : 'text-white/20'}`}>
                      {online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {online && currentRoomId && (
                    <button 
                      onClick={() => sendInvite(friend)}
                      className="p-2 text-white/40 hover:text-amber-500 transition-colors" 
                      title="Convidar para sua mesa"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
