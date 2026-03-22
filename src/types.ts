import { FirebaseUser } from './firebase';

export interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: number; // 1-13 (A-K)
  label: string;
}

export type Scenario = 'bar' | 'churrasco' | 'praia' | 'sitio' | 'quintal';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  coins: number; // Fichas
  matchesWon: number;
  matchesPlayed: number;
  createdAt: any;
  lastSeen: any;
  preferredScenario?: Scenario;
  
  // Economia e Loja
  lastDailyClaim?: string; // Formato YYYY-MM-DD
  adClaimsToday?: number;
  lastAdClaimDate?: string; // Formato YYYY-MM-DD
  
  // Customização
  inventory?: string[]; // IDs dos itens comprados
  equipped?: {
    cardBack?: string;
    avatarFrame?: string;
    winAnimation?: string;
  };
  
  // Premium / Sem Anúncios
  premiumUntil?: any; // Timestamp do Firestore
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromPhoto: string | null;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface Friendship {
  id: string;
  uids: string[]; // [uid1, uid2]
  createdAt: any;
}

export interface Invite {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  roomId: string;
  roomName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface JoinRequest {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Room {
  gameMode?: 'pife' | 'cacheta';
  curingaMode?: 'original' | 'all';
  id: string;
  name: string;
  status: 'waiting' | 'dealing' | 'decision' | 'playing' | 'finished';
  scenario: Scenario;
  betAmount: number;
  maxPlayers: number;
  playerIds: string[];
  playerNames: string[];
  playerPhotos: string[];
  playerScores: { [uid: string]: number };
  currentTurnIndex: number;
  deck: Card[];
  discardPile: Card[];
  vira?: Card;
  winnerId: string | null;
  createdAt: any;
  lastActionAt: any;
  isBotGame: boolean;
  creatorId: string;
  pendingRequests?: JoinRequest[];
}

export interface PlayerState {
  userId: string;
  hand: Card[];
  isReady: boolean;
  isFolded?: boolean;
  decisionMade?: boolean;
}

export interface GameState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}
