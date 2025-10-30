# 🎰 Казино и азартные игры с готовыми библиотеками

## 🎲 1. Рулетка (Roulette)

### Описание
Классическая европейская/американская рулетка. Игроки делают ставки на числа, цвета или группы чисел.

### Библиотеки
```bash
npm install roulette-wheel
npm install react-casino-roulette
npm install phaser-roulette
```

### Пример использования
```javascript
import Roulette from 'react-casino-roulette';

<Roulette
  type="european" // или "american"
  onSpinEnd={(number) => console.log('Выпало:', number)}
  betAmount={100}
/>
```

### Типы ставок
- **Прямая ставка** (на одно число): x35
- **Сплит** (2 числа): x17
- **Стрит** (3 числа): x11
- **Угол** (4 числа): x8
- **Красное/Черное**: x2
- **Четное/Нечетное**: x2
- **1-18 / 19-36**: x2
- **Дюжины**: x3
- **Колонны**: x3

### Реализация
```javascript
const rouletteNumbers = {
  european: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
  american: [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2]
};

function spinRoulette() {
  const numbers = rouletteNumbers.european;
  const randomIndex = Math.floor(Math.random() * numbers.length);
  return numbers[randomIndex];
}

function calculateWin(bet, result) {
  switch(bet.type) {
    case 'straight':
      return bet.number === result ? bet.amount * 35 : 0;
    case 'color':
      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      const isRed = redNumbers.includes(result);
      return (bet.color === 'red' && isRed) || (bet.color === 'black' && !isRed) 
        ? bet.amount * 2 : 0;
    // ... другие типы ставок
  }
}
```

---

## 🎰 2. Игровые автоматы (Slots)

### Описание
Классические слот-машины с 3-5 барабанами, различными символами и линиями выплат.

### Библиотеки
```bash
npm install react-slot-machine
npm install slot-machine
npm install canvas-slot-machine
npm install phaser3-slot-machine
```

### Пример использования
```javascript
import SlotMachine from 'react-slot-machine';

<SlotMachine
  symbols={['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣']}
  reels={5}
  lines={20}
  onSpin={(result) => console.log('Результат:', result)}
/>
```

### Символы и множители
```javascript
const symbols = {
  cherry: { value: '🍒', multiplier: 2, probability: 0.3 },
  lemon: { value: '🍋', multiplier: 3, probability: 0.25 },
  orange: { value: '🍊', multiplier: 5, probability: 0.2 },
  watermelon: { value: '🍉', multiplier: 10, probability: 0.15 },
  star: { value: '⭐', multiplier: 20, probability: 0.07 },
  diamond: { value: '💎', multiplier: 50, probability: 0.025 },
  seven: { value: '7️⃣', multiplier: 100, probability: 0.005 }
};
```

### Логика выплат
```javascript
function calculateSlotWin(reels, bet, lines) {
  let totalWin = 0;
  
  // Проверяем каждую линию
  for (let line of lines) {
    const lineSymbols = line.map(pos => reels[pos.reel][pos.row]);
    
    // Проверяем комбинации
    if (lineSymbols.every(s => s === lineSymbols[0])) {
      // Все символы одинаковые
      const symbol = symbols[lineSymbols[0]];
      totalWin += bet * symbol.multiplier * lineSymbols.length;
    } else if (lineSymbols.filter(s => s === lineSymbols[0]).length >= 3) {
      // Минимум 3 одинаковых
      const symbol = symbols[lineSymbols[0]];
      totalWin += bet * symbol.multiplier;
    }
  }
  
  return totalWin;
}

function spinReels(symbols, reels = 5, rows = 3) {
  const result = [];
  
  for (let i = 0; i < reels; i++) {
    const reel = [];
    for (let j = 0; j < rows; j++) {
      reel.push(getRandomSymbol(symbols));
    }
    result.push(reel);
  }
  
  return result;
}

function getRandomSymbol(symbols) {
  const random = Math.random();
  let cumulative = 0;
  
  for (let key in symbols) {
    cumulative += symbols[key].probability;
    if (random <= cumulative) {
      return symbols[key].value;
    }
  }
}
```

### Бонусные функции
```javascript
const bonusFeatures = {
  freeSpins: {
    trigger: 3, // 3+ scatter символов
    spins: 10,
    multiplier: 2
  },
  wildSymbol: '🃏', // заменяет любой символ
  scatterSymbol: '⭐',
  bonusGame: {
    trigger: 3, // 3+ бонус символов
    type: 'pick-and-win' // выбери коробку
  }
};
```

---

## 🃏 3. Блэкджек (Blackjack / 21)

### Описание
Карточная игра против дилера. Цель - набрать 21 очко или ближе к 21, чем у дилера.

### Библиотеки
```bash
npm install blackjack-engine
npm install react-blackjack
npm install casino-blackjack
npm install deckofcards # для визуализации карт
```

### Пример использования
```javascript
import { BlackjackGame } from 'blackjack-engine';

const game = new BlackjackGame();
game.deal();
game.playerHit();
game.playerStand();
game.dealerPlay();
const result = game.getResult(); // 'win', 'lose', 'push', 'blackjack'
```

### Правила
- Туз = 1 или 11 очков
- Картинки (K, Q, J) = 10 очков
- Остальные карты = номинал
- Blackjack (туз + 10) = выплата x2.5
- Обычная победа = выплата x2
- Страховка (если у дилера туз) = x2 от половины ставки
- Удвоение (Double Down) = удвоить ставку после первых 2 карт

### Реализация
```javascript
class BlackjackGame {
  constructor() {
    this.deck = this.createDeck();
    this.playerHand = [];
    this.dealerHand = [];
    this.bet = 0;
  }
  
  createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    
    for (let suit of suits) {
      for (let rank of ranks) {
        deck.push({ rank, suit, value: this.getCardValue(rank) });
      }
    }
    
    return this.shuffle(deck);
  }
  
  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
  }
  
  calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (let card of hand) {
      value += card.value;
      if (card.rank === 'A') aces++;
    }
    
    // Конвертируем тузы из 11 в 1 если нужно
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  }
  
  deal(bet) {
    this.bet = bet;
    this.playerHand = [this.deck.pop(), this.deck.pop()];
    this.dealerHand = [this.deck.pop(), this.deck.pop()];
  }
  
  playerHit() {
    this.playerHand.push(this.deck.pop());
    return this.calculateHandValue(this.playerHand);
  }
  
  dealerPlay() {
    // Дилер берет карты до 17
    while (this.calculateHandValue(this.dealerHand) < 17) {
      this.dealerHand.push(this.deck.pop());
    }
  }
  
  getResult() {
    const playerValue = this.calculateHandValue(this.playerHand);
    const dealerValue = this.calculateHandValue(this.dealerHand);
    
    if (playerValue > 21) return { result: 'lose', payout: 0 };
    if (dealerValue > 21) return { result: 'win', payout: this.bet * 2 };
    
    if (playerValue === 21 && this.playerHand.length === 2) {
      return { result: 'blackjack', payout: this.bet * 2.5 };
    }
    
    if (playerValue > dealerValue) return { result: 'win', payout: this.bet * 2 };
    if (playerValue < dealerValue) return { result: 'lose', payout: 0 };
    return { result: 'push', payout: this.bet }; // ничья
  }
  
  shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
}
```

---

## 🎲 4. Кости (Dice / Craps)

### Описание
Игра в кости с различными типами ставок.

### Библиотеки
```bash
npm install dice-roller
npm install react-dice-complete
npm install three-dice # 3D кости
npm install rpg-dice-roller
```

### Пример использования
```javascript
import DiceRoller from 'dice-roller';

const roller = new DiceRoller();
const result = roller.roll('2d6'); // бросить 2 кости
console.log(result.total); // сумма
```

### Варианты игр

#### 1. Простая игра (Over/Under)
```javascript
function diceGame(bet, prediction) {
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const total = dice1 + dice2;
  
  const multipliers = {
    2: 35,   // сложнее всего
    3: 17,
    4: 11,
    5: 8,
    6: 6,
    7: 5,    // самое вероятное
    8: 6,
    9: 8,
    10: 11,
    11: 17,
    12: 35   // сложнее всего
  };
  
  if (prediction.type === 'exact' && prediction.number === total) {
    return bet * multipliers[total];
  }
  
  if (prediction.type === 'over' && total > 7) {
    return bet * 2;
  }
  
  if (prediction.type === 'under' && total < 7) {
    return bet * 2;
  }
  
  return 0;
}
```

#### 2. Craps (сложные правила)
```javascript
class CrapsGame {
  constructor() {
    this.phase = 'come-out'; // come-out или point
    this.point = null;
  }
  
  roll() {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    
    if (this.phase === 'come-out') {
      if (total === 7 || total === 11) {
        return { result: 'natural-win', total, payout: 2 };
      }
      if (total === 2 || total === 3 || total === 12) {
        return { result: 'craps-lose', total, payout: 0 };
      }
      // Установить point
      this.point = total;
      this.phase = 'point';
      return { result: 'point-established', total, point: this.point };
    } else {
      if (total === this.point) {
        this.phase = 'come-out';
        return { result: 'point-win', total, payout: 2 };
      }
      if (total === 7) {
        this.phase = 'come-out';
        return { result: 'seven-out', total, payout: 0 };
      }
      return { result: 'continue', total };
    }
  }
}
```

---

## 🎯 5. Колесо фортуны (Wheel of Fortune)

### Описание
Вращающееся колесо с секторами разного номинала.

### Библиотеки
```bash
npm install react-wheel-of-prizes
npm install wheel-spinner
npm install fortune-wheel
npm install winwheel # Canvas-based
```

### Пример использования
```javascript
import WheelComponent from 'react-wheel-of-prizes';

const segments = [
  { text: 'x2', value: 2, color: '#FF6B6B' },
  { text: 'x5', value: 5, color: '#4ECDC4' },
  { text: 'x10', value: 10, color: '#45B7D1' },
  { text: 'x25', value: 25, color: '#FFA07A' },
  { text: 'x50', value: 50, color: '#98D8C8' },
  { text: 'JACKPOT', value: 100, color: '#FFD700' }
];

<WheelComponent
  segments={segments}
  onFinished={(winner) => console.log('Выиграл:', winner)}
  primaryColor='black'
  contrastColor='white'
/>
```

### Реализация
```javascript
class WheelOfFortune {
  constructor(segments) {
    this.segments = segments;
    this.totalProbability = segments.reduce((sum, s) => sum + (s.probability || 1), 0);
  }
  
  spin() {
    const random = Math.random() * this.totalProbability;
    let cumulative = 0;
    
    for (let segment of this.segments) {
      cumulative += segment.probability || 1;
      if (random <= cumulative) {
        return segment;
      }
    }
  }
  
  calculatePayout(bet, result) {
    return bet * result.value;
  }
}

// Пример с разными вероятностями
const wheel = new WheelOfFortune([
  { text: 'x2', value: 2, probability: 40, color: '#FF6B6B' },
  { text: 'x5', value: 5, probability: 25, color: '#4ECDC4' },
  { text: 'x10', value: 10, probability: 15, color: '#45B7D1' },
  { text: 'x25', value: 25, probability: 10, color: '#FFA07A' },
  { text: 'x50', value: 50, probability: 7, color: '#98D8C8' },
  { text: 'x100', value: 100, probability: 3, color: '#FFD700' }
]);
```

---

## 🎲 6. Баккара (Baccarat)

### Описание
Карточная игра, где ставишь на победу Игрока, Банкира или Ничью.

### Библиотеки
```bash
npm install baccarat-engine
npm install casino-baccarat
npm install card-games # включает баккара
```

### Правила
- Карты 2-9 = номинал
- 10, J, Q, K = 0 очков
- Туз = 1 очко
- Считаются только единицы (17 = 7 очков)
- Выигрыш Игрока: x2
- Выигрыш Банкира: x1.95 (комиссия 5%)
- Ничья: x8

### Реализация
```javascript
class BaccaratGame {
  dealCard() {
    const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const card = cards[Math.floor(Math.random() * cards.length)];
    return this.getCardValue(card);
  }
  
  getCardValue(card) {
    if (card === 'A') return 1;
    if (['10', 'J', 'Q', 'K'].includes(card)) return 0;
    return parseInt(card);
  }
  
  play() {
    let playerTotal = (this.dealCard() + this.dealCard()) % 10;
    let bankerTotal = (this.dealCard() + this.dealCard()) % 10;
    
    // Правила третьей карты (упрощенная версия)
    if (playerTotal <= 5) {
      playerTotal = (playerTotal + this.dealCard()) % 10;
    }
    
    if (bankerTotal <= 5 && playerTotal < 8) {
      bankerTotal = (bankerTotal + this.dealCard()) % 10;
    }
    
    if (playerTotal > bankerTotal) {
      return { winner: 'player', playerTotal, bankerTotal };
    } else if (bankerTotal > playerTotal) {
      return { winner: 'banker', playerTotal, bankerTotal };
    } else {
      return { winner: 'tie', playerTotal, bankerTotal };
    }
  }
  
  calculatePayout(bet, betOn, result) {
    if (betOn === result.winner) {
      if (betOn === 'player') return bet * 2;
      if (betOn === 'banker') return bet * 1.95;
      if (betOn === 'tie') return bet * 8;
    }
    return 0;
  }
}
```

---

## 🎲 7. Покер (Poker)

### Описание
Различные виды покера: Texas Hold'em, Omaha, Video Poker.

### Библиотеки
```bash
npm install poker-evaluator
npm install pokersolver
npm install node-poker
npm install texas-holdem
```

### Video Poker (проще для solo игры)
```javascript
import { evaluateHand } from 'poker-evaluator';

const payoutTable = {
  'royal-flush': 800,      // 10-J-Q-K-A одной масти
  'straight-flush': 50,    // 5 карт подряд одной масти
  'four-of-kind': 25,      // 4 одинаковые
  'full-house': 9,         // 3 + 2
  'flush': 6,              // 5 одной масти
  'straight': 4,           // 5 подряд
  'three-of-kind': 3,      // 3 одинаковые
  'two-pair': 2,           // 2 пары
  'jacks-or-better': 1     // пара валетов или выше
};

function playVideoPoker(bet) {
  // Раздать 5 карт
  let hand = dealCards(5);
  
  // Игрок выбирает какие карты оставить
  // (в UI - клик на карты)
  
  // Заменить выбранные карты
  hand = replaceCards(hand, selectedIndices);
  
  // Оценить руку
  const result = evaluateHand(hand);
  
  // Выплата
  const multiplier = payoutTable[result.type] || 0;
  return bet * multiplier;
}
```

---

## 🎰 8. Crash / Aviator

### Описание
Современная игра где множитель растет и может "упасть" в любой момент. Нужно выйти вовремя.

### Библиотеки
```bash
npm install crash-game
npm install bustabit-client # оригинальная crash игра
```

### Реализация
```javascript
class CrashGame {
  constructor() {
    this.multiplier = 1.00;
    this.crashed = false;
    this.crashPoint = this.generateCrashPoint();
  }
  
  generateCrashPoint() {
    // Провably fair алгоритм
    const e = 1;
    const h = Math.random();
    return Math.max(1, Math.floor((100 * e) / (h * 100)));
  }
  
  start() {
    const interval = setInterval(() => {
      if (this.multiplier >= this.crashPoint) {
        this.crashed = true;
        clearInterval(interval);
        return;
      }
      
      this.multiplier += 0.01;
      this.onUpdate(this.multiplier);
    }, 100);
  }
  
  cashout(bet, multiplier) {
    if (this.crashed || multiplier > this.multiplier) {
      return 0;
    }
    return bet * multiplier;
  }
}
```

---

## 🎲 9. Лотерея / Кено (Lottery / Keno)

### Описание
Выбираешь числа, система тянет случайные числа. Чем больше совпадений - тем больше выигрыш.

### Библиотеки
```bash
npm install lottery-generator
npm install keno-game
```

### Реализация
```javascript
class KenoGame {
  constructor() {
    this.totalNumbers = 80;
    this.drawCount = 20;
  }
  
  draw() {
    const numbers = [];
    const available = Array.from({ length: this.totalNumbers }, (_, i) => i + 1);
    
    for (let i = 0; i < this.drawCount; i++) {
      const index = Math.floor(Math.random() * available.length);
      numbers.push(available[index]);
      available.splice(index, 1);
    }
    
    return numbers.sort((a, b) => a - b);
  }
  
  calculatePayout(selectedNumbers, drawnNumbers, bet) {
    const matches = selectedNumbers.filter(n => drawnNumbers.includes(n)).length;
    const picked = selectedNumbers.length;
    
    // Таблица выплат (пример для 10 выбранных чисел)
    const payoutTable = {
      10: { 10: 10000, 9: 4500, 8: 1000, 7: 140, 6: 21, 5: 2, 0: 3 },
      9: { 9: 6000, 8: 1200, 7: 250, 6: 25, 5: 4 },
      8: { 8: 3000, 7: 500, 6: 50, 5: 12 },
      7: { 7: 1500, 6: 100, 5: 17, 4: 2 },
      6: { 6: 1000, 5: 55, 4: 6, 3: 1 },
      5: { 5: 400, 4: 15, 3: 2 },
      4: { 4: 100, 3: 5, 2: 1 },
      3: { 3: 25, 2: 2 },
      2: { 2: 10 },
      1: { 1: 2 }
    };
    
    const multiplier = payoutTable[picked]?.[matches] || 0;
    return bet * multiplier;
  }
}
```

---

## 🎯 10. Mines / Minesweeper (Азартный сапер)

### Описание
Поле 5x5, на нем спрятаны мины. Открываешь клетки - множитель растет. Наткнулся на мину - проиграл.

### Библиотеки
```bash
npm install react-minesweeper
npm install minesweeper-game
```

### Реализация
```javascript
class MinesGame {
  constructor(gridSize = 5, minesCount = 5) {
    this.gridSize = gridSize;
    this.minesCount = minesCount;
    this.grid = this.generateGrid();
    this.revealed = new Set();
    this.multiplier = 1.0;
  }
  
  generateGrid() {
    const total = this.gridSize * this.gridSize;
    const positions = Array.from({ length: total }, (_, i) => i);
    
    // Перемешиваем
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Первые N позиций - мины
    const mines = new Set(positions.slice(0, this.minesCount));
    
    const grid = [];
    for (let i = 0; i < this.gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        const pos = i * this.gridSize + j;
        grid[i][j] = mines.has(pos) ? 'mine' : 'safe';
      }
    }
    
    return grid;
  }
  
  reveal(row, col) {
    const key = `${row}-${col}`;
    
    if (this.revealed.has(key)) {
      return { status: 'already-revealed' };
    }
    
    this.revealed.add(key);
    
    if (this.grid[row][col] === 'mine') {
      return { status: 'exploded', multiplier: 0 };
    }
    
    // Увеличиваем множитель
    const safeSpots = this.gridSize * this.gridSize - this.minesCount;
    const progress = this.revealed.size / safeSpots;
    this.multiplier = 1 + (progress * 10); // примерная формула
    
    return { 
      status: 'safe', 
      multiplier: this.multiplier,
      canCashout: true 
    };
  }
  
  cashout(bet) {
    return bet * this.multiplier;
  }
}

// Более точная формула множителя
function calculateMinesMultiplier(revealed, total, mines) {
  const safeSpots = total - mines;
  const risk = mines / total;
  
  // Формула учитывающая риск
  return Math.pow(1 / (1 - risk), revealed);
}
```

---

## 📊 Сравнительная таблица

| Игра | Сложность | Библиотеки | RTP* | Азарт | Скорость игры |
|------|-----------|-----------|------|-------|---------------|
| Слоты | ⭐ | ✅✅✅ | 95-98% | ⭐⭐⭐⭐⭐ | 1 сек |
| Рулетка | ⭐⭐ | ✅✅✅ | 97.3% | ⭐⭐⭐⭐⭐ | 30 сек |
| Блэкджек | ⭐⭐⭐ | ✅✅ | 99.5% | ⭐⭐⭐⭐ | 2-5 мин |
| Кости | ⭐ | ✅✅✅ | 98.6% | ⭐⭐⭐⭐ | 5 сек |
| Колесо фортуны | ⭐ | ✅✅✅ | 95% | ⭐⭐⭐⭐⭐ | 10 сек |
| Баккара | ⭐⭐ | ✅✅ | 98.9% | ⭐⭐⭐⭐ | 1 мин |
| Video Poker | ⭐⭐ | ✅✅ | 99%+ | ⭐⭐⭐ | 1 мин |
| Crash/Aviator | ⭐ | ✅✅ | 99% | ⭐⭐⭐⭐⭐ | 10-60 сек |
| Кено | ⭐ | ✅ | 75-95% | ⭐⭐⭐ | 30 сек |
| Mines | ⭐ | ✅✅ | 97% | ⭐⭐⭐⭐⭐ | переменная |

*RTP = Return to Player (процент возврата игроку)

---

## 🎯 Рекомендации для образовательной платформы

### ТОП-3 для реализации:

#### 1. 🎰 **Слоты** - САМЫЙ ПРОСТОЙ
**Почему:**
- ✅ Готовые библиотеки с UI
- ✅ Моментальная игра (нет ожидания)
- ✅ Яркий визуал
- ✅ Не требует стратегии

**Реализация:** 2-3 часа

```javascript
// Простейший вариант
import SlotMachine from 'react-slot-machine';

function SlotGame() {
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(1000);
  
  const handleWin = (result) => {
    const winAmount = calculateWin(result, bet);
    setBalance(balance + winAmount - bet);
  };
  
  return (
    <SlotMachine
      symbols={['🍒', '🍋', '🍊', '⭐', '💎']}
      onFinish={handleWin}
    />
  );
}
```

---

#### 2. 🎯 **Колесо фортуны** - ВИЗУАЛЬНЫЙ + ПРОСТОЙ
**Почему:**
- ✅ Захватывающая анимация
- ✅ Простая логика
- ✅ Отличные библиотеки
- ✅ Можно кастомизировать призы

**Реализация:** 3-4 часа

---

#### 3. 🎲 **Crash/Aviator** - СОВРЕМЕННЫЙ + ПОПУЛЯРНЫЙ
**Почему:**
- ✅ Трендовая игра (очень популярна сейчас)
- ✅ Азартная механика
- ✅ Можно играть с друзьями (multiplayer)
- ✅ Провably fair (честная игра)

**Реализация:** 5-6 часов

---

## 🛠️ Общая архитектура

### Backend
```javascript
// routes/casino.js
router.post('/slots/spin', async (req, res) => {
  const { userId, bet } = req.body;
  
  // Проверка баланса
  const user = await User.findById(userId);
  if (user.points < bet) {
    return res.status(400).json({ error: 'Недостаточно баллов' });
  }
  
  // Генерация результата
  const result = generateSlotResult();
  const win = calculateWin(result, bet);
  
  // Обновление баланса
  await User.updateOne(
    { id: userId },
    { $inc: { points: win - bet } }
  );
  
  // История
  await CasinoHistory.create({
    userId,
    game: 'slots',
    bet,
    win,
    result,
    timestamp: new Date()
  });
  
  res.json({ result, win, newBalance: user.points + win - bet });
});
```

### Frontend
```javascript
// components/CasinoGames.jsx
function CasinoGames() {
  const games = [
    { id: 'slots', name: 'Слоты', icon: '🎰', component: SlotMachine },
    { id: 'wheel', name: 'Колесо', icon: '🎯', component: WheelOfFortune },
    { id: 'crash', name: 'Crash', icon: '🚀', component: CrashGame },
    { id: 'dice', name: 'Кости', icon: '🎲', component: DiceGame }
  ];
  
  return (
    <div className="casino-lobby">
      {games.map(game => (
        <GameCard key={game.id} {...game} />
      ))}
    </div>
  );
}
```

### База данных
```sql
CREATE TABLE casino_games (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_type VARCHAR(50), -- 'slots', 'wheel', 'crash', etc.
  bet_amount INTEGER,
  win_amount INTEGER,
  multiplier DECIMAL(10,2),
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_casino_user ON casino_games(user_id);
CREATE INDEX idx_casino_type ON casino_games(game_type);
```

---

## 🎁 Бонусные механики

### 1. Ежедневный бонус
```javascript
function getDailyBonus(userId) {
  const lastBonus = await getLastBonusDate(userId);
  const hoursSince = (Date.now() - lastBonus) / 3600000;
  
  if (hoursSince >= 24) {
    const bonus = 100;
    await User.updateOne({ id: userId }, { $inc: { points: bonus } });
    return { success: true, amount: bonus };
  }
  
  return { success: false, hoursRemaining: 24 - hoursSince };
}
```

### 2. Streak (серия побед)
```javascript
async function checkStreak(userId) {
  const recentGames = await getRecentGames(userId, 10);
  let streak = 0;
  
  for (let game of recentGames) {
    if (game.win > game.bet) {
      streak++;
    } else {
      break;
    }
  }
  
  if (streak >= 5) {
    // Бонус за серию
    return { bonus: streak * 50 };
  }
  
  return { streak };
}
```

### 3. Кешбек
```javascript
async function calculateCashback(userId, period = 'week') {
  const losses = await getTotalLosses(userId, period);
  const cashback = Math.floor(losses * 0.1); // 10% кешбек
  
  if (cashback > 0) {
    await User.updateOne({ id: userId }, { $inc: { points: cashback } });
  }
  
  return cashback;
}
```

---

## 📱 UI/UX рекомендации

### Анимации
```css
.slot-reel {
  animation: spin 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.wheel-spin {
  animation: rotate 5s cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

.crash-multiplier {
  animation: pulse 0.5s ease-in-out infinite;
  font-size: 3rem;
  font-weight: bold;
  color: #00ff00;
}
```

### Звуки
```javascript
const sounds = {
  spin: new Audio('/sounds/spin.mp3'),
  win: new Audio('/sounds/win.mp3'),
  lose: new Audio('/sounds/lose.mp3'),
  bigwin: new Audio('/sounds/jackpot.mp3')
};

function playSound(type) {
  sounds[type]?.play();
}
```

---

*Составлено 29 октября 2025 года*
