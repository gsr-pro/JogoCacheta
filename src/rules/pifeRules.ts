import { GameRules } from './types';

/**
 * Regras do Pife — Partida rápida de 1 única rodada.
 *
 * - Quem bater primeiro vence toda a partida.
 * - Se todos correram, o último sobrevivente vence.
 * - Não há acumulação de pontos entre rodadas.
 */
export const pifeRules: GameRules = {
  displayName: 'Pife',
  description: 'Partida de 1 única rodada. Quem bater primeiro vence tudo.',
  INITIAL_SCORE: 10,
  ROUND_PENALTY: 0,   // Pife não penaliza pois a partida já encerra
  FOLD_PENALTY: 0,    // Correr no Pife não deduz; a rodada única simplesmente encerra
  isGameOver: (_scores) => {
    // No Pife, o jogo SEMPRE termina após a primeira rodada
    return true;
  },
  nextStatus: (_scores) => 'finished',
};
