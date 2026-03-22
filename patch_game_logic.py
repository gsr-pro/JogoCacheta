import re

with open('src/gameLogic.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "export function validateWin(hand: Card[], vira?: Card): boolean {",
    "export function validateWin(hand: Card[], vira?: Card, curingaMode: 'original' | 'all' = 'original'): boolean {"
)

content = content.replace(
    "if (findGames(handWithoutOne, curingaValue)) return true;",
    "if (findGames(handWithoutOne, curingaValue, vira?.suit, curingaMode)) return true;"
)

content = content.replace(
    "return findGames(hand, curingaValue);",
    "return findGames(hand, curingaValue, vira?.suit, curingaMode);"
)

content = content.replace(
    "function findGames(remaining: Card[], curingaVal: number): boolean {",
    "function findGames(remaining: Card[], curingaVal: number, viraSuit?: Card['suit'], curingaMode: 'original' | 'all' = 'original'): boolean {"
)

content = content.replace(
    "const curingas = remaining.filter(c => c.value === curingaVal);",
    "const curingas = remaining.filter(c => c.value === curingaVal && (curingaMode === 'all' || c.suit === viraSuit));"
)

content = content.replace(
    "const normals = remaining.filter(c => c.value !== curingaVal);",
    "const normals = remaining.filter(c => !(c.value === curingaVal && (curingaMode === 'all' || c.suit === viraSuit)));"
)

content = content.replace(
    "return backtrackGroups(remaining, curingaVal);",
    "return backtrackGroups(remaining, curingaVal, viraSuit, curingaMode);"
)

content = content.replace(
    "function backtrackGroups(cards: Card[], curingaVal: number): boolean {",
    "function backtrackGroups(cards: Card[], curingaVal: number, viraSuit?: Card['suit'], curingaMode: 'original' | 'all' = 'original'): boolean {"
)

content = content.replace(
    "const curingas = cards.filter(c => c.value === curingaVal);",
    "const curingas = cards.filter(c => c.value === curingaVal && (curingaMode === 'all' || c.suit === viraSuit));"
)

content = content.replace(
    "const normals = cards.filter(c => c.value !== curingaVal);",
    "const normals = cards.filter(c => !(c.value === curingaVal && (curingaMode === 'all' || c.suit === viraSuit)));"
)

content = content.replace(
    "if (backtrackGroups(nextCards, curingaVal)) return true;",
    "if (backtrackGroups(nextCards, curingaVal, viraSuit, curingaMode)) return true;"
)

with open('src/gameLogic.ts', 'w') as f:
    f.write(content)
