import re

# Types
with open('src/types.ts', 'r') as f:
    t_content = f.read()

t_content = t_content.replace("export interface Room {", "export interface Room {\n  gameMode?: 'pife' | 'cacheta';\n  curingaMode?: 'original' | 'all';")
t_content = t_content.replace("status: 'waiting' | 'playing' | 'finished';", "status: 'waiting' | 'dealing' | 'decision' | 'playing' | 'finished';")
t_content = t_content.replace("isFolded?: boolean;", "isFolded?: boolean;\n  decisionMade?: boolean;")

with open('src/types.ts', 'w') as f:
    f.write(t_content)

# Lobby
with open('src/Lobby.tsx', 'r') as f:
    l_content = f.read()

import_search = r"import \{ collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc, setDoc, writeBatch, getDocs, deleteDoc \} from 'firebase/firestore';"
import_replacement = "import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc, setDoc, writeBatch, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';"
l_content = l_content.replace(import_search, import_replacement)

icon_search = r"import \{ Beer, Users, Plus, Play, LogOut, TreePine, Waves, Home, Flame, UserPlus \} from 'lucide-react';"
icon_replacement = "import { Beer, Users, Plus, Play, LogOut, TreePine, Waves, Home, Flame, UserPlus, Trophy, X } from 'lucide-react';"
l_content = l_content.replace(icon_search, icon_replacement)

state_search = r"const \[selectedScenario, setSelectedScenario\] = useState<Scenario>\('bar'\);"
state_replacement = """const [selectedScenario, setSelectedScenario] = useState<Scenario>('bar');
  const [gameMode, setGameMode] = useState<'pife' | 'cacheta'>('cacheta');
  const [curingaMode, setCuringaMode] = useState<'original' | 'all'>('original');"""
l_content = re.sub(state_search, state_replacement, l_content)

state_search2 = r"const \[isStoreOpen, setIsStoreOpen\] = useState\(false\);"
state_replacement2 = """const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [rankings, setRankings] = useState<UserProfile[]>([]);"""
l_content = l_content.replace(state_search2, state_replacement2)

room_data_search = r"const roomData = \{"
room_data_replacement = """const roomData = {
        gameMode,
        curingaMode,"""
l_content = l_content.replace(room_data_search, room_data_replacement)

effect_code = """
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
"""
l_content = l_content.replace("  const myRoom = rooms.find(r => r.creatorId === user?.uid);", effect_code + "\n  const myRoom = rooms.find(r => r.creatorId === user?.uid);")

header_search = r"(<Store isOpen=\{isStoreOpen\} onClose=\{\(\) => setIsStoreOpen\(false\)\} \/>\s*</div>\s*</header>)"
header_replacement = r"""<button onClick={() => setShowRanking(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-full transition-colors border border-stone-700">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline font-bold">Ranking</span>
          </button>
          \1"""
l_content = re.sub(header_search, header_replacement, l_content)

ui_search = r"(<div className=\"flex items-center gap-3 mb-4\">[\s\S]*?<div className=\"flex gap-3 overflow-x-auto pb-4 custom-scrollbar\">[\s\S]*?</div>[\s\S]*?</div>)"

ui_replacement = r"""\1

              <div className="mb-6">
                <label className="block text-sm font-bold text-white/80 mb-2">Modo de Jogo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGameMode('cacheta')}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold ${gameMode === 'cacheta' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/20'}`}
                  >
                    Cacheta (Pontos)
                  </button>
                  <button
                    onClick={() => setGameMode('pife')}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold ${gameMode === 'pife' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/20'}`}
                  >
                    Pife (Bateu, Levou)
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-white/80 mb-2">Modo do Curinga (Vira)</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCuringaMode('original')}
                    className={`flex-1 py-3 px-2 text-sm rounded-xl border-2 transition-all font-bold ${curingaMode === 'original' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/20'}`}
                  >
                    Naipe Original
                  </button>
                  <button
                    onClick={() => setCuringaMode('all')}
                    className={`flex-1 py-3 px-2 text-sm rounded-xl border-2 transition-all font-bold ${curingaMode === 'all' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/20'}`}
                  >
                    Todos os Naipes
                  </button>
                </div>
              </div>"""

l_content = re.sub(ui_search, ui_replacement, l_content)

modal_code = """
      {/* Modal de Ranking */}
      <AnimatePresence>
        {showRanking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-stone-900 border-2 border-amber-500/30 rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]"
            >
              <div className="p-6 bg-stone-800/50 flex justify-between items-center border-b border-white/5">
                <h3 className="text-2xl font-black text-amber-500 italic font-serif flex items-center gap-3">
                  <Trophy className="w-6 h-6" />
                  Top 10 Jogadores
                </h3>
                <button onClick={() => setShowRanking(false)} className="text-stone-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {rankings.map((u, i) => (
                  <div key={u.uid} className="flex items-center gap-4 bg-stone-800 p-3 rounded-2xl border border-white/5">
                    <div className="w-8 text-center font-black text-amber-500 text-xl">{i + 1}º</div>
                    <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-12 h-12 rounded-full border-2 border-amber-500/50" />
                    <div className="flex-1">
                      <div className="font-bold text-white">{u.displayName}</div>
                      <div className="text-xs text-amber-500/70 font-bold uppercase tracking-wider">{u.matchesWon || 0} vitórias</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
"""

l_content = l_content.replace("      {/* Modal Criar Sala */}", modal_code + "\n      {/* Modal Criar Sala */}")

with open('src/Lobby.tsx', 'w') as f:
    f.write(l_content)
