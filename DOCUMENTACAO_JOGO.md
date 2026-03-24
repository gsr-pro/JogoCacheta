# 🃏 Pife e Cacheta Online

## 📖 Visão Geral
- **Descrição do jogo**: Um jogo de cartas tradicional brasileiro, focado em estratégia e formação de jogos (trincas e sequências). Pode ser jogado em diversas variações, como Pife e Cacheta, com a presença de coringas definidos pelo "Vira".
- **Objetivo principal**: Ser o primeiro a "bater" (organizar todas as cartas na mão em combinações válidas) e eliminar os adversários através da pontuação.

## 👥 Número de Jogadores
- **Quantidade mínima e máxima**: De 2 a 10 jogadores.
- **Regras de mesa**: 
  - Até 6 jogadores: 2 baralhos (104 cartas).
  - 7 ou mais jogadores: 3 baralhos (156 cartas).
  - Cada mesa possui um cenário customizável (Bar, Churrasco, Praia, Sítio ou Quintal) e um valor de aposta inicial.

## 🎮 Regras do Jogo

### 🪪 Distribuição de Cartas
- **Quantidade de cartas por jogador**: 9 cartas inicialmente. Ao iniciar o turno, o jogador compra uma carta, totalizando 10, e deve descartar uma para voltar a 9.
- **Formação do monte**: As cartas restantes após a distribuição formam o "Monte" (Deck). Há também uma "Pilha de Descarte" (Lixo).

### 🔄 Turnos
- **Ordem de jogadas**: Sentido horário.
- **Ações possíveis por turno**:
  1. **Comprar**: O jogador da vez pode comprar uma carta do Monte ou a última carta descartada na Pilha de Descarte.
  2. **Descartar**: Após comprar, o jogador deve escolher uma carta de sua mão para descartar na Pilha.
  3. **Bater**: Se ao comprar a 10ª carta o jogador completar seus jogos, ele pode "Bater" e encerrar a rodada.

### 🧩 Combinações Válidas
- **Sequências**: 3 ou mais cartas do mesmo naipe em ordem consecutiva (ex: 4, 5 e 6 de Copas).
- **Trincas**: 3 ou mais cartas de mesmo valor, mas de naipes diferentes.
- **Coringa (Wildcard)**: Definido pela carta "Vira". O Coringa é o valor seguinte ao Vira (ex: se o Vira é 5, o Coringa é 6). Se o Vira for K (13), o Coringa é A (1).
- **Modos de Coringa**:
  - **Original**: Apenas o Coringa que possui o mesmo naipe do Vira é considerado.
  - **Todos (All)**: Todas as cartas com o valor definido são Coringas, independente do naipe.

### 🏁 Condição de Vitória
- **Como um jogador bate**: O jogador deve ter todas as 10 cartas organizadas em jogos (ex: duas trincas de 3 e uma sequência de 4, ou três jogos de 3 e descartar a 10ª carta validando o fechamento).
- **Regras de fechamento da rodada**: Ao bater, a rodada se encerra. Os outros jogadores perdem pontos.

## 🎲 Modos de Jogo

| Modo | Descrição | Pontuação | Fim de Partida |
|---|---|---|---|
| **Cacheta** | Modo clássico com múltiplas rodadas | Inicia com 10 pontos | Quando 1 jogador tem pontos e os demais chegaram a 0 |
| **Pife** | Partida rápida de 1 única rodada | Sem pontuação acumulada | Ao final da primeira rodada (quem bater ou sobrar como único vence) |

### Regras da Cacheta (múltiplas rodadas)
- Cada jogador começa com **10 pontos**.
- Ao final de cada rodada:
  - Perdedores (jogadores que não bateram): **-2 pontos**.
  - Jogador que "correu" (desistiu): **-1 ponto**.
- O jogador que bater vence a rodada (sem perda de pontos).
- A partida continua até restar apenas 1 jogador com pontos acima de 0.
- Ao terminar a rodada, um **overlay de vencedor** é exibido antes de reiniciar.

### Regras do Pife (rodada única)
- Uma única rodada determina o vencedor da partida.
- Quem bater primeiro, ou for o último sobrevivente (se todos correram), vence imediatamente.
- Não há acúmulo de pontos entre rodadas.

---

### 🚫 Regras Especiais
- **Correr (Fold)**: O jogador pode desistir da rodada antes de perder mais pontos, sofrendo uma penalidade menor.
- **Reembaralhar Lixo**: Se o deck acabar, a pilha de descarte (exceto a carta do topo) é reembaralhada para formar um novo monte.

---

## 💰 Sistema de Pontuação

- **Pontos Iniciais**: Cada jogador começa com 10 pontos.
- **Penalidades**: 
  - Perdedores da rodada: **-2 pontos**.
  - Jogador que "corre" (desiste): **-1 ponto**.
- **Eliminação**: O jogador é eliminado quando seus pontos chegam a 0.
- **Vitória Final**: O último jogador restante com pontos na mesa vence a partida.

⚠️ **REGRA OBRIGATÓRIA**:
- O jogador vencedor da rodada:
  - Ganha a partida.
  - Sobe no ranking.
  - Recebe **1 ficha como recompensa**.

---

## 🛒 Loja do Jogo

### 💵 Compra de Fichas
- **Pacotes disponíveis**:
  - 10 Fichas: R$ 2,90
  - 50 Fichas: R$ 9,90 (+10% Bônus)
  - 100 Fichas: R$ 17,90 (+25% Bônus)
- **Fichas Grátis**:
  - Resgate diário: 1 ficha.
  - Assistir anúncio: 1 ficha (limite de 3 por dia).
- **Moeda utilizada**: Real (BRL).

### 😀 Emojis e Animações de Vitória
- **Tipos disponíveis**: 
  - Padrão (Troféu)
  - Chamas (Fogo)
  - Raio (Zap)
  - Burro (Caveira)
  - Chorão (Frown)
- **Preço**: De 150 a 300 fichas.

### 🃏 Cartas e Customização
- **Versos de Cartas**: Clássico (Grátis), Ouro Puro (50 Fichas), Trevas (100 Fichas), Neon (150 Fichas).
- **Molduras de Avatar**: Clássica (Grátis), Rei do Camarote (80 Fichas), Cyberpunk (120 Fichas).

---

## 🏆 Ranking

- **Critérios de classificação**: Baseado no número de vitórias (`matchesWon`).
- **Sistema de Progressão**: O vencedor de cada partida sobe no ranking global.
- **Tipos de ranking**: Ranking Global (Top 10 exibido no Lobby).

---

## ⚙️ Regras Técnicas (Opcional)
- **Estados do Jogo**: `waiting` (esperando), `dealing` (distribuindo), `playing` (jogando), `finished` (finalizado).
- **Sincronização**: Utiliza Firebase Firestore para eventos em tempo real.
- **Bots**: Suporte a IA para jogos de treino utilizando lógica de prioridade de descarte.

---

## 📌 Observações
- **Passe Sem Anúncios**: Disponível por R$ 4,90 (Duração de 1 mês).
- **Chat**: Suporte a chat de voz e texto integrado nas mesas.
- **Voz**: Utiliza WebRTC/Firestore para comunicação por voz entre jogadores.
