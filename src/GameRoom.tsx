import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, writeBatch, getDoc, DocumentSnapshot, setDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useGame } from './GameContext';
import { Room, PlayerState, Card, Scenario } from './types';
import { createDeck, shuffle, validateWin, botPlay, PENALTY, INITIAL_SCORE, FOLD_PENALTY } from './gameLogic';
import { Beer, Users, Play, LogOut, RefreshCcw, Trophy, ChevronRight, Hand, Flame, Waves, TreePine, Home, Zap, Skull, Frown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceChat } from './components/VoiceChat';
import { TextChat } from './components/TextChat';

export const GameRoom: React.FC<{ roomId: string; onLeave: () => void }> = ({ roomId, onLeave }) => {
  const { user, profile } = useGame();
  const [room, setRoom] = useState<Room | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [allPlayerStates, setAllPlayerStates] = useState<{ [uid: string]: PlayerState }>({});
  const [loading, setLoading] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Tentar forçar orientação landscape em dispositivos móveis
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribeRoom = onSnapshot(doc(db, 'rooms', roomId), (docSnap: any) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
        setLoading(false);
      } else {
        // Only leave if it's not the initial load or if we're sure it's gone
        if (!loading) {
          onLeave();
        } else {
          // If it's the first load and it doesn't exist, wait a bit
          const stillExists = docSnap.exists();
          const timeout = setTimeout(() => {
            if (!stillExists) onLeave();
          }, 2000);
          return () => clearTimeout(timeout);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    });

    const unsubscribePlayer = onSnapshot(doc(db, `rooms/${roomId}/playerStates`, user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setPlayerState(docSnap.data() as PlayerState);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}/playerStates/${user.uid}`);
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayer();
    };
  }, [roomId, user, onLeave]);

  useEffect(() => {
    if (!room) return;
    const unsubscribe = onSnapshot(collection(db, `rooms/${roomId}/playerStates`), (snapshot) => {
      const states: { [uid: string]: PlayerState } = {};
      snapshot.docs.forEach(docSnap => {
        states[docSnap.id] = docSnap.data() as PlayerState;
      });
      setAllPlayerStates(states);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}/playerStates`);
    });
    return () => unsubscribe();
  }, [roomId, room?.id]);

  const [starting, setStarting] = useState(false);
  const isCreator = room?.creatorId === user?.uid || (!room?.creatorId && room?.playerIds?.[0] === user?.uid);
  const allReady = room?.playerIds ? room.playerIds.every(pid => allPlayerStates[pid]?.isReady) : false;

  const startGame = async () => {
    console.log("Tentando iniciar o jogo...", { roomId, userId: user?.uid, roomCreator: room?.creatorId });
    
    if (!room || !user) {
      console.error("Sala ou Usuário não encontrados");
      return;
    }

    if (!isCreator) {
      console.error("Usuário não é o criador", { creatorId: room.creatorId, userId: user.uid });
      setGameError("Apenas o dono da mesa pode iniciar o jogo.");
      return;
    }

    if (!allReady) {
      setGameError("Aguardando todos os jogadores ficarem prontos.");
      return;
    }

    if (room.playerIds.length < 2) {
      setGameError("Aguardando mais jogadores...");
      return;
    }

    if (starting) return;

    setStarting(true);
    setGameError(null);
    
    try {
      const deckCount = room.playerIds.length >= 7 ? 3 : 2; const deck = createDeck(deckCount);
      const batch = writeBatch(db);

      // Distribuir cartas
      if (!room.playerIds || room.playerIds.length === 0) {
        throw new Error("Nenhum jogador na mesa.");
      }

      for (const uid of room.playerIds) {
        const hand = deck.splice(0, 9);
        const playerStateRef = doc(db, `rooms/${roomId}/playerStates`, uid);
        // Usar set com merge para garantir que o documento existe
        batch.set(playerStateRef, { 
          hand, 
          userId: uid,
          isReady: true,
          isFolded: false
        }, { merge: true });
      }

      // Reset turn to the first player still alive
      let firstTurn = 0;
      while ((room.playerScores?.[room.playerIds[firstTurn]] || 0) <= 0 && firstTurn < room.playerIds.length) {
        firstTurn++;
      }
      if (firstTurn >= room.playerIds.length) firstTurn = 0; // Fallback

      batch.update(doc(db, 'rooms', roomId), {
        status: 'playing',
        deck,
        discardPile: [],
        vira: deck.pop(),
        currentTurnIndex: firstTurn,
        lastActionAt: serverTimestamp(),
      });

      await batch.commit();
      console.log("Jogo iniciado com sucesso!");
    } catch (error) {
      console.error("Erro ao iniciar jogo:", error);
      setGameError("Erro ao iniciar o jogo. Tente novamente.");
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!room || !isCreator || room.status !== 'waiting') return;
    if (allReady && room.playerIds.length > 1) {
      setCountdown(3);
    } else {
      setCountdown(null);
    }
  }, [allReady, isCreator, room?.status, room?.playerIds.length]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (isCreator && !starting && room?.status === 'waiting') {
        startGame();
      }
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, isCreator, starting, room?.status]);

  const handleRequest = async (requestId: string, approve: boolean) => {
    if (!user || !room || !isCreator) return;
    const request = room.pendingRequests?.find(r => r.uid === requestId);
    if (!request) return;

    try {
      const updatedRequests = room.pendingRequests?.filter(r => r.uid !== requestId) || [];
      if (approve) {
        if (room.playerIds.length >= 10) {
          setGameError("A mesa já está cheia!");
          return;
        }
        const newScores = { ...(room.playerScores || {}), [requestId]: INITIAL_SCORE };
        await updateDoc(doc(db, 'rooms', roomId), {
          playerIds: arrayUnion(requestId),
          playerNames: arrayUnion(request.displayName),
          playerPhotos: arrayUnion(request.photoURL || ''),
          playerScores: newScores,
          pendingRequests: updatedRequests,
          lastActionAt: serverTimestamp(),
        });

        await setDoc(doc(db, `rooms/${roomId}/playerStates`, requestId), {
          userId: requestId,
          hand: [],
          isReady: false
        });
      } else {
        await updateDoc(doc(db, 'rooms', roomId), {
          pendingRequests: updatedRequests,
          lastActionAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const toggleReady = async () => {
    if (!user || room?.status !== 'waiting') return;
    setGameError(null);
    try {
      if (!playerState) {
        await setDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), {
          userId: user.uid,
          hand: [],
          isReady: true,
          isFolded: false
        }, { merge: true });
      } else {
        await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), {
          isReady: !playerState.isReady
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}/playerStates/${user.uid}`);
    }
  };

  const drawCard = async (fromDeck: boolean) => {
    if (!room || !playerState || !user) return;
    const isMyTurn = room.playerIds[room.currentTurnIndex] === user.uid;
    if (!isMyTurn || playerState.hand.length >= 10) return;

    const newDeck = [...room.deck];
    const newDiscard = [...room.discardPile];
    let card: Card | undefined;

    if (fromDeck) {
      if (newDeck.length === 0) {
        if (newDiscard.length <= 1) {
          setGameError("O baralho acabou e não há cartas no lixo para reembaralhar!");
          return;
        }
        // Reembaralha o lixo (exceto a última carta)
        const lastDiscard = newDiscard.pop()!;
        const reshuffled = shuffle(newDiscard);
        newDeck.push(...reshuffled);
        newDiscard.length = 0;
        newDiscard.push(lastDiscard);
      }
      card = newDeck.pop();
    } else {
      card = newDiscard.pop();
    }

    if (!card) return;

    try {
      await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), {
        hand: [...playerState.hand, card]
      });
      await updateDoc(doc(db, 'rooms', roomId), {
        deck: newDeck,
        discardPile: newDiscard,
        lastActionAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const discardCard = async (cardId: string) => {
    if (!room || !playerState || !user) return;
    const isMyTurn = room.playerIds[room.currentTurnIndex] === user.uid;
    if (!isMyTurn || playerState.hand.length !== 10) return;

    const cardToDiscard = playerState.hand.find(c => c.id === cardId);
    if (!cardToDiscard) return;

    const newHand = playerState.hand.filter(c => c.id !== cardId);
    const newDiscard = [...room.discardPile, cardToDiscard];
    
    let nextTurn = (room.currentTurnIndex + 1) % room.playerIds.length;
    let nextPid = room.playerIds[nextTurn];
    // Skip players who are folded or have 0 points
    while (allPlayerStates[nextPid]?.isFolded || (room.playerScores?.[nextPid] !== undefined && room.playerScores[nextPid] <= 0)) {
      nextTurn = (nextTurn + 1) % room.playerIds.length;
      nextPid = room.playerIds[nextTurn];
      if (nextTurn === room.currentTurnIndex) break; // Infinite loop safety
    }

    try {
      await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), {
        hand: newHand
      });
      await updateDoc(doc(db, 'rooms', roomId), {
        discardPile: newDiscard,
        currentTurnIndex: nextTurn,
        lastActionAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const bate = async () => {
    if (!room || !playerState || !user) return;
    if (playerState.hand.length !== 10) return;

    if (validateWin(playerState.hand, room.vira, room.curingaMode)) {
      const newScores = { ...(room.playerScores || {}) };
      const winnerId = user.uid;
      
      // Penalize others (only if they haven't folded)
      if (room.gameMode !== 'pife') {
        room.playerIds.forEach(pid => {
          if (pid !== winnerId && !allPlayerStates[pid]?.isFolded) {
            newScores[pid] = Math.max(0, (newScores[pid] || 0) - PENALTY);
          }
        });
      }

      // Check if game is over (only one player with points > 0)
      const playersWithPoints = Object.entries(newScores).filter(([_, score]) => score > 0);
      const isGameOver = room.gameMode === 'pife' || playersWithPoints.length <= 1;

      try {
        await updateDoc(doc(db, 'rooms', roomId), {
          status: isGameOver ? 'finished' : 'waiting',
          winnerId: winnerId,
          playerScores: newScores,
          lastActionAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
      }
    } else {
      setGameError("Mão inválida para bater! Você precisa de 3 trincas/sequências e 1 carta sobrando.");
      setTimeout(() => setGameError(null), 4000);
    }
  };

  const correrRound = async () => {
    if (!room || !playerState || !user) return;
    if (room.status !== 'playing' || playerState.isFolded) return;

    try {
      const newScores = { ...(room.playerScores || {}) };
      newScores[user.uid] = Math.max(0, (newScores[user.uid] || 0) - FOLD_PENALTY);

      await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), {
        isFolded: true
      });

      const isMyTurn = room.playerIds[room.currentTurnIndex] === user.uid;
      let nextTurn = room.currentTurnIndex;

      // Filter who is still alive in the round
      const activePlayers = room.playerIds.filter(pid => 
        pid === user.uid ? false : (!allPlayerStates[pid]?.isFolded && (newScores[pid] === undefined || newScores[pid] > 0))
      );

      if (activePlayers.length <= 1) {
        // Only one player left! They win!
        const winnerId = activePlayers[0] || room.playerIds[0];
        
        // As a rule, the winner doesn't lose points. Other folded players already lost 1.
        await updateDoc(doc(db, 'rooms', roomId), {
          status: 'finished',
          winnerId: winnerId,
          playerScores: newScores,
          lastActionAt: serverTimestamp(),
        });
      } else {
        if (isMyTurn) {
          // Advance the turn to the next player that hasn't folded
          do {
            nextTurn = (nextTurn + 1) % room.playerIds.length;
          } while (
            allPlayerStates[room.playerIds[nextTurn]]?.isFolded || 
            (newScores[room.playerIds[nextTurn]] !== undefined && newScores[room.playerIds[nextTurn]] <= 0)
          );
        }
        await updateDoc(doc(db, 'rooms', roomId), {
          playerScores: newScores,
          currentTurnIndex: nextTurn,
          lastActionAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };


  // Dealing Animation Logic
  useEffect(() => {
    if (room?.status !== 'dealing' || !isCreator) return;

    let isMounted = true;
    let turn = 0;

    const dealCards = async () => {
      // Fetch latest deck
      const rSnap = await getDoc(doc(db, 'rooms', roomId));
      if (!rSnap.exists()) return;
      const currentDeck = rSnap.data().deck || [];
      if (currentDeck.length === 0) return;

      const pId = room.playerIds[turn % room.playerIds.length];
      const pStateSnap = await getDoc(doc(db, `rooms/${roomId}/playerStates`, pId));
      const pState = pStateSnap.exists() ? pStateSnap.data() as PlayerState : null;

      const pHandLength = pState?.hand?.length || 0;

      // Check if everyone has 9 cards
      let allHaveNine = true;
      for (const pid of room.playerIds) {
        const snap = await getDoc(doc(db, `rooms/${roomId}/playerStates`, pid));
        if (!snap.exists() || (snap.data().hand || []).length < 9) {
          allHaveNine = false;
          break;
        }
      }

      if (allHaveNine) {
        if (isMounted) await updateDoc(doc(db, 'rooms', roomId), { status: 'decision' });
        return;
      }

      if (pHandLength < 9) {
        const card = currentDeck.pop();
        if (card) {
          const batch = writeBatch(db);
          batch.update(doc(db, 'rooms', roomId), { deck: currentDeck });
          batch.update(doc(db, `rooms/${roomId}/playerStates`, pId), {
            hand: arrayUnion(card)
          });
          await batch.commit();
        }
      }

      if (isMounted) {
        turn++;
        setTimeout(dealCards, 200);
      }
    };

    const timerId = setTimeout(dealCards, 200);
    return () => { isMounted = false; clearTimeout(timerId); };
  }, [room?.status, isCreator, roomId, room?.playerIds]);

  // Decision Check Logic
  useEffect(() => {
    if (room?.status !== 'decision' || !isCreator) return;

    let allDecided = true;
    for (const pid of room.playerIds) {
      if (pid === 'bot_1') continue;
      if (!allPlayerStates[pid]?.decisionMade) {
        allDecided = false;
        break;
      }
    }

    if (allDecided) {
      updateDoc(doc(db, 'rooms', roomId), { status: 'playing' });
    }
  }, [room?.status, isCreator, allPlayerStates, room?.playerIds, roomId]);

  // Bot Logic Effect
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.isBotGame) return;
    const currentPid = room.playerIds[room.currentTurnIndex];
    if (currentPid !== 'bot_1') return;

    const runBotTurn = async () => {
      const botStateSnap = await getDoc(doc(db, `rooms/${roomId}/playerStates`, 'bot_1'));
      if (!botStateSnap.exists()) return;
      const botState = botStateSnap.data() as PlayerState;
      
      // Artificial delay
      await new Promise(r => setTimeout(r, 2000));

      const { action, discardId } = botPlay(botState.hand, room.discardPile, room.deck, room.vira);
      
      // 1. Draw
      const newDeck = [...room.deck];
      const newDiscard = [...room.discardPile];
      let drawnCard: Card | undefined;

      if (action === 'draw_deck') {
        drawnCard = newDeck.pop();
      } else {
        drawnCard = newDiscard.pop();
      }

      if (!drawnCard) return;

      const handAfterDraw = [...botState.hand, drawnCard];

      // 2. Check if bot can win
      if (validateWin(handAfterDraw, room.vira, room.curingaMode)) {
        const newScores = { ...room.playerScores };
        if (room.gameMode !== 'pife') {
          room.playerIds.forEach(pid => {
            if (pid !== 'bot_1') {
              newScores[pid] = Math.max(0, (newScores[pid] || 0) - PENALTY);
            }
          });
        }
        const playersWithPoints = Object.entries(newScores).filter(([_, score]) => score > 0);
        await updateDoc(doc(db, 'rooms', roomId), {
          status: room.gameMode === 'pife' || playersWithPoints.length <= 1 ? 'finished' : 'waiting',
          winnerId: 'bot_1',
          playerScores: newScores,
          lastActionAt: serverTimestamp(),
        });
        await updateDoc(doc(db, `rooms/${roomId}/playerStates`, 'bot_1'), { hand: handAfterDraw });
        return;
      }

      // 3. Discard
      const finalHand = handAfterDraw.filter(c => c.id !== discardId);
      const discardedCard = handAfterDraw.find(c => c.id === discardId)!;
      const nextTurn = (room.currentTurnIndex + 1) % room.playerIds.length;

      await updateDoc(doc(db, `rooms/${roomId}/playerStates`, 'bot_1'), { hand: finalHand });
      await updateDoc(doc(db, 'rooms', roomId), {
        discardPile: [...newDiscard, discardedCard],
        deck: newDeck,
        currentTurnIndex: nextTurn,
        lastActionAt: serverTimestamp(),
      });
    };

    runBotTurn();
  }, [room?.currentTurnIndex, room?.status]);

  const handleDragEnd = async (event: any, info: any, cardIndex: number) => {
    if (!playerState) return;
    const offsetIndex = Math.round(info.offset.x / 64);
    if (offsetIndex === 0) return;

    const newHand = [...playerState.hand];
    const [card] = newHand.splice(cardIndex, 1);
    let newIndex = cardIndex + offsetIndex;
    newIndex = Math.max(0, Math.min(newIndex, newHand.length));
    newHand.splice(newIndex, 0, card);

    setPlayerState(prev => prev ? { ...prev, hand: newHand } : null);
    await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), { hand: newHand });
  };

  const getPlayerStyle = (pos: number, total: number) => {
    if (total === 1 || pos === 0) return { bottom: '2rem', left: '50%', transform: 'translateX(-50%)' };

    const angle = (Math.PI / 2) + (pos / total) * 2 * Math.PI;
    const rx = 35;
    const ry = 28;

    // O offset pode ser ajustado dependendo se quisermos que eles sentem perfeitamente.
    // Usamos left e top em %. O centro é 50%.
    const left = 50 + rx * Math.cos(angle);
    const top = 50 + ry * Math.sin(angle);

    return {
      left: `${left}%`,
      top: `${top}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  const getFlexClass = (pos: number, total: number) => {
    if (total === 1 || pos === 0) return 'flex-col';
    
    const angle = (Math.PI / 2) + (pos / total) * 2 * Math.PI;
    const left = 50 + 42 * Math.cos(angle);
    const top = 50 + 35 * Math.sin(angle);
    
    if (top < 30) return 'flex-col-reverse';
    if (left < 30) return 'flex-row';
    if (left > 70) return 'flex-row-reverse';
    return 'flex-col';
  };

  const getCardBackClass = () => {
    const cardBack = profile?.equipped?.cardBack || 'card_classic';
    switch (cardBack) {
      case 'card_gold': return 'bg-amber-500 border-amber-400';
      case 'card_dark': return 'bg-stone-950 border-stone-800';
      case 'card_neon': return 'bg-fuchsia-600 border-fuchsia-400';
      default: return 'bg-blue-800 border-blue-600';
    }
  };

  const getAvatarFrameClass = (uid: string) => {
    // For now, only the current user's profile is easily accessible here.
    // If we want other players' frames, we'd need to fetch their profiles.
    // Let's just apply it to the current user for now.
    if (uid === user?.uid) {
      const frame = profile?.equipped?.avatarFrame;
      if (frame === 'frame_gold') return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
      if (frame === 'frame_neon') return 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]';
    }
    return 'border-white/20';
  };

  const getWinAnimation = (winnerUid: string) => {
    // If the winner is the current user, use their equipped animation.
    // If it's someone else, we ideally would fetch their profile.
    // For now, we'll just use the current user's animation if they won, or a default if not.
    // In a real app, you'd store the winner's animation ID in the room state when they win.
    const anim = (winnerUid === user?.uid) ? (profile?.equipped?.winAnimation || 'anim_classic') : 'anim_classic';
    
    switch (anim) {
      case 'anim_fire': return { icon: Flame, color: 'text-orange-500', effect: 'animate-pulse scale-110', message: 'TÁ PEGANDO FOGO BIXO!' };
      case 'anim_lightning': return { icon: Zap, color: 'text-yellow-400', effect: 'animate-bounce', message: 'RÁPIDO COMO UM RAIO!' };
      case 'anim_donkey': return { icon: Skull, color: 'text-stone-400', effect: 'animate-spin', message: 'BANDO DE BURRO!' };
      case 'anim_cry': return { icon: Frown, color: 'text-blue-400', effect: 'animate-bounce', message: 'CHORA MAIS!' };
      default: return { icon: Trophy, color: 'text-amber-500', effect: 'animate-bounce', message: 'O CAMPEÃO VOLTOU!' };
    }
  };

  const getScenarioConfig = (scenario: Scenario) => {
    switch (scenario) {
      case 'churrasco': return { 
        icon: Flame, 
        color: 'from-orange-900/40', 
        label: 'Churrasco',
        bg: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1920'
      };
      case 'praia': return { 
        icon: Waves, 
        color: 'from-blue-900/40', 
        label: 'Praia',
        bg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1920'
      };
      case 'sitio': return { 
        icon: TreePine, 
        color: 'from-green-900/40', 
        label: 'Sítio',
        bg: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1920'
      };
      case 'quintal': return { 
        icon: Home, 
        color: 'from-stone-800/40', 
        label: 'Quintal',
        bg: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=1920'
      };
      default: return { 
        icon: Beer, 
        color: 'from-stone-900/40', 
        label: 'Bar',
        bg: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1920'
      };
    }
  };

  const onLeaveGame = async () => {
    if (!room || !user) return;

    const isCreator = room.creatorId === user.uid;
    const isBotGame = room.isBotGame;
    const isLastPlayer = room.playerIds.length === 1;
    const isFinished = room.status === 'finished';

    if (isFinished || isLastPlayer || isBotGame || isCreator) {
      try {
        // Delete room and subcollections if finished, last player, bot game, or creator leaves
        const batch = writeBatch(db);
        const playerStatesSnap = await getDocs(collection(db, `rooms/${roomId}/playerStates`));
        playerStatesSnap.forEach(doc => batch.delete(doc.ref));
        
        const voiceSnap = await getDocs(collection(db, `rooms/${roomId}/voice`));
        voiceSnap.forEach(doc => batch.delete(doc.ref));

        batch.delete(doc(db, 'rooms', roomId));
        await batch.commit();
      } catch (error) {
        console.error("Erro ao limpar sala:", error);
      }
    } else {
      // Just remove myself from the room
      try {
        const newPlayerIds = room.playerIds.filter(id => id !== user.uid);
        const newPlayerNames = room.playerNames.filter((_, i) => room.playerIds[i] !== user.uid);
        const newPlayerPhotos = room.playerPhotos.filter((_, i) => room.playerIds[i] !== user.uid);
        const { [user.uid]: _, ...newScores } = room.playerScores;

        await updateDoc(doc(db, 'rooms', roomId), {
          playerIds: newPlayerIds,
          playerNames: newPlayerNames,
          playerPhotos: newPlayerPhotos,
          playerScores: newScores,
          lastActionAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid));
      } catch (error) {
        console.error("Erro ao sair da sala:", error);
      }
    }
    onLeave();
  };

  const getPlayerPosition = (index: number, total: number) => {
    if (!user || !room) return 0;
    const myIndex = (room.playerIds || []).indexOf(user.uid);
    // Retorna a posição relativa (0 é a minha posição na parte inferior)
    return (index - myIndex + total) % total;
  };

  const getPosClasses = (pos: number, total: number) => {
    // Esta função agora é secundária, já que usamos getPlayerStyle para absolute.
    // Mas mantemos por compatibilidade se algo mais as usar.
    return '';
  };

  if (loading) return <div className="p-12 text-center text-white">Entrando na mesa...</div>;
  if (!room) return null;

  const scenarioConfig = getScenarioConfig(room.scenario);

  const isMyTurn = room.playerIds?.[room.currentTurnIndex] === user?.uid;
  const canDraw = isMyTurn && playerState && playerState.hand.length === 9 && room.status === 'playing';
  const canDiscard = isMyTurn && playerState && playerState.hand.length === 10 && room.status === 'playing';

  const curingaValue = room.vira ? (room.vira.value === 13 ? 1 : room.vira.value + 1) : -1;


  return (
    <div className="h-screen w-full flex flex-col p-2 lg:p-4 overflow-hidden relative selection:bg-transparent">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <scenarioConfig.icon className="w-8 h-8 text-amber-500" />
          <h2 className="text-2xl font-bold text-white font-serif italic">{room.name}</h2>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/60 uppercase tracking-widest font-bold">{scenarioConfig.label}</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all border border-white/10 ${showHelp ? 'bg-amber-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            <span className="font-serif italic font-black text-lg">?</span>
          </button>
          {user && <VoiceChat roomId={roomId} userId={user.uid} playerIds={room.playerIds || []} />}
          <button onClick={onLeaveGame} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-red-500/20 text-white rounded-full transition-colors">
            <LogOut className="w-4 h-4" /> Sair da Mesa
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isCreator && room.pendingRequests && room.pendingRequests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-24 right-4 z-[100] flex flex-col gap-3 max-w-[300px] w-full"
          >
            {room.pendingRequests.map(req => (
              <div key={req.uid} className="bg-stone-900/90 backdrop-blur-xl border border-amber-500/40 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none"></div>
                <div className="flex items-center gap-3 relative z-10 w-full">
                  <img src={req.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.uid}`} alt="" className="w-10 h-10 rounded-full border-2 border-amber-500 object-cover shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-tight truncate">{req.displayName}</p>
                    <p className="text-amber-500/80 text-[10px] uppercase font-bold tracking-widest mt-0.5">Pede p/ Entrar</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleRequest(req.uid, true)} className="w-8 h-8 bg-green-500 hover:bg-green-400 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRequest(req.uid, false)} className="w-8 h-8 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95">
                      <LogOut className="w-3 h-3 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-6 mt-4 w-full max-w-[1800px] mx-auto min-h-0 relative">
        
        {/* Lado Esquerdo - Sidebar do Placar */}
        <div className="hidden lg:flex flex-col w-[300px] shrink-0 gap-4 overflow-hidden relative z-40">
          <div className="bg-stone-900/80 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-4 shadow-2xl flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            <h3 className="text-amber-500 font-bold font-serif italic text-lg mb-4 flex items-center gap-2 sticky top-0 bg-stone-900/90 p-2 rounded-xl z-10">
              <Trophy className="w-6 h-6" /> Placar da Mesa
            </h3>
            <div className="flex flex-col gap-3">
              {(room.playerIds || []).map((pid, idx) => {
                const score = room.playerScores?.[pid] || 0;
                const isMe = pid === user?.uid;
                const pState = allPlayerStates[pid];
                return (
                  <div key={pid} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isMe ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={room.playerPhotos?.[idx] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pid}`} alt="" className="w-10 h-10 rounded-full border-2 border-white/20 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-bold truncate max-w-[120px] ${isMe ? 'text-amber-500' : 'text-stone-200'}`}>
                          {room.playerNames?.[idx] || 'Jogador'}
                        </span>
                        {pState?.isFolded && <span className="text-[10px] text-red-500 font-bold uppercase">Correu</span>}
                      </div>
                    </div>
                    <div className="bg-black/60 px-3 py-1.5 rounded-xl text-amber-500 font-black text-sm shadow-inner flex items-center gap-1.5 shrink-0 border border-white/5">
                      {score} <span className="text-[10px] text-amber-500/60 uppercase">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lado Direito - Mesa (Game Board) */}
        <div className="flex-1 flex justify-center items-center relative min-w-0">
          <div className={`w-full max-w-5xl aspect-[16/10] sm:aspect-video relative rounded-[3rem] border-[12px] border-stone-900 shadow-2xl p-8 overflow-hidden mx-auto`}>
        {/* Background Image - More Realistic */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
          style={{ backgroundImage: `url(${scenarioConfig.bg})` }}
        >
          {/* Subtle overlay to keep UI readable but show the background */}
          <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px]`}></div>
        </div>

        {/* Realistic Table Surface */}
        <div className="absolute inset-8 md:inset-16 bg-[#1a0f0a] rounded-[3rem] md:rounded-[5rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] border-t-[12px] border-white/10 overflow-hidden">
          {/* High Quality Wood Texture */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&q=60&w=1000')] bg-cover opacity-60 mix-blend-overlay"></div>
          {/* Table Shine & Shadows */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_0%,_rgba(0,0,0,0.4)_100%)]"></div>
          
          {/* Inner Play Area (Professional Felt) */}
          <div className="absolute inset-6 md:inset-12 bg-emerald-900/40 rounded-[2rem] md:rounded-[4rem] border-4 border-black/60 shadow-[inset_0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-[3px] flex items-center justify-center">
             <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
             {/* Table Logo/Mark */}
             <div className="absolute opacity-5 select-none pointer-events-none">
               <Beer className="w-64 h-64 text-white" />
             </div>
          </div>
        </div>

        {/* Placar removido de dentro da mesa */}

        {/* Chat de Texto */}
        {user && (
          <div className="absolute bottom-8 right-8 z-50">
            <TextChat roomId={roomId} user={user} />
          </div>
        )}

        {room.status === 'decision' && !playerState?.decisionMade && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-stone-900 border-2 border-amber-500 rounded-[2rem] p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
              <h3 className="text-3xl font-black text-white italic font-serif mb-6">Jogar ou Correr?</h3>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), { decisionMade: true });
                  }}
                  className="px-8 py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-400 transition-all text-xl"
                >
                  Jogar
                </button>
                <button
                  onClick={async () => {
                    await updateDoc(doc(db, `rooms/${roomId}/playerStates`, user.uid), { isFolded: true, decisionMade: true });
                  }}
                  className="px-8 py-4 bg-red-500/20 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all text-xl border border-red-500/50"
                >
                  Correr
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Jogadores ao redor da mesa */}
        {(room.playerIds || []).map((pid, idx) => {
          const total = (room.playerIds || []).length;
          const pos = getPlayerPosition(idx, total);
          const flexClass = getFlexClass(Number(pos), Number(total));
          const isCurrentTurn = room.status === 'playing' && room.currentTurnIndex === idx;
          const pState = allPlayerStates[pid];
          const isReady = pState?.isReady;
          
          if (pid === user?.uid) return null; // Esconder perfil próprio da rodada da mesa

          return (
            <div 
              key={pid} 
              className={`absolute flex items-center gap-2 p-4 rounded-[2rem] transition-all z-50 ${flexClass} ${isCurrentTurn ? 'bg-amber-500/20 ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-black/20 backdrop-blur-sm'}`}
              style={getPlayerStyle(Number(pos), Number(total))}
            >
              <div className="relative">
                <img 
                  src={room.playerPhotos?.[idx] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pid}`} 
                  alt="" 
                  className={`w-16 h-16 rounded-full border-4 object-cover ${getAvatarFrameClass(pid)}`}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-black w-8 h-8 rounded-full flex items-center justify-center border-4 border-stone-900 shadow-lg">
                  {room.playerScores?.[pid] || 0}
                </div>
                {isCurrentTurn && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -bottom-1 -right-1 bg-amber-500 w-4 h-4 rounded-full border-2 border-stone-900"
                  />
                )}
                {room.status === 'waiting' && isReady && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-stone-900">
                    <Trophy className="w-3 h-3" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-sm text-white font-bold block">{room.playerNames?.[idx] || 'Jogador'}</span>
                {room.status === 'playing' && pState && !pState.isFolded && (
                  <span className="text-xs text-white/60 block">{pState.hand.length} cartas</span>
                )}
                {room.status === 'playing' && pState?.isFolded && (
                  <span className="text-xs text-red-500 font-bold uppercase block tracking-widest mt-1">Correu</span>
                )}
                {isCurrentTurn && !pState?.isFolded && <span className="text-[10px] text-amber-500 uppercase font-black tracking-widest">Sua Vez</span>}
                {room.status === 'waiting' && (
                  <span className={`text-[10px] uppercase font-black tracking-widest ${isReady ? 'text-green-500' : 'text-white/20 animate-pulse'}`}>
                    {isReady ? 'Pronto' : 'Aguardando'}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Centro da Mesa */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center gap-12 z-20">
          {/* Monte */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={canDraw ? { scale: 1.05, y: -5 } : {}}
              onClick={() => drawCard(true)}
              disabled={!canDraw}
              className={`w-24 h-36 rounded-xl border-4 flex items-center justify-center shadow-xl transition-all ${canDraw ? `${getCardBackClass()} cursor-pointer` : 'bg-stone-800 border-stone-700 opacity-50'}`}
            >
              <Beer className="w-10 h-10 text-white/20" />
            </motion.button>
            <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Monte ({room.deck?.length || 0})</span>
          </div>

          {/* Vira */}
          {room.vira && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-36 rounded-xl border-4 bg-white border-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <div className="text-center">
                  <span className={`text-2xl font-bold ${['hearts', 'diamonds'].includes(room.vira.suit) ? 'text-red-600' : 'text-black'}`}>
                    {room.vira.label}
                  </span>
                  <div className={`text-sm ${['hearts', 'diamonds'].includes(room.vira.suit) ? 'text-red-600' : 'text-black'}`}>
                    {room.vira.suit === 'hearts' && '♥'}
                    {room.vira.suit === 'diamonds' && '♦'}
                    {room.vira.suit === 'clubs' && '♣'}
                    {room.vira.suit === 'spades' && '♠'}
                  </div>
                </div>
              </div>
              <span className="text-xs text-amber-500 uppercase tracking-widest font-bold animate-pulse">Vira</span>
            </div>
          )}

          {/* Lixo */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={canDraw && (room.discardPile?.length || 0) > 0 ? { scale: 1.05, y: -5 } : {}}
              onClick={() => drawCard(false)}
              disabled={!canDraw || (room.discardPile?.length || 0) === 0}
              className={`w-24 h-36 rounded-xl border-4 flex items-center justify-center shadow-xl transition-all relative ${canDraw && (room.discardPile?.length || 0) > 0 ? 'bg-white border-amber-400 cursor-pointer' : 'bg-stone-800 border-stone-700 opacity-50'}`}
            >
              {(room.discardPile?.length || 0) > 0 ? (
                <div className="text-center">
                  <span className={`text-2xl font-bold ${['hearts', 'diamonds'].includes(room.discardPile[room.discardPile.length-1].suit) ? 'text-red-600' : 'text-black'}`}>
                    {room.discardPile[room.discardPile.length-1].label}
                  </span>
                  <div className={`text-sm ${['hearts', 'diamonds'].includes(room.discardPile[room.discardPile.length-1].suit) ? 'text-red-600' : 'text-black'}`}>
                    {room.discardPile[room.discardPile.length-1].suit === 'hearts' && '♥'}
                    {room.discardPile[room.discardPile.length-1].suit === 'diamonds' && '♦'}
                    {room.discardPile[room.discardPile.length-1].suit === 'clubs' && '♣'}
                    {room.discardPile[room.discardPile.length-1].suit === 'spades' && '♠'}
                  </div>
                </div>
              ) : (
                <span className="text-white/10">Vazio</span>
              )}
            </motion.button>
            <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Lixo</span>
          </div>
        </div>

        {/* Minha Mão */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
          <div className="flex gap-2 p-6 bg-black/30 rounded-full backdrop-blur-md border border-white/10">
            {(playerState?.hand || []).map((card, idx) => {
              const isCuringa = card.value === curingaValue;
              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, info) => handleDragEnd(e, info, idx)}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  whileHover={{ y: -20, zIndex: 50 }}
                  onClick={() => canDiscard && discardCard(card.id)}
                  className={`w-16 h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer border-2 transition-colors relative ${isCuringa ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : (canDiscard ? 'hover:border-amber-500 border-transparent' : 'border-transparent')}`}
                >
                  {isCuringa && <span className="absolute -top-3 -right-3 text-xl drop-shadow-md">⭐</span>}
                  <span className={`text-xl font-bold ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'}`}>
                    {card.label}
                  </span>
                  <span className={`text-lg ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'}`}>
                    {card.suit === 'hearts' && '♥'}
                    {card.suit === 'diamonds' && '♦'}
                    {card.suit === 'clubs' && '♣'}
                    {card.suit === 'spades' && '♠'}
                  </span>
                </motion.div>
              );
            })}
            {playerState?.hand.length === 0 && room.status === 'waiting' && (
              <div className="text-white/40 italic px-8 py-2">Aguardando início...</div>
            )}
          </div>
        </div>

        {/* Controles de Jogo */}
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
          <AnimatePresence>
            {gameError && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm border-2 border-red-400 mb-4"
              >
                {gameError}
              </motion.div>
            )}
          </AnimatePresence>
          {room.status === 'waiting' && isCreator ? (
            <div className="flex flex-col items-center gap-4">
              {!allReady && (
                <p className="text-amber-500 font-bold animate-pulse text-sm uppercase tracking-widest bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm border border-amber-500/20">
                  Aguardando todos ficarem prontos...
                </p>
              )}
              {allReady && countdown !== null && countdown > 0 && (
                <p className="text-green-500 font-black text-2xl animate-pulse uppercase tracking-widest bg-black/60 px-8 py-4 rounded-full backdrop-blur-sm border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  Iniciando em {countdown}...
                </p>
              )}
              <div className="flex gap-4">
                {!playerState?.isReady && (
                  <button 
                    onClick={toggleReady}
                    className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-full shadow-xl uppercase tracking-widest transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                  >
                    Estou Pronto!
                  </button>
                )}
                {playerState?.isReady && (!allReady || countdown === null) && (
                  <button 
                    onClick={toggleReady}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-full shadow-xl uppercase tracking-widest transition-all border border-white/10"
                  >
                    Cancelar Pronto
                  </button>
                )}
                <motion.button 
                  animate={(starting || !allReady) ? {} : { scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={startGame} 
                  disabled={starting || !allReady || countdown !== null}
                  className={`flex items-center gap-3 px-12 py-4 text-white font-black rounded-full shadow-[0_0_40px_rgba(217,119,6,0.4)] uppercase tracking-[0.2em] transition-all border-b-4 active:border-b-0 active:translate-y-1 ${(starting || !allReady || countdown !== null) ? 'bg-stone-700 border-stone-800 cursor-not-allowed opacity-50' : 'bg-amber-600 hover:bg-amber-500 border-amber-800'}`}
                >
                  {starting ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-6 h-6 fill-current" />
                  )}
                  {starting ? 'Iniciando...' : 'Começar Jogo'}
                </motion.button>
              </div>
            </div>
          ) : room.status === 'waiting' ? (
            <div className="flex flex-col items-center gap-4">
              {!playerState?.isReady ? (
                <button 
                  onClick={toggleReady}
                  className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-full shadow-xl uppercase tracking-widest transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                >
                  Estou Pronto!
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-green-500 font-bold animate-pulse text-sm uppercase tracking-widest bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm border border-green-500/20">
                    Você está pronto!
                  </p>
                  <button 
                    onClick={toggleReady}
                    className="text-white/40 hover:text-white text-xs underline uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              <p className="text-white/40 italic text-xs">Aguardando o dono da mesa iniciar o jogo...</p>
            </div>
          ) : null}
          <div className="flex items-center gap-4">
            {canDiscard && !playerState?.isFolded && (
              <button onClick={bate} className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full shadow-xl uppercase tracking-widest transition-all">
                <Trophy className="w-5 h-5" /> Bater!
              </button>
            )}
            {room.status === 'playing' && !playerState?.isFolded && (
              <button 
                onClick={correrRound} 
                className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-xl uppercase tracking-widest transition-all"
                title="Desistir da rodada e perder apenas 1 ponto"
              >
                <LogOut className="w-4 h-4" /> Correr
              </button>
            )}
          </div>
          </div>
        </div>
        </div>
      </div>

      {/* Overlay de Ajuda */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[200] p-8 cursor-pointer"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full bg-stone-900 p-8 rounded-[3rem] border border-white/10 shadow-2xl relative cursor-default"
              >
                <button onClick={() => setShowHelp(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
                  <LogOut className="w-6 h-6 rotate-180" />
                </button>
                <h3 className="text-3xl font-serif italic font-black text-amber-500 mb-6">Como Jogar</h3>
                <div className="space-y-4 text-white/70 text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  <p><span className="text-white font-bold">1. Início:</span> O dono da mesa clica em "Começar Jogo". Cada jogador recebe 9 cartas.</p>
                  <p><span className="text-white font-bold">2. Turno:</span> Na sua vez, você deve comprar uma carta do Monte ou do Lixo.</p>
                  <p><span className="text-white font-bold">3. Descarte:</span> Após comprar, você terá 10 cartas. Escolha uma para descartar no Lixo e passar a vez.</p>
                  <p><span className="text-white font-bold">4. Bater:</span> Quando você tiver 3 jogos (trincas ou sequências) formados, clique em "Bater!" com as 10 cartas na mão.</p>
                  <p className="text-amber-500/60 italic text-xs mt-6">Dica: Trincas são 3 cartas de mesmo valor e naipes diferentes. Sequências são 3 cartas do mesmo naipe em ordem numérica.</p>
                  <p className="text-white/40 text-[10px] mt-4">
                    As trincas podem ter 3 ou 4 cartas. As sequências também. 
                    Para ganhar, você precisa que todas as suas 9 ou 10 cartas estejam em jogos válidos.
                  </p>
                </div>
                <button onClick={() => setShowHelp(false)} className="w-full mt-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all uppercase tracking-widest">
                  Entendi!
                </button>
              </motion.div>
            </motion.div>
          )}

          {room.status === 'finished' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100] p-8 text-center"
            >
              {(() => {
                const isWinner = room.winnerId === user?.uid;
                const WinAnim = getWinAnimation(room.winnerId!);
                const winnerName = isWinner ? 'VOCÊ' : room.playerNames?.[(room.playerIds || []).indexOf(room.winnerId!)] || 'Jogador';
                return (
                  <>
                    <WinAnim.icon className={`w-32 h-32 mb-6 ${isWinner ? WinAnim.color : 'text-amber-500'} ${isWinner ? WinAnim.effect : ''}`} />
                    <h2 className="text-5xl font-bold text-white mb-2">FIM DE JOGO!</h2>
                    <p className={`text-3xl font-black mb-4 ${isWinner ? WinAnim.color : 'text-amber-500'}`}>
                      {winnerName} GANHOU!
                    </p>
                    {isWinner && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.5 }}
                        className="bg-white/10 px-6 py-3 rounded-full border border-white/20 mb-8"
                      >
                        <p className={`text-xl font-bold italic ${WinAnim.color}`}>"{WinAnim.message}"</p>
                      </motion.div>
                    )}
                  </>
                );
              })()}
              <button onClick={onLeaveGame} className="px-12 py-4 bg-white text-black font-bold rounded-full uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">
                Voltar pro Bar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};
