/**
 * Interface de regras de jogo.
 * Cada modo de jogo (Pife, Cacheta) implementa esta interface.
 */
export interface GameRules {
  /** Pontuação inicial de cada jogador */
  INITIAL_SCORE: number;
  /** Pontos deduzidos ao perder a rodada (não bateu) */
  ROUND_PENALTY: number;
  /** Pontos deduzidos ao correr (fold) */
  FOLD_PENALTY: number;
  /** Nome legível do modo de jogo */
  displayName: string;
  /** Descrição do modo */
  description: string;
  /**
   * Verifica se a partida está encerrada com base nas pontuações atuais.
   * @param scores mapa de uid -> pontuação
   */
  isGameOver: (scores: Record<string, number>) => boolean;
  /**
   * Dado que um jogador ganhou a rodada, retorna o status da sala.
   * 'finished' = partida encerrada | 'waiting' = nova rodada
   */
  nextStatus: (scores: Record<string, number>) => 'finished' | 'waiting';
}
