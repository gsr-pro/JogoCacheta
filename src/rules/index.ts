import { GameRules } from './types';
import { pifeRules } from './pifeRules';
import { cachetaRules } from './cachetaRules';

export type { GameRules };
export { pifeRules, cachetaRules };

/**
 * Retorna as regras correspondentes ao modo de jogo informado.
 * @param gameMode 'pife' | 'cacheta' | undefined
 */
export function getRules(gameMode?: 'pife' | 'cacheta'): GameRules {
  if (gameMode === 'pife') return pifeRules;
  return cachetaRules; // Cacheta é o padrão
}
