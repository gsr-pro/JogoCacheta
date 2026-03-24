import { GameRules } from './types';

/**
 * Regras da Cacheta — Jogo de múltiplas rodadas com pontos.
 *
 * - Cada jogador começa com 10 pontos.
 * - Quem perde a rodada perde 2 pontos.
 * - Quem corre (fold) perde 1 ponto.
 * - A partida continua até que apenas 1 jogador tenha pontos > 0.
 * - Ao fim da rodada (com mais de 1 jogador com pontos), nova rodada inicia.
 */
export const cachetaRules: GameRules = {
  displayName: 'Cacheta',
  description: 'Múltiplas rodadas com pontos. Vence quem sobreviver com pontos.',
  INITIAL_SCORE: 10,
  ROUND_PENALTY: 2,  // Perdedores da rodada perdem 2 pontos
  FOLD_PENALTY: 1,   // Quem corre perde 1 ponto
  TURN_TIME_SECONDS: 15, // 15s para descartar após puxar carta
  isGameOver: (scores) => {
    const playersWithPoints = Object.values(scores).filter(s => s > 0);
    return playersWithPoints.length <= 1;
  },
  nextStatus: (scores) => {
    const playersWithPoints = Object.values(scores).filter(s => s > 0);
    return playersWithPoints.length <= 1 ? 'finished' : 'waiting';
  },
};
