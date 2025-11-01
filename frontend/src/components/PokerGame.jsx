import { useState, useEffect } from 'react';
import styles from './PokerGame.module.css';

// Утилиты для работы с колодой
const range = (start, count) =>
  Array.apply(0, Array(count)).map((element, index) => index + start);

function shuffle(array) {
  const copy = [];
  let n = array.length;
  let i;
  while (n) {
    i = Math.floor(Math.random() * array.length);
    if (i in array) {
      copy.push(array[i]);
      delete array[i];
      n--;
    }
  }
  return copy;
}

const suits = ['♦', '♣', '♥', '♠']; // diamonds, clubs, hearts, spades
const suitCodes = ['d', 'c', 'h', 's'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getDeck = () =>
  shuffle(
    ranks
      .map(r => suitCodes.map(s => r + s))
      .reduce((prev, curr) => prev.concat(curr))
  );

const SUIT_NAMES = {
  d: '♦ Бубны',
  c: '♣ Трефы',
  h: '♥ Черви',
  s: '♠ Пики'
};

const SUIT_SYMBOLS = {
  d: '♦',
  c: '♣',
  h: '♥',
  s: '♠'
};

const SUIT_COLORS = {
  d: 'red',
  c: 'black',
  h: 'red',
  s: 'black'
};

const RANK_NAMES = {
  A: 'Туз',
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  J: 'Валет',
  Q: 'Дама',
  K: 'Король'
};

// Компонент карты
const PlayingCard = ({ card, size = 120 }) => {
  if (!card || card.length < 2) return null;
  
  const rank = card.slice(0, -1);
  const suitCode = card.slice(-1);
  const suit = SUIT_SYMBOLS[suitCode];
  const color = SUIT_COLORS[suitCode];
  
  return (
    <div className={styles.playing-card} style={{ width: `${size}px`, height: `${size * 1.4}px` }}>
      <div className={styles.card-inner}>
        <div className="card-corner top-left" style={{ color }}>
          <div className={styles.card-rank}>{rank}</div>
          <div className={styles.card-suit}>{suit}</div>
        </div>
        <div className={styles.card-center} style={{ color }}>
          <span className={styles.card-suit-large}>{suit}</span>
        </div>
        <div className="card-corner bottom-right" style={{ color }}>
          <div className={styles.card-rank}>{rank}</div>
          <div className={styles.card-suit}>{suit}</div>
        </div>
      </div>
    </div>
  );
};

export default function PokerGame() {
  const [deck, setDeck] = useState(getDeck());
  const [board, setBoard] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [gameState, setGameState] = useState('ready'); // ready, flop, turn, river
  const [message, setMessage] = useState('Нажмите "Новая раздача" для начала игры');

  const newRound = () => {
    const newDeck = getDeck();
    setDeck(newDeck);
    setBoard([]);
    setPlayerHand([]);
    setGameState('ready');
    setMessage('Нажмите "Раздать карты" для начала');
  };

  const dealPlayerCards = () => {
    if (gameState !== 'ready') return;
    
    const newDeck = [...deck];
    const cards = [newDeck.pop(), newDeck.pop()];
    setPlayerHand(cards);
    setDeck(newDeck);
    setGameState('preflop');
    setMessage('Ваши карты розданы. Нажмите "Флоп" для продолжения');
  };

  const dealFlop = () => {
    if (gameState !== 'preflop') return;
    
    const newDeck = [...deck];
    const flop = [newDeck.pop(), newDeck.pop(), newDeck.pop()];
    setBoard(flop);
    setDeck(newDeck);
    setGameState('flop');
    setMessage('Флоп роздан. Нажмите "Терн" для следующей карты');
  };

  const dealTurn = () => {
    if (gameState !== 'flop') return;
    
    const newDeck = [...deck];
    const card = newDeck.pop();
    setBoard([...board, card]);
    setDeck(newDeck);
    setGameState('turn');
    setMessage('Терн открыт. Нажмите "Ривер" для последней карты');
  };

  const dealRiver = () => {
    if (gameState !== 'turn') return;
    
    const newDeck = [...deck];
    const card = newDeck.pop();
    setBoard([...board, card]);
    setDeck(newDeck);
    setGameState('river');
    setMessage('Ривер открыт! Все карты розданы. Начните новую раздачу.');
  };

  const getCardName = (card) => {
    if (!card || card.length < 2) return '';
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    return `${RANK_NAMES[rank] || rank} ${SUIT_NAMES[suit] || ''}`;
  };

  return (
    <div className={styles.poker-game-fullscreen}>
      <div className={styles.poker-game-container}>
        {/* Левая часть - игровой стол */}
        <div className={styles.poker-table-area}>
          <div className={styles.poker-table}>
            <h2 className={styles.poker-title}>♠ Техасский Холдем ♥</h2>
            
            {/* Стол (Board) */}
            <div className={styles.board-area}>
              <h3>Стол ({board.length}/5 карт)</h3>
              <div className={styles.cards-container}>
                {board.length > 0 ? (
                  board.map((card, idx) => (
                    <PlayingCard key={idx} card={card} size={140} />
                  ))
                ) : (
                  <div className={styles.empty-board}>Карты не розданы</div>
                )}
              </div>
            </div>

            {/* Рука игрока */}
            <div className={styles.player-hand-area}>
              <h3>Ваши карты ({playerHand.length}/2)</h3>
              <div className={styles.player-cards}>
                {playerHand.length > 0 ? (
                  playerHand.map((card, idx) => (
                    <PlayingCard key={idx} card={card} size={120} />
                  ))
                ) : (
                  <div className={styles.empty-cards}>Карты не розданы</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Правая часть - контроль */}
        <div className={styles.poker-controls}>
          <div className={styles.controls-content}>
            <h3>Управление игрой</h3>
            
            <div className={styles.game-status}>
              <div className={styles.status-badge} data-state={gameState}>
                {gameState === 'ready' && '⏳ Ожидание'}
                {gameState === 'preflop' && '🎴 Префлоп'}
                {gameState === 'flop' && '🃏 Флоп'}
                {gameState === 'turn' && '🎯 Терн'}
                {gameState === 'river' && '🏁 Ривер'}
              </div>
              <p className={styles.status-message}>{message}</p>
            </div>

            <div className={styles.control-buttons}>
              <button 
                className="btn btn-primary"
                onClick={newRound}
              >
                🔄 Новая раздача
              </button>

              <button 
                className="btn btn-deal"
                onClick={dealPlayerCards}
                disabled={gameState !== 'ready'}
              >
                🎴 Раздать карты
              </button>

              <button 
                className="btn btn-action"
                onClick={dealFlop}
                disabled={gameState !== 'preflop'}
              >
                ➡️ Флоп (3 карты)
              </button>

              <button 
                className="btn btn-action"
                onClick={dealTurn}
                disabled={gameState !== 'flop'}
              >
                ➡️ Терн (1 карта)
              </button>

              <button 
                className="btn btn-action"
                onClick={dealRiver}
                disabled={gameState !== 'turn'}
              >
                ➡️ Ривер (1 карта)
              </button>
            </div>

            <div className={styles.cards-info}>
              <h4>Карты на столе:</h4>
              {board.length > 0 ? (
                <ul className={styles.card-list}>
                  {board.map((card, idx) => (
                    <li key={idx} className={styles.card-item}>
                      {getCardName(card)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.no-cards}>Стол пуст</p>
              )}

              <h4>Ваши карты:</h4>
              {playerHand.length > 0 ? (
                <ul className={styles.card-list}>
                  {playerHand.map((card, idx) => (
                    <li key={idx} className={styles.card-item}>
                      {getCardName(card)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.no-cards}>Карты не розданы</p>
              )}
            </div>

            <div className={styles.game-info}>
              <h4>📋 Правила</h4>
              <ul className={styles.rules-list}>
                <li>1. Начните новую раздачу</li>
                <li>2. Получите 2 карты в руку</li>
                <li>3. Флоп - 3 карты на стол</li>
                <li>4. Терн - еще 1 карта</li>
                <li>5. Ривер - последняя карта</li>
              </ul>
            </div>

            <div className={styles.deck-info}>
              <p>📦 Карт в колоде: <strong>{deck.length}</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
