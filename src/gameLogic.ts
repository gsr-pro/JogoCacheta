import { Card } from './types';

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  // 2 baralhos (104 cartas)
  for (let b = 1; b <= 2; b++) {
    for (const suit of SUITS) {
      for (let i = 0; i < VALUES.length; i++) {
        deck.push({
          id: `${suit}_${VALUES[i]}_${b}`,
          suit,
          value: VALUES[i],
          label: LABELS[i]
        });
      }
    }
  }
  return shuffle(deck);
}

export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function validateWin(hand: Card[], vira?: Card): boolean {
  if (hand.length !== 10) return false;

  // Determine Curinga value
  let curingaValue = -1;
  if (vira) {
    curingaValue = vira.value === 13 ? 1 : vira.value + 1;
  }

  // Tenta todas as possibilidades de remover 1 carta e ver se as 9 restantes formam jogos
  for (let i = 0; i < hand.length; i++) {
    const handWithoutOne = hand.filter((_, idx) => idx !== i);
    if (findGames(handWithoutOne, curingaValue)) return true;
  }

  // Também verifica se as 10 cartas formam jogos (ex: 3+3+4)
  return findGames(hand, curingaValue);

  function findGames(remaining: Card[], curingaVal: number): boolean {
    if (remaining.length === 0) return true;
    if (remaining.length < 3) return false;

    // Separate curingas from normal cards
    const curingas = remaining.filter(c => c.value === curingaVal);
    const normals = remaining.filter(c => c.value !== curingaVal);

    // If we have enough curingas to form a group by themselves, we can just treat them as valid
    // But usually curingas are used to substitute.
    // To simplify, we'll use a recursive approach that tries to form valid groups
    
    // We need to form groups of 3 or 4 (or more).
    // Let's try to form a group starting with the first normal card.
    // If no normal cards, curingas alone can form a group.
    if (normals.length === 0) return true;

    const first = normals[0];
    
    // Try to form a Trinca (same value, different suits)
    // A trinca needs 3 or 4 cards.
    for (let size = 3; size <= 4; size++) {
      // Find other normals with the same value
      const sameValueNormals = normals.filter(c => c.value === first.value);
      // We need `size` cards. We have `sameValueNormals.length` normals.
      // We need `size - sameValueNormals.length` curingas.
      // Wait, a trinca must have different suits.
      // Let's just try all combinations of normals and curingas.
    }

    // Since Cacheta can be complex with Curingas, let's use a simpler backtracking approach.
    // We will generate all possible valid groups (trincas and sequencias) from the remaining cards.
    return backtrackGroups(remaining, curingaVal);
  }
}

function backtrackGroups(cards: Card[], curingaVal: number): boolean {
  if (cards.length === 0) return true;
  if (cards.length < 3) return false;

  const curingas = cards.filter(c => c.value === curingaVal);
  const normals = cards.filter(c => c.value !== curingaVal);

  if (normals.length === 0) return true;

  // Try to form a group with the first normal card
  const first = normals[0];
  const remainingNormals = normals.slice(1);

  // 1. Try Trincas (3 or 4 cards of same value, different suits)
  // Find all normals with the same value
  const sameValue = [first, ...remainingNormals.filter(c => c.value === first.value)];
  
  // Try forming groups of size 3 or 4
  for (let size = 3; size <= 4; size++) {
    for (let n = 1; n <= Math.min(size, sameValue.length); n++) {
      const neededCuringas = size - n;
      if (neededCuringas <= curingas.length) {
        // We need to pick `n` normals from `sameValue` (including `first`).
        const combos = getCombinations(sameValue.filter(c => c.id !== first.id), n - 1);
        for (const combo of combos) {
          const groupNormals = [first, ...combo];
          // Check if all normals in this group have different suits
          const uniqueSuits = new Set(groupNormals.map(c => c.suit));
          if (uniqueSuits.size === groupNormals.length) {
            const nextCards = [
              ...normals.filter(c => !groupNormals.find(gn => gn.id === c.id)),
              ...curingas.slice(neededCuringas)
            ];
            if (backtrackGroups(nextCards, curingaVal)) return true;
          }
        }
      }
    }
  }

  // 2. Try Sequencias (3 or more cards of same suit, consecutive values)
  // Find all normals of the same suit
  const sameSuit = [first, ...remainingNormals.filter(c => c.suit === first.suit)];
  // Sort by value
  sameSuit.sort((a, b) => a.value - b.value);
  
  // Try all possible sequences starting or including `first`
  // A sequence has a start value and a length (at least 3).
  // The `first` card must be in the sequence.
  for (let len = 3; len <= sameSuit.length + curingas.length; len++) {
    // The sequence can start anywhere such that `first` is included.
    // The value of `first` is `first.value`.
    // Start value can range from `first.value - len + 1` to `first.value`.
    const minStart = Math.max(1, first.value - len + 1);
    const maxStart = Math.min(13 - len + 1, first.value);
    
    for (let start = minStart; start <= maxStart; start++) {
      let neededCuringas = 0;
      const groupNormals: Card[] = [];
      let valid = true;
      
      for (let v = start; v < start + len; v++) {
        const card = sameSuit.find(c => c.value === v);
        if (card) {
          groupNormals.push(card);
        } else {
          neededCuringas++;
        }
      }
      
      if (neededCuringas <= curingas.length) {
        const nextCards = [
          ...normals.filter(c => !groupNormals.find(gn => gn.id === c.id)),
          ...curingas.slice(neededCuringas)
        ];
        if (backtrackGroups(nextCards, curingaVal)) return true;
      }
    }
  }

  return false;
}

function getCombinations<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  function helper(start: number, current: T[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      helper(i + 1, current);
      current.pop();
    }
  }
  helper(0, []);
  return result;
}

export const INITIAL_SCORE = 10;
export const PENALTY = 2;

export function botPlay(hand: Card[], discardPile: Card[], deck: Card[], vira?: Card): { action: 'draw_deck' | 'draw_discard', discardId: string } {
  // Simple Bot Logic:
  // 1. Check if top of discard pile helps form a game
  const topDiscard = discardPile[discardPile.length - 1];
  let action: 'draw_deck' | 'draw_discard' = 'draw_deck';
  
  if (topDiscard) {
    const handWithDiscard = [...hand, topDiscard];
    // If discard helps, draw it (simplified check)
    if (countPotentialGames(handWithDiscard, vira) > countPotentialGames(hand, vira)) {
      action = 'draw_discard';
    }
  }

  // 2. Draw
  const currentHand = action === 'draw_discard' ? [...hand, topDiscard] : [...hand, deck[deck.length - 1]];
  
  // 3. Discard the "worst" card (one that doesn't fit any potential game)
  let worstCardId = currentHand[0].id;
  let minPotential = 100;
  
  for (const card of currentHand) {
    const withoutCard = currentHand.filter(c => c.id !== card.id);
    const potential = countPotentialGames(withoutCard, vira);
    if (potential < minPotential) {
      minPotential = potential;
      worstCardId = card.id;
    }
  }

  return { action, discardId: worstCardId };
}

function countPotentialGames(hand: Card[], vira?: Card): number {
  let curingaValue = -1;
  if (vira) {
    curingaValue = vira.value === 13 ? 1 : vira.value + 1;
  }

  // Simplified: count pairs or sequences of 2, and curingas
  let count = 0;
  for (let i = 0; i < hand.length; i++) {
    const c1 = hand[i];
    if (c1.value === curingaValue) {
      count += 2; // Curingas are very valuable
      continue;
    }
    for (let j = i + 1; j < hand.length; j++) {
      const c2 = hand[j];
      if (c2.value === curingaValue) continue;
      
      if (c1.value === c2.value) count++;
      if (c1.suit === c2.suit && Math.abs(c1.value - c2.value) === 1) count++;
    }
  }
  return count;
}
