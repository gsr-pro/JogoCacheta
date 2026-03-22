import re

with open('src/GameRoom.tsx', 'r') as f:
    content = f.read()

# Win logic
content = content.replace("validateWin(playerState.hand, room.vira)", "validateWin(playerState.hand, room.vira, room.curingaMode)")
content = content.replace("validateWin(handAfterDraw, room.vira)", "validateWin(handAfterDraw, room.vira, room.curingaMode)")

bate_penalty_search = """      // Penalize others (only if they haven't folded)
      room.playerIds.forEach(pid => {
        if (pid !== winnerId && !allPlayerStates[pid]?.isFolded) {
          newScores[pid] = Math.max(0, (newScores[pid] || 0) - PENALTY);
        }
      });"""

bate_penalty_replacement = """      // Penalize others (only if they haven't folded)
      if (room.gameMode !== 'pife') {
        room.playerIds.forEach(pid => {
          if (pid !== winnerId && !allPlayerStates[pid]?.isFolded) {
            newScores[pid] = Math.max(0, (newScores[pid] || 0) - PENALTY);
          }
        });
      }"""
content = content.replace(bate_penalty_search, bate_penalty_replacement)

gameover_search = """      // Check if game is over (only one player with points > 0)
      const playersWithPoints = Object.entries(newScores).filter(([_, score]) => score > 0);
      const isGameOver = playersWithPoints.length <= 1;"""

gameover_replacement = """      // Check if game is over (only one player with points > 0)
      const playersWithPoints = Object.entries(newScores).filter(([_, score]) => score > 0);
      const isGameOver = room.gameMode === 'pife' || playersWithPoints.length <= 1;"""
content = content.replace(gameover_search, gameover_replacement)

bot_penalty_search = """        room.playerIds.forEach(pid => {
          if (pid !== 'bot_1') {
            newScores[pid] = Math.max(0, (newScores[pid] || 0) - PENALTY);
          }
        });
        const playersWithPoints = Object.entries(newScores).filter(([_, score]) => score > 0);
        await updateDoc(doc(db, 'rooms', roomId), {
          status: playersWithPoints.length <= 1 ? 'finished' : 'waiting',"""

bot_penalty_replacement = """        if (room.gameMode !== 'pife') {
          room.playerIds.forEach(pid => {
            if (pid !== 'bot_1') {
              newScores[pid] = Math.max(0, (newScores[pid] || 0) - PENALTY);
            }
          });
        }
        const playersWithPoints = Object.entries(newScores).filter(([_, score]) => score > 0);
        await updateDoc(doc(db, 'rooms', roomId), {
          status: room.gameMode === 'pife' || playersWithPoints.length <= 1 ? 'finished' : 'waiting',"""

content = content.replace(bot_penalty_search, bot_penalty_replacement)

# Dealing Animation
startgame_search = r"""      const deckCount = room.playerIds.length >= 7 \? 3 : 2; const deck = createDeck\(deckCount\);
      const batch = writeBatch\(db\);

      // Distribuir cartas
      room.playerIds.forEach\(pid => \{
        const hand = deck.splice\(0, 9\);
        const stateRef = doc\(db, `rooms/\$\{roomId\}/playerStates`, pid\);
        batch.set\(stateRef, \{ userId: pid, hand, isReady: false \}\);
      \}\);

      // Se houver bot, dar cartas pra ele também
      if \(room.isBotGame && !room.playerIds.includes\('bot_1'\)\) \{
        const hand = deck.splice\(0, 9\);
        const botRef = doc\(db, `rooms/\$\{roomId\}/playerStates`, 'bot_1'\);
        batch.set\(botRef, \{ userId: 'bot_1', hand, isReady: false \}\);

        // Se o bot não estava na lista de jogadores ainda, adiciona
        if \(!room.playerIds.includes\('bot_1'\)\) \{
          room.playerIds.push\('bot_1'\);
          room.playerNames.push\('Bot'\);
          room.playerPhotos.push\('https://api.dicebear.com/7.x/avataaars/svg\?seed=bot_1'\);
        \}
      \}

      const roomRef = doc\(db, 'rooms', roomId\);
      batch.update\(roomRef, \{
        status: 'playing',
        deck,
        discardPile: \[\],
        vira: deck.pop\(\),
        currentTurnIndex: 0,
        lastActionAt: serverTimestamp\(\),
        playerIds: room.playerIds,
        playerNames: room.playerNames,
        playerPhotos: room.playerPhotos,
      \}\);

      await batch.commit\(\);"""

startgame_replacement = """      const deckCount = room.playerIds.length >= 7 ? 3 : 2; const deck = createDeck(deckCount);
      const batch = writeBatch(db);

      // Clean hands
      room.playerIds.forEach(pid => {
        const stateRef = doc(db, `rooms/${roomId}/playerStates`, pid);
        batch.set(stateRef, { userId: pid, hand: [], isReady: false, isFolded: false, decisionMade: false });
      });

      // Se houver bot, adiciona e limpa a mao
      if (room.isBotGame && !room.playerIds.includes('bot_1')) {
        const botRef = doc(db, `rooms/${roomId}/playerStates`, 'bot_1');
        batch.set(botRef, { userId: 'bot_1', hand: [], isReady: false, isFolded: false, decisionMade: true });

        // Se o bot não estava na lista de jogadores ainda, adiciona
        if (!room.playerIds.includes('bot_1')) {
          room.playerIds.push('bot_1');
          room.playerNames.push('Bot');
          room.playerPhotos.push('https://api.dicebear.com/7.x/avataaars/svg?seed=bot_1');
        }
      }

      const roomRef = doc(db, 'rooms', roomId);
      batch.update(roomRef, {
        status: 'dealing',
        deck,
        discardPile: [],
        vira: deck.pop(),
        currentTurnIndex: 0,
        lastActionAt: serverTimestamp(),
        playerIds: room.playerIds,
        playerNames: room.playerNames,
        playerPhotos: room.playerPhotos,
      });

      await batch.commit();"""

content = re.sub(startgame_search, startgame_replacement, content)

anim_logic = """
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
"""

effect_search = r"(  // Bot Logic Effect)"
content = re.sub(effect_search, anim_logic + r"\n\1", content)


ui_logic = """
        {/* Jogadores ao redor da mesa */}
"""

overlay_logic = """
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
"""

content = content.replace(ui_logic, overlay_logic + ui_logic)


# Draggable Cards
drag_handler = """  const handleDragEnd = async (event: any, info: any, cardIndex: number) => {
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
  };"""

content = content.replace("  const getPlayerStyle =", drag_handler + "\n\n  const getPlayerStyle =")

render_search = r"\{\[\.\.\.\(playerState\?\.hand \|\| \[\]\)\].sort\(\(a, b\) => \{[\s\S]*?\}\)\.map\(\(card, idx\) => \{"
render_replacement = "{(playerState?.hand || []).map((card, idx) => {"
content = re.sub(render_search, render_replacement, content)

motion_div_search = r"(<motion\.div\n\s*key=\{card\.id\}\n\s*layoutId=\{card\.id\}\n\s*initial=\{\{ y: 50, opacity: 0 \}\}\n\s*animate=\{\{ y: 0, opacity: 1 \}\}\n\s*whileHover=\{\{ y: -20, zIndex: 50 \}\}\n\s*onClick=\{[^}]+\}\n\s*className=\{`w-16 h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer border-2 transition-colors relative)"
motion_div_replacement = r"""<motion.div
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
                  className={`w-16 h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer border-2 transition-colors relative"""

content = re.sub(motion_div_search, motion_div_replacement, content)


with open('src/GameRoom.tsx', 'w') as f:
    f.write(content)
