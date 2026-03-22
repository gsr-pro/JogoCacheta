import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Zap, Star, Shield, Play, Loader2, Trophy, Flame, Skull, Frown } from 'lucide-react';
import { useGame } from '../GameContext';

interface StoreProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Store: React.FC<StoreProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile } = useGame();
  const [loadingAd, setLoadingAd] = useState(false);

  if (!isOpen || !profile) return null;

  const handleWatchAd = async () => {
    if (loadingAd) return;
    
    const today = new Date().toISOString().split('T')[0];
    const claimsToday = profile.lastAdClaimDate === today ? (profile.adClaimsToday || 0) : 0;
    
    if (claimsToday >= 3) {
      alert("Você já atingiu o limite de 3 fichas por anúncio hoje.");
      return;
    }

    setLoadingAd(true);
    
    // Simular assistir anúncio
    setTimeout(async () => {
      try {
        await updateProfile({
          coins: (profile.coins || 0) + 1,
          adClaimsToday: claimsToday + 1,
          lastAdClaimDate: today
        });
        alert("Você ganhou 1 Ficha!");
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAd(false);
      }
    }, 2000);
  };

  const buyItem = async (type: 'coins' | 'skin' | 'premium', id: string, cost: number, name: string) => {
    if (type !== 'coins' && (profile.coins || 0) < cost) {
      alert("Fichas insuficientes!");
      return;
    }

    try {
      if (type === 'coins') {
        // Simular compra com dinheiro real
        alert(`Simulando compra de ${name}...`);
        await updateProfile({
          coins: (profile.coins || 0) + cost
        });
      } else if (type === 'skin') {
        const inventory = profile.inventory || [];
        if (inventory.includes(id)) {
          alert("Você já possui este item!");
          return;
        }
        await updateProfile({
          coins: (profile.coins || 0) - cost,
          inventory: [...inventory, id]
        });
        alert(`Você comprou: ${name}!`);
      } else if (type === 'premium') {
        // Simular compra de Premium (R$ 4,90)
        alert(`Simulando compra do Passe Sem Anúncios...`);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        await updateProfile({
          premiumUntil: nextMonth.toISOString()
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const equipItem = async (category: 'cardBack' | 'avatarFrame' | 'winAnimation', id: string) => {
    try {
      await updateProfile({
        equipped: {
          ...(profile.equipped || {}),
          [category]: id
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const claimsToday = profile.lastAdClaimDate === today ? (profile.adClaimsToday || 0) : 0;
  const canWatchAd = claimsToday < 3;

  return (
    <AnimatePresence>
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
          className="bg-stone-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-stone-950">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-amber-500" />
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Loja do Boteco</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/30">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="text-amber-500 font-bold">{profile.coins} Fichas</span>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-8">
            
            {/* Fichas Grátis (Anúncio) */}
            {canWatchAd && (
              <div className="bg-gradient-to-r from-amber-900/40 to-stone-900 p-6 rounded-2xl border border-amber-500/30 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-amber-500" /> Ficha Grátis
                  </h3>
                  <p className="text-white/60 text-sm">Assista a um anúncio rápido para ganhar 1 ficha.</p>
                  <p className="text-amber-500 text-xs mt-1 font-bold">{3 - claimsToday} restantes hoje</p>
                </div>
                <button 
                  onClick={handleWatchAd}
                  disabled={loadingAd}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  {loadingAd ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assistir Anúncio'}
                </button>
              </div>
            )}

            {/* Premium */}
            {!profile.premiumUntil && (
              <div className="bg-gradient-to-r from-purple-900/40 to-stone-900 p-6 rounded-2xl border border-purple-500/30 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500" /> Passe Sem Anúncios
                  </h3>
                  <p className="text-white/60 text-sm">Jogue sem interrupções por 1 mês.</p>
                </div>
                <button 
                  onClick={() => buyItem('premium', 'no_ads_1m', 4.90, 'Passe Sem Anúncios')}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                >
                  R$ 4,90
                </button>
              </div>
            )}

            {/* Comprar Fichas */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm text-white/40">Comprar Fichas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'pack_10', amount: 10, price: 'R$ 2,90', bonus: '' },
                  { id: 'pack_50', amount: 50, price: 'R$ 9,90', bonus: '+10% Bônus' },
                  { id: 'pack_100', amount: 100, price: 'R$ 17,90', bonus: '+25% Bônus' },
                ].map(pack => (
                  <div key={pack.id} className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                    <Star className="w-12 h-12 text-amber-500 mb-2" />
                    <h4 className="text-2xl font-black text-white">{pack.amount}</h4>
                    <p className="text-white/40 text-sm mb-4">Fichas</p>
                    {pack.bonus && <span className="bg-green-500/20 text-green-500 text-xs font-bold px-2 py-1 rounded mb-4">{pack.bonus}</span>}
                    <button 
                      onClick={() => buyItem('coins', pack.id, pack.amount, `${pack.amount} Fichas`)}
                      className="w-full py-2 bg-white/10 hover:bg-amber-600 text-white rounded-lg font-bold transition-colors mt-auto"
                    >
                      {pack.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Skins - Versos de Cartas */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm text-white/40">Versos de Cartas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'card_classic', name: 'Clássico', cost: 0, color: 'bg-blue-800' },
                  { id: 'card_gold', name: 'Ouro Puro', cost: 50, color: 'bg-amber-500' },
                  { id: 'card_dark', name: 'Trevas', cost: 100, color: 'bg-stone-950' },
                  { id: 'card_neon', name: 'Neon', cost: 150, color: 'bg-fuchsia-600' },
                ].map(item => {
                  const isOwned = item.cost === 0 || (profile.inventory || []).includes(item.id);
                  const isEquipped = (profile.equipped?.cardBack || 'card_classic') === item.id;
                  
                  return (
                    <div key={item.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-colors ${isEquipped ? 'bg-amber-500/10 border-amber-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <div className={`w-16 h-24 rounded-lg mb-4 border-2 border-white/20 shadow-lg ${item.color}`}></div>
                      <h4 className="text-sm font-bold text-white mb-2">{item.name}</h4>
                      
                      {!isOwned ? (
                        <button 
                          onClick={() => buyItem('skin', item.id, item.cost, item.name)}
                          className="w-full py-1.5 bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded text-xs font-bold transition-colors"
                        >
                          {item.cost} Fichas
                        </button>
                      ) : (
                        <button 
                          onClick={() => equipItem('cardBack', item.id)}
                          disabled={isEquipped}
                          className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${isEquipped ? 'bg-amber-500 text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {isEquipped ? 'Equipado' : 'Equipar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skins - Molduras de Avatar */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm text-white/40">Molduras de Avatar</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'frame_classic', name: 'Clássica', cost: 0, style: 'border-white/20' },
                  { id: 'frame_gold', name: 'Rei do Camarote', cost: 80, style: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' },
                  { id: 'frame_neon', name: 'Cyberpunk', cost: 120, style: 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]' },
                ].map(item => {
                  const isOwned = item.cost === 0 || (profile.inventory || []).includes(item.id);
                  const isEquipped = (profile.equipped?.avatarFrame || 'frame_classic') === item.id;
                  
                  return (
                    <div key={item.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-colors ${isEquipped ? 'bg-amber-500/10 border-amber-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <div className={`w-16 h-16 rounded-full mb-4 border-4 ${item.style} bg-stone-800`}></div>
                      <h4 className="text-sm font-bold text-white mb-2">{item.name}</h4>
                      
                      {!isOwned ? (
                        <button 
                          onClick={() => buyItem('skin', item.id, item.cost, item.name)}
                          className="w-full py-1.5 bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded text-xs font-bold transition-colors"
                        >
                          {item.cost} Fichas
                        </button>
                      ) : (
                        <button 
                          onClick={() => equipItem('avatarFrame', item.id)}
                          disabled={isEquipped}
                          className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${isEquipped ? 'bg-amber-500 text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {isEquipped ? 'Equipado' : 'Equipar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skins - Animações de Vitória */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-widest text-sm text-white/40">Animações de Vitória (Zoeiras)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'anim_classic', name: 'Padrão', cost: 0, icon: Trophy },
                  { id: 'anim_fire', name: 'Chamas', cost: 150, icon: Flame },
                  { id: 'anim_lightning', name: 'Raio', cost: 200, icon: Zap },
                  { id: 'anim_donkey', name: 'Burro', cost: 250, icon: Skull },
                  { id: 'anim_cry', name: 'Chorão', cost: 300, icon: Frown },
                ].map(item => {
                  const isOwned = item.cost === 0 || (profile.inventory || []).includes(item.id);
                  const isEquipped = (profile.equipped?.winAnimation || 'anim_classic') === item.id;
                  
                  return (
                    <div key={item.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-colors ${isEquipped ? 'bg-amber-500/10 border-amber-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <item.icon className={`w-12 h-12 mb-4 ${isEquipped ? 'text-amber-500' : 'text-white/40'}`} />
                      <h4 className="text-sm font-bold text-white mb-2">{item.name}</h4>
                      
                      {!isOwned ? (
                        <button 
                          onClick={() => buyItem('skin', item.id, item.cost, item.name)}
                          className="w-full py-1.5 bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded text-xs font-bold transition-colors"
                        >
                          {item.cost} Fichas
                        </button>
                      ) : (
                        <button 
                          onClick={() => equipItem('winAnimation', item.id)}
                          disabled={isEquipped}
                          className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${isEquipped ? 'bg-amber-500 text-stone-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {isEquipped ? 'Equipado' : 'Equipar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
