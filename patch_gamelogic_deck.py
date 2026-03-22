with open('src/gameLogic.ts', 'r') as f:
    content = f.read()

content = content.replace("export function createDeck(): Card[] {", "export function createDeck(deckCount: number = 2): Card[] {")
content = content.replace("for (let b = 1; b <= 2; b++) {", "for (let b = 1; b <= deckCount; b++) {")

with open('src/gameLogic.ts', 'w') as f:
    f.write(content)
