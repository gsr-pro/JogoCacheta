import React from 'react';
import { useGame } from '../GameContext';

export const BannerAd: React.FC = () => {
  const { profile } = useGame();

  if (!profile) return null;

  // Check if user is premium
  if (profile.premiumUntil) {
    const premiumDate = new Date(profile.premiumUntil);
    if (premiumDate > new Date()) {
      return null; // Don't show ads for premium users
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-stone-900 border-t border-white/10 flex items-center justify-center z-40">
      <div className="text-white/40 text-sm flex items-center gap-2">
        <span className="px-2 py-1 bg-white/5 rounded text-xs uppercase tracking-widest">Ad</span>
        Espaço reservado para Banner de Anúncio (AdSense)
      </div>
    </div>
  );
};
