# 🎮 Руководство по играм с ставками для образовательной платформы

## Общая концепция

Все игры работают по единой схеме:
1. **Создание матча** - игрок создает игру со ставкой
2. **Поиск оппонента** - второй игрок присоединяется
3. **Игровой процесс** - оба игрока играют в реальном времени
4. **Определение победителя** - автоматический подсчет результатов
5. **Начисление баллов** - победитель забирает ставку обоих игроков

---

## 1. 🎯 Крестики-нолики 5x5 (Гомоку)

### Описание
Классическая игра, но на поле 15x15. Задача - первым выстроить 5 своих символов в ряд (по горизонтали, вертикали или диагонали).

### Правила
- Поле: 15x15 клеток
- Игроки ходят по очереди
- Победа: 5 символов подряд в любом направлении
- Ничья: если поле заполнено, но никто не выиграл
- Время на ход: 30 секунд

### Ставки
- Минимальная: 5 баллов
- Максимальная: 50 баллов
- Победитель получает: 100% ставки обоих игроков (2x ставка)
- При ничьей: каждый забирает свою ставку обратно

### Техническая реализация

**Структура данных:**
```javascript
{
  board: Array(15).fill(null).map(() => Array(15).fill(null)),
  currentPlayer: 'X' | 'O',
  winner: null | 'X' | 'O' | 'draw',
  lastMove: { row: number, col: number }
}
```

**Проверка победы:**
```javascript
function checkWin(board, row, col) {
  const directions = [
    [[0, 1], [0, -1]], // горизонталь
    [[1, 0], [-1, 0]], // вертикаль
    [[1, 1], [-1, -1]], // диагональ \
    [[1, -1], [-1, 1]]  // диагональ /
  ];
  
  for (let [dir1, dir2] of directions) {
    let count = 1;
    count += countInDirection(board, row, col, dir1);
    count += countInDirection(board, row, col, dir2);
    if (count >= 5) return true;
  }
  return false;
}
```

**WebSocket события:**
- `gomoku:create` - создание игры
- `gomoku:join` - присоединение
- `gomoku:move` - ход игрока
- `gomoku:win` - победа
- `gomoku:draw` - ничья

**База данных:**
```sql
CREATE TABLE gomoku_games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  board JSONB,
  current_player VARCHAR(1),
  winner_id INTEGER,
  status VARCHAR(20), -- waiting, in_progress, finished
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Простая логика (200-300 строк кода)
✅ Быстрые партии (5-10 минут)
✅ Всем понятные правила
✅ Не требует сторонних библиотек

---

## 2. ✊✋✌️ Камень-Ножницы-Бумага (Турнирный режим)

### Описание
Классическая игра в турнирном формате. Игроки делают выбор одновременно, система определяет победителя раунда. Партия до 3 побед.

### Правила
- Камень бьет Ножницы
- Ножницы бьют Бумагу
- Бумага бьет Камень
- Партия до 3 побед (лучший из 5)
- Время на выбор: 10 секунд
- Если время вышло - случайный выбор

### Ставки
- Минимальная: 5 баллов
- Максимальная: 100 баллов
- Победитель получает: 100% ставки обоих
- Турнирный режим: можно делать турниры на 4/8/16 игроков

### Техническая реализация

**Структура данных:**
```javascript
{
  round: number, // текущий раунд
  player1Score: number,
  player2Score: number,
  player1Choice: 'rock' | 'paper' | 'scissors' | null,
  player2Choice: 'rock' | 'paper' | 'scissors' | null,
  roundWinner: 'player1' | 'player2' | 'draw' | null,
  gameWinner: 'player1' | 'player2' | null
}
```

**Логика определения победителя:**
```javascript
function determineWinner(choice1, choice2) {
  if (choice1 === choice2) return 'draw';
  
  const wins = {
    rock: 'scissors',
    scissors: 'paper',
    paper: 'rock'
  };
  
  return wins[choice1] === choice2 ? 'player1' : 'player2';
}
```

**Турнирная сетка:**
```javascript
{
  tournamentId: string,
  players: [userId1, userId2, userId3, userId4],
  bracket: {
    round1: [match1, match2], // полуфиналы
    round2: [finalMatch]       // финал
  },
  betAmount: number,
  prizePool: number, // сумма всех ставок
  distribution: {
    first: 50%,  // победитель
    second: 30%, // финалист
    third: 20%   // полуфиналисты
  }
}
```

**WebSocket события:**
- `rps:create` - создание игры
- `rps:join` - присоединение
- `rps:choice` - выбор игрока (скрыт от оппонента)
- `rps:reveal` - показ результата раунда
- `rps:round-end` - конец раунда
- `rps:game-end` - конец игры

**База данных:**
```sql
CREATE TABLE rps_games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,
  rounds JSONB, -- история раундов
  winner_id INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE rps_tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  bet_amount INTEGER,
  max_players INTEGER,
  current_players INTEGER DEFAULT 0,
  bracket JSONB,
  status VARCHAR(20), -- registration, in_progress, finished
  start_time TIMESTAMP,
  end_time TIMESTAMP
);
```

### Преимущества
✅ Моментальная игра (1-3 минуты на партию)
✅ Элементарная логика
✅ Турниры добавляют азарт
✅ Идеально для быстрых матчей

---

## 3. 📝 Слова из слова

### Описание
Игрокам дается длинное слово (8-12 букв). За 5 минут нужно составить как можно больше слов из букв исходного слова.

### Правила
- Длина исходного слова: 8-12 букв
- Время раунда: 5 минут
- Минимальная длина слова: 3 буквы
- Каждую букву можно использовать только столько раз, сколько она встречается
- Баллы за слово: длина слова × 10 (слово из 5 букв = 50 баллов)
- Бонус за уникальные слова: +20 баллов (если только у одного игрока)

### Ставки
- Минимальная: 10 баллов
- Максимальная: 200 баллов
- Победитель: кто набрал больше баллов за раунд

### Техническая реализация

**API словаря:**
```javascript
// Используем готовый словарь русских слов
import russianWords from 'russian-words';

// Или создаем свой файл со словами
const dictionary = new Set([
  'дом', 'кот', 'слово', // ... все русские слова
]);

function validateWord(word, sourceWord) {
  // 1. Проверка в словаре
  if (!dictionary.has(word.toLowerCase())) return false;
  
  // 2. Проверка букв
  const sourceLetters = sourceWord.split('');
  const wordLetters = word.split('');
  
  for (let letter of wordLetters) {
    const index = sourceLetters.indexOf(letter);
    if (index === -1) return false;
    sourceLetters.splice(index, 1); // удаляем использованную букву
  }
  
  return true;
}
```

**Подсчет баллов:**
```javascript
function calculateScore(words, opponentWords) {
  let score = 0;
  
  for (let word of words) {
    // Базовые баллы
    score += word.length * 10;
    
    // Бонус за уникальность
    if (!opponentWords.includes(word)) {
      score += 20;
    }
  }
  
  return score;
}
```

**Структура данных:**
```javascript
{
  sourceWord: 'ПРОГРАММИРОВАНИЕ',
  timeLimit: 300, // 5 минут
  player1Words: ['программа', 'мир', 'рама'],
  player2Words: ['граммар', 'мир', 'море'],
  player1Score: 0,
  player2Score: 0,
  validatedWords: new Set()
}
```

**WebSocket события:**
- `words:create` - создание игры
- `words:join` - присоединение
- `words:submit` - отправка слова
- `words:validate` - проверка слова
- `words:time-up` - время вышло
- `words:results` - результаты

**База данных:**
```sql
CREATE TABLE word_games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  source_word VARCHAR(50),
  player1_words JSONB,
  player2_words JSONB,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  winner_id INTEGER,
  status VARCHAR(20),
  time_limit INTEGER DEFAULT 300,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE word_dictionary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) UNIQUE,
  length INTEGER,
  frequency INTEGER -- частота использования
);

CREATE INDEX idx_word_length ON word_dictionary(length);
```

### Преимущества
✅ Образовательная ценность
✅ Развивает словарный запас
✅ Интересно для учеников
✅ Средняя сложность реализации

---

## 4. ⚫⚪ Реверси (Отелло)

### Описание
Игра на доске 8x8. Задача - захватить больше фишек противника, переворачивая их в свой цвет.

### Правила
- Поле: 8x8
- Начальная позиция: 4 фишки в центре (2 черные, 2 белые)
- Ход: ставишь фишку так, чтобы захватить фишки противника
- Захват: все фишки противника между твоей новой и существующей фишкой переворачиваются
- Победа: больше фишек на доске в конце игры
- Время на ход: 30 секунд

### Ставки
- Минимальная: 10 баллов
- Максимальная: 200 баллов
- Победитель: у кого больше фишек

### Техническая реализация

**Структура данных:**
```javascript
{
  board: Array(8).fill(null).map(() => Array(8).fill(null)),
  // 'B' = black (игрок 1), 'W' = white (игрок 2)
  currentPlayer: 'B' | 'W',
  blackCount: number,
  whiteCount: number,
  validMoves: [[row, col], ...] // доступные ходы
}
```

**Проверка валидного хода:**
```javascript
function isValidMove(board, row, col, player) {
  if (board[row][col] !== null) return false;
  
  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  for (let [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    let hasOpponent = false;
    
    // Проверяем направление
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c] === null) break;
      if (board[r][c] === opponent) {
        hasOpponent = true;
        r += dr;
        c += dc;
      } else if (board[r][c] === player && hasOpponent) {
        return true; // Нашли валидный ход
      } else {
        break;
      }
    }
  }
  
  return false;
}
```

**Захват фишек:**
```javascript
function captureDiscs(board, row, col, player) {
  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [...]; // все 8 направлений
  const captured = [];
  
  for (let [dr, dc] of directions) {
    const toCapture = [];
    let r = row + dr, c = col + dc;
    
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c] === null) break;
      if (board[r][c] === opponent) {
        toCapture.push([r, c]);
        r += dr; c += dc;
      } else if (board[r][c] === player) {
        captured.push(...toCapture);
        break;
      } else {
        break;
      }
    }
  }
  
  // Переворачиваем захваченные фишки
  for (let [r, c] of captured) {
    board[r][c] = player;
  }
  
  return captured.length;
}
```

**База данных:**
```sql
CREATE TABLE reversi_games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  board JSONB,
  current_player VARCHAR(1),
  black_count INTEGER DEFAULT 2,
  white_count INTEGER DEFAULT 2,
  move_history JSONB,
  winner_id INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Стратегическая игра
✅ Партии 10-20 минут
✅ Средняя сложность реализации
✅ Популярна в мире

---

## 5. 🔢 Математическая дуэль

### Описание
Соревнование по решению математических примеров. 20 вопросов, кто больше решит правильно - тот победил.

### Правила
- Количество вопросов: 20
- Типы примеров: 
  - Сложение/вычитание (1-4 класс)
  - Умножение/деление (3-6 класс)
  - Дроби/проценты (5-8 класс)
  - Уравнения (7-11 класс)
- Время на вопрос: 30 секунд
- Баллы за правильный ответ: 5 баллов
- Бонус за скорость: +1-3 балла

### Ставки
- Минимальная: 10 баллов
- Максимальная: 200 баллов
- Победитель: кто набрал больше баллов

### Техническая реализация

**Генерация примеров:**
```javascript
const questionTypes = {
  addition: (level) => {
    const a = randomInt(level * 10, level * 100);
    const b = randomInt(level * 10, level * 100);
    return {
      question: `${a} + ${b} = ?`,
      answer: a + b,
      difficulty: level
    };
  },
  
  multiplication: (level) => {
    const a = randomInt(2, level * 5);
    const b = randomInt(2, level * 5);
    return {
      question: `${a} × ${b} = ?`,
      answer: a * b,
      difficulty: level
    };
  },
  
  equation: (level) => {
    const x = randomInt(1, 20);
    const a = randomInt(2, 10);
    const b = randomInt(1, 50);
    return {
      question: `${a}x + ${b} = ${a * x + b}. x = ?`,
      answer: x,
      difficulty: level
    };
  },
  
  percentage: (level) => {
    const total = randomInt(100, 1000);
    const percent = randomInt(10, 90);
    return {
      question: `${percent}% от ${total} = ?`,
      answer: Math.round(total * percent / 100),
      difficulty: level
    };
  }
};

function generateQuestion(difficulty) {
  const types = Object.keys(questionTypes);
  const type = types[Math.floor(Math.random() * types.length)];
  return questionTypes[type](difficulty);
}
```

**Подсчет баллов:**
```javascript
function calculateScore(answer, correctAnswer, timeSpent, maxTime) {
  if (answer !== correctAnswer) return 0;
  
  const basePoints = 5;
  const timeBonus = Math.ceil(3 * (1 - timeSpent / maxTime));
  
  return basePoints + timeBonus;
}
```

**Структура игры:**
```javascript
{
  questions: [
    { id: 1, question: '5 + 3 = ?', answer: 8, difficulty: 1 },
    // ... 19 еще вопросов
  ],
  player1Answers: [
    { questionId: 1, answer: 8, timeSpent: 5, points: 7 },
    // ...
  ],
  player2Answers: [...],
  player1Score: 0,
  player2Score: 0
}
```

**WebSocket события:**
- `math:create` - создание дуэли
- `math:join` - присоединение
- `math:answer` - отправка ответа
- `math:next` - следующий вопрос
- `math:results` - результаты

**База данных:**
```sql
CREATE TABLE math_duels (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  difficulty_level INTEGER, -- 1-4 (начальная школа - старшая)
  questions JSONB,
  player1_answers JSONB,
  player2_answers JSONB,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  winner_id INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Образовательная ценность
✅ Развивает математические навыки
✅ Адаптивная сложность
✅ Быстрые партии (10 минут)

---

## 6. 🧩 Найди пару (Memory Game)

### Описание
Классическая игра на память. Поле 6x6 с 18 парами карт. Игроки по очереди открывают 2 карты, если совпадают - забирают пару.

### Правила
- Поле: 6x6 карт (36 карт = 18 пар)
- Игроки ходят по очереди
- Открываешь 2 карты:
  - Если совпадают → забираешь пару, ходишь еще раз
  - Если не совпадают → карты закрываются, ход переходит сопернику
- Победа: кто собрал больше пар
- Время на ход: 20 секунд

### Ставки
- Минимальная: 5 баллов
- Максимальная: 100 баллов
- Победитель: у кого больше пар

### Техническая реализация

**Генерация поля:**
```javascript
const cardImages = [
  '🍎', '🍌', '🍇', '🍊', '🍋', '🍉', '🍓', '🍒',
  '🥝', '🍑', '🥥', '🥑', '🍆', '🥕', '🌽', '🥒',
  '🍕', '🍔', // всего 18 уникальных
];

function generateBoard() {
  const pairs = [...cardImages.slice(0, 18), ...cardImages.slice(0, 18)];
  
  // Перемешиваем
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  
  // Создаем матрицу 6x6
  const board = [];
  for (let i = 0; i < 6; i++) {
    board.push(pairs.slice(i * 6, (i + 1) * 6));
  }
  
  return board;
}
```

**Структура данных:**
```javascript
{
  board: [
    ['🍎', '🍌', '🍇', '🍊', '🍋', '🍉'],
    // ... 5 еще рядов
  ],
  revealed: Array(6).fill(null).map(() => Array(6).fill(false)),
  currentPlayer: 1 | 2,
  flippedCards: [[row, col], [row, col]] | [],
  player1Pairs: 0,
  player2Pairs: 0
}
```

**Логика хода:**
```javascript
function flipCard(row, col) {
  // Если уже открыты 2 карты - игнорируем
  if (flippedCards.length === 2) return;
  
  // Открываем карту
  revealed[row][col] = true;
  flippedCards.push([row, col]);
  
  // Если открыты 2 карты
  if (flippedCards.length === 2) {
    const [r1, c1] = flippedCards[0];
    const [r2, c2] = flippedCards[1];
    
    // Проверяем совпадение
    if (board[r1][c1] === board[r2][c2]) {
      // Пара найдена!
      currentPlayerPairs++;
      flippedCards = [];
      // Игрок ходит еще раз
    } else {
      // Не совпало - закрываем через 1.5 секунды
      setTimeout(() => {
        revealed[r1][c1] = false;
        revealed[r2][c2] = false;
        flippedCards = [];
        switchPlayer();
      }, 1500);
    }
  }
}
```

**WebSocket события:**
- `memory:create` - создание игры
- `memory:join` - присоединение
- `memory:flip` - открыть карту
- `memory:match` - пара найдена
- `memory:mismatch` - не совпало
- `memory:end` - игра окончена

**База данных:**
```sql
CREATE TABLE memory_games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  board JSONB,
  revealed JSONB,
  player1_pairs INTEGER DEFAULT 0,
  player2_pairs INTEGER DEFAULT 0,
  current_player INTEGER,
  move_history JSONB,
  winner_id INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Развивает память
✅ Быстрые партии (5-10 минут)
✅ Простая реализация
✅ Визуально привлекательно

---

## 7. 🚢 Морской бой

### Описание
Классический морской бой. Каждый игрок расставляет корабли на поле 10x10, затем по очереди стреляют, пытаясь потопить флот противника.

### Правила
- Поле: 10x10
- Корабли: 
  - 1 четырехпалубный (4 клетки)
  - 2 трехпалубных (3 клетки)
  - 3 двухпалубных (2 клетки)
  - 4 однопалубных (1 клетка)
- Корабли не должны касаться друг друга
- Игроки стреляют по очереди
- Попал → стреляешь еще раз
- Промах → ход переходит сопернику
- Время на выстрел: 30 секунд

### Ставки
- Минимальная: 10 баллов
- Максимальная: 300 баллов
- Победитель: кто первым потопил все корабли противника

### Техническая реализация

**Структура данных:**
```javascript
{
  player1Board: Array(10).fill(null).map(() => Array(10).fill(null)),
  player2Board: Array(10).fill(null).map(() => Array(10).fill(null)),
  // null - пусто, 'S' - корабль, 'X' - попадание, 'O' - промах
  
  player1Ships: [
    { type: 'carrier', size: 4, cells: [[0,0], [0,1], [0,2], [0,3]], hits: 0 },
    // ...
  ],
  
  currentPlayer: 1 | 2,
  lastShot: { row: number, col: number, result: 'hit' | 'miss' | 'sunk' }
}
```

**Валидация расстановки:**
```javascript
function canPlaceShip(board, row, col, size, horizontal) {
  // Проверяем границы
  if (horizontal) {
    if (col + size > 10) return false;
  } else {
    if (row + size > 10) return false;
  }
  
  // Проверяем клетки корабля и вокруг него
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    
    // Проверяем клетку и соседние
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
          if (board[nr][nc] === 'S') return false;
        }
      }
    }
  }
  
  return true;
}
```

**Обработка выстрела:**
```javascript
function processShot(board, ships, row, col) {
  if (board[row][col] === 'X' || board[row][col] === 'O') {
    return { result: 'already-shot' };
  }
  
  if (board[row][col] === 'S') {
    board[row][col] = 'X';
    
    // Находим пораженный корабль
    const ship = ships.find(s => 
      s.cells.some(([r, c]) => r === row && c === col)
    );
    
    ship.hits++;
    
    if (ship.hits === ship.size) {
      // Корабль потоплен!
      markSurroundingCells(board, ship.cells);
      return { result: 'sunk', ship: ship.type };
    }
    
    return { result: 'hit' };
  } else {
    board[row][col] = 'O';
    return { result: 'miss' };
  }
}

function markSurroundingCells(board, shipCells) {
  for (let [r, c] of shipCells) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
          if (board[nr][nc] === null) {
            board[nr][nc] = 'O'; // Помечаем промахом
          }
        }
      }
    }
  }
}
```

**WebSocket события:**
- `battleship:create` - создание игры
- `battleship:join` - присоединение
- `battleship:place-ships` - расстановка кораблей
- `battleship:ready` - игрок готов
- `battleship:shoot` - выстрел
- `battleship:hit` - попадание
- `battleship:miss` - промах
- `battleship:sunk` - корабль потоплен
- `battleship:win` - победа

**База данных:**
```sql
CREATE TABLE battleship_games (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  player1_board JSONB,
  player2_board JSONB,
  player1_ships JSONB,
  player2_ships JSONB,
  current_player INTEGER,
  shot_history JSONB,
  winner_id INTEGER,
  status VARCHAR(20), -- setup, in_progress, finished
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Очень популярная игра
✅ Стратегия + удача
✅ Партии 15-30 минут
✅ Можно добавить AI противника

---

## 8. 🎲 Судоку - Гонка

### Описание
Оба игрока получают ОДИНАКОВОЕ судоку. Кто быстрее решит правильно - тот победил.

### Правила
- Сложность: Easy / Medium / Hard
- Одинаковое судоку для обоих игроков
- Лимит времени: 15 минут
- Победа: первый кто правильно решит
- Штраф за ошибку: +30 секунд ко времени
- Подсказки: 3 подсказки на игру (открыть случайную клетку)

### Ставки
- Минимальная: 10 баллов
- Максимальная: 300 баллов
- Победитель: кто быстрее решил

### Техническая реализация

**Генерация судоку:**
```javascript
import { makepuzzle, solvepuzzle } from 'sudoku';

function generateSudoku(difficulty) {
  const puzzle = makepuzzle(); // генерирует массив 81 элемент
  const solution = solvepuzzle(puzzle);
  
  // Конвертируем в 9x9 матрицу
  const board = [];
  for (let i = 0; i < 9; i++) {
    board.push(puzzle.slice(i * 9, (i + 1) * 9).map(n => n === null ? 0 : n + 1));
  }
  
  const solutionBoard = [];
  for (let i = 0; i < 9; i++) {
    solutionBoard.push(solution.slice(i * 9, (i + 1) * 9).map(n => n + 1));
  }
  
  return { puzzle: board, solution: solutionBoard };
}
```

**Валидация решения:**
```javascript
function validateSudoku(board, solution) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== solution[i][j]) {
        return false;
      }
    }
  }
  return true;
}

function validateMove(board, row, col, value) {
  // Проверка строки
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === value) return false;
  }
  
  // Проверка столбца
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === value) return false;
  }
  
  // Проверка квадрата 3x3
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === value) {
        return false;
      }
    }
  }
  
  return true;
}
```

**Структура игры:**
```javascript
{
  puzzle: Array(9).fill(null).map(() => Array(9).fill(0)),
  solution: Array(9).fill(null).map(() => Array(9).fill(0)),
  player1Board: Array(9).fill(null).map(() => Array(9).fill(0)),
  player2Board: Array(9).fill(null).map(() => Array(9).fill(0)),
  player1Time: 0, // секунды
  player2Time: 0,
  player1Hints: 3,
  player2Hints: 3,
  player1Errors: 0,
  player2Errors: 0,
  difficulty: 'easy' | 'medium' | 'hard'
}
```

**WebSocket события:**
- `sudoku:create` - создание гонки
- `sudoku:join` - присоединение
- `sudoku:start` - старт (таймер запускается)
- `sudoku:move` - ход игрока
- `sudoku:error` - ошибка (+30 сек штраф)
- `sudoku:hint` - использование подсказки
- `sudoku:complete` - игрок закончил
- `sudoku:validate` - проверка решения

**База данных:**
```sql
CREATE TABLE sudoku_races (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  puzzle JSONB,
  solution JSONB,
  difficulty VARCHAR(10),
  player1_time INTEGER DEFAULT 0,
  player2_time INTEGER DEFAULT 0,
  player1_errors INTEGER DEFAULT 0,
  player2_errors INTEGER DEFAULT 0,
  player1_hints_used INTEGER DEFAULT 0,
  player2_hints_used INTEGER DEFAULT 0,
  winner_id INTEGER,
  status VARCHAR(20),
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Развивает логику
✅ Гонка добавляет азарт
✅ Готовые библиотеки
✅ Разные уровни сложности

---

## 9. 🎮 2048 - Соревнование

### Описание
Оба игрока играют в классическую 2048 на время (3 минуты). Кто наберет больше очков - тот победил.

### Правила
- Время раунда: 3 минуты
- Цель: набрать максимум очков
- Правила 2048: объединяй одинаковые числа
- Бонусы за комбо: +20% к очкам за 3+ объединения подряд
- Можно сделать несколько раундов (лучший из 3)

### Ставки
- Минимальная: 10 баллов
- Максимальная: 200 баллов
- Победитель: больше очков за 3 минуты

### Техническая реализация

**Используем готовую библиотеку:**
```bash
npm install react-2048-game
```

**Обертка для соревнования:**
```javascript
import Game2048 from 'react-2048-game';

function Game2048Race({ gameId, playerId, onScoreUpdate }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180); // 3 минуты
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const handleScoreChange = (newScore) => {
    setScore(newScore);
    onScoreUpdate(newScore);
  };
  
  return (
    <div>
      <div className="timer">Time: {formatTime(timeLeft)}</div>
      <div className="score">Score: {score}</div>
      <Game2048 
        onScoreChange={handleScoreChange}
        enableUndo={false}
      />
    </div>
  );
}
```

**Подсчет результатов:**
```javascript
function determineWinner(player1Score, player2Score) {
  if (player1Score > player2Score) {
    return { winner: 'player1', margin: player1Score - player2Score };
  } else if (player2Score > player1Score) {
    return { winner: 'player2', margin: player2Score - player1Score };
  } else {
    return { winner: 'draw' };
  }
}
```

**WebSocket события:**
- `2048:create` - создание соревнования
- `2048:join` - присоединение
- `2048:start` - старт таймера
- `2048:score-update` - обновление счета
- `2048:time-up` - время вышло
- `2048:results` - результаты

**База данных:**
```sql
CREATE TABLE game_2048_races (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES users(id),
  player2_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  time_limit INTEGER DEFAULT 180,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_best_tile INTEGER DEFAULT 0,
  player2_best_tile INTEGER DEFAULT 0,
  winner_id INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

### Преимущества
✅ Готовая библиотека
✅ Быстрая реализация
✅ Популярная игра
✅ Азартно и весело

---

## 🎯 Общая архитектура для всех игр

### Backend структура
```
backend/
  routes/
    games/
      gomoku.js
      rps.js
      words.js
      reversi.js
      math.js
      memory.js
      battleship.js
      sudoku.js
      2048.js
  models/
    Game.js (базовая модель для всех игр)
  services/
    gameService.js (общая логика)
    betService.js (обработка ставок)
```

### Frontend структура
```
frontend/src/
  components/
    games/
      Gomoku/
        Gomoku.jsx
        Gomoku.css
        Board.jsx
        Cell.jsx
      RPS/
        RPS.jsx
        RPS.css
        Tournament.jsx
      // ... другие игры
  
  pages/
    student/
      Games.jsx (главное меню игр)
```

### WebSocket пространства имен
```javascript
io.of('/games').on('connection', (socket) => {
  socket.on('game:create', handleCreate);
  socket.on('game:join', handleJoin);
  socket.on('game:move', handleMove);
  socket.on('game:leave', handleLeave);
});
```

### Единая база данных для ставок
```sql
CREATE TABLE game_bets (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(50), -- 'gomoku', 'rps', 'words', etc.
  game_id INTEGER,
  player_id INTEGER REFERENCES users(id),
  bet_amount INTEGER,
  won BOOLEAN,
  prize_amount INTEGER,
  created_at TIMESTAMP
);

CREATE INDEX idx_game_bets_player ON game_bets(player_id);
CREATE INDEX idx_game_bets_type ON game_bets(game_type);
```

---

## 📊 Сравнительная таблица игр

| Игра | Сложность | Время партии | Образов. ценность | Популярность | Рекомендация |
|------|-----------|--------------|-------------------|--------------|--------------|
| Крестики-нолики 5x5 | ⭐ | 5-10 мин | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **НАЧАТЬ С ЭТОГО** |
| Камень-Ножницы-Бумага | ⭐ | 1-3 мин | ⭐ | ⭐⭐⭐⭐⭐ | ✅ Второе по приоритету |
| Слова из слова | ⭐⭐ | 5 мин | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Образовательно |
| Математическая дуэль | ⭐⭐ | 10 мин | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Для учебы |
| Найди пару | ⭐ | 5-10 мин | ⭐⭐⭐ | ⭐⭐⭐⭐ | Легко реализовать |
| Реверси | ⭐⭐ | 10-20 мин | ⭐⭐⭐ | ⭐⭐⭐ | Средний приоритет |
| 2048 | ⭐ | 3 мин | ⭐⭐ | ⭐⭐⭐⭐⭐ | Готовая библиотека |
| Судоку | ⭐⭐ | 10-15 мин | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Готовая библиотека |
| Морской бой | ⭐⭐⭐ | 15-30 мин | ⭐⭐ | ⭐⭐⭐⭐⭐ | Сложнее реализация |

---

## 🚀 План поэтапного внедрения

### Фаза 1 (1-2 недели)
1. **Крестики-нолики 5x5** - базовая реализация
2. **Камень-Ножницы-Бумага** - простой турнир

### Фаза 2 (2-3 недели)
3. **Математическая дуэль** - образовательный контент
4. **Слова из слова** - развитие словарного запаса
5. **Найди пару** - тренировка памяти

### Фаза 3 (3-4 недели)
6. **2048** - интеграция готовой библиотеки
7. **Судоку** - логическая игра
8. **Реверси** - стратегия

### Фаза 4 (опционально)
9. **Морской бой** - если есть спрос

---

## 💡 Дополнительные идеи

1. **Рейтинговая система** - ELO рейтинг для каждой игры
2. **Достижения** - бейджи за победы/серии
3. **Турниры** - еженедельные турниры с призовым фондом
4. **Статистика** - личная статистика по каждой игре
5. **Replay** - просмотр записей партий
6. **Обучение** - AI противник для тренировки
7. **Лига** - разделение игроков по уровню

---

*Документ составлен 29 октября 2025 года*
