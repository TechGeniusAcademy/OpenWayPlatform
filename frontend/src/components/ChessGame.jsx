import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { FaTrophy, FaHandshake, FaExclamationTriangle, FaCircle, FaChess, FaRedo, FaHistory, FaBrain } from 'react-icons/fa';
import { GiChessKing } from 'react-icons/gi';
import styles from './ChessGame.module.css';

function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [gameStatus, setGameStatus] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [playerColor, setPlayerColor] = useState('white');
  const [isComputerTurn, setIsComputerTurn] = useState(false);

  useEffect(() => {
    updateGameStatus();
  }, [position]);

  useEffect(() => {
    // Если играем за чёрных, компьютер делает первый ход
    if (playerColor === 'black' && game.turn() === 'w') {
      setTimeout(() => makeComputerMove(), 500);
    }
  }, [playerColor]);

  const updateGameStatus = () => {
    if (game.isCheckmate()) {
      setGameStatus(game.turn() === 'w' ? 'Чёрные победили! Мат!' : 'Белые победили! Мат!');
    } else if (game.isDraw()) {
      setGameStatus('Ничья!');
    } else if (game.isStalemate()) {
      setGameStatus('Пат! Ничья!');
    } else if (game.isCheck()) {
      setGameStatus(game.turn() === 'w' ? 'Белым шах!' : 'Чёрным шах!');
    } else {
      setGameStatus(game.turn() === 'w' ? 'Ход белых' : 'Ход чёрных');
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    // Проверяем, не ход ли компьютера
    if (isComputerTurn) return false;
    
    // Проверяем, играет ли игрок за этот цвет
    const currentTurn = game.turn();
    if ((playerColor === 'white' && currentTurn === 'b') || 
        (playerColor === 'black' && currentTurn === 'w')) {
      return false;
    }

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Автоматическое превращение пешки в ферзя
      });

      if (move === null) return false;

      setPosition(game.fen());
      setMoveHistory([...moveHistory, move.san]);
      
      // Если игра не окончена, делаем ход компьютера
      if (!game.isGameOver()) {
        setTimeout(() => makeComputerMove(), 500);
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const makeComputerMove = () => {
    setIsComputerTurn(true);
    
    const possibleMoves = game.moves();
    if (possibleMoves.length === 0) {
      setIsComputerTurn(false);
      return;
    }

    let selectedMove;

    if (difficulty === 'easy') {
      // Случайный ход
      selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    } else if (difficulty === 'medium') {
      // Простая оценка: приоритет взятию фигур
      const captureMoves = possibleMoves.filter(move => move.includes('x'));
      if (captureMoves.length > 0 && Math.random() > 0.3) {
        selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
      } else {
        selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      }
    } else {
      // Hard: минимакс на 2 хода
      selectedMove = getBestMove();
    }

    game.move(selectedMove);
    setPosition(game.fen());
    setMoveHistory([...moveHistory, selectedMove]);
    setIsComputerTurn(false);
  };

  const getBestMove = () => {
    const possibleMoves = game.moves();
    let bestMove = possibleMoves[0];
    let bestValue = -Infinity;

    possibleMoves.forEach(move => {
      game.move(move);
      const value = evaluateBoard();
      game.undo();

      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    });

    return bestMove;
  };

  const evaluateBoard = () => {
    const pieceValues = {
      p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
      P: -1, N: -3, B: -3, R: -5, Q: -9, K: 0
    };

    let value = 0;
    const board = game.board();
    
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          value += pieceValues[square.type] * (square.color === 'w' ? 1 : -1);
        }
      });
    });

    return game.turn() === 'w' ? -value : value;
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setPosition(newGame.fen());
    setMoveHistory([]);
    setGameStatus('');
    setIsComputerTurn(false);
    
    // Если играем за чёрных, компьютер делает первый ход
    if (playerColor === 'black') {
      setTimeout(() => makeComputerMove(), 500);
    }
  };

  const undoMove = () => {
    if (moveHistory.length >= 2) {
      game.undo(); // Отменить ход компьютера
      game.undo(); // Отменить ход игрока
      setPosition(game.fen());
      setMoveHistory(moveHistory.slice(0, -2));
    }
  };

  const switchColor = () => {
    setPlayerColor(playerColor === 'white' ? 'black' : 'white');
    resetGame();
  };

  return (
    <div className={styles['chess-game']}>
      <div className={styles['chess-game-header']}>
        <h2><GiChessKing /> Шахматы</h2>
        <div className={styles['chess-controls']}>
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
            className={styles['chess-select']}
          >
            <option value="easy">● Лёгкий</option>
            <option value="medium">● Средний</option>
            <option value="hard">● Сложный</option>
          </select>
          
          <button onClick={switchColor} className="chess-btn chess-btn-secondary">
            <FaCircle /> {playerColor === 'white' ? 'Играть за белых' : 'Играть за чёрных'}
          </button>
          
          <button onClick={undoMove} className="chess-btn chess-btn-secondary" disabled={moveHistory.length < 2}>
            ↩️ Отменить
          </button>
          
          <button onClick={resetGame} className="chess-btn chess-btn-primary">
            <FaRedo /> Новая игра
          </button>
        </div>
      </div>

      <div className={styles['chess-game-status']}>
        <h3>{gameStatus}</h3>
        {isComputerTurn && <span className={styles.thinking}><FaBrain /> Компьютер думает...</span>}
      </div>

      <div className={styles['chess-game-container']}>
        <div className={styles['chess-board-wrapper']}>
          <Chessboard
            position={position}
            onPieceDrop={onDrop}
            boardOrientation={playerColor}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            customDarkSquareStyle={{ backgroundColor: '#779952' }}
            customLightSquareStyle={{ backgroundColor: '#edeed1' }}
          />
        </div>

        <div className={styles['chess-sidebar']}>
          <div className={styles['move-history']}>
            <h4><FaHistory /> История ходов</h4>
            <div className={styles['moves-list']}>
              {moveHistory.length === 0 ? (
                <p className={styles['no-moves']}>Ходы появятся здесь</p>
              ) : (
                moveHistory.map((move, index) => (
                  <div key={index} className={styles['move-item']}>
                    <span className={styles['move-number']}>{Math.floor(index / 2) + 1}.</span>
                    <span className={`move-notation ${index % 2 === 0 ? 'white' : 'black'}`}>
                      {move}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles['game-info']}>
            <h4>ℹ️ Информация</h4>
            <div className={styles['info-item']}>
              <span>Вы играете:</span>
              <strong><FaCircle /> {playerColor === 'white' ? 'Белыми' : 'Чёрными'}</strong>
            </div>
            <div className={styles['info-item']}>
              <span>Сложность:</span>
              <strong>
                {difficulty === 'easy' ? '● Лёгкий' : 
                 difficulty === 'medium' ? '● Средний' : '● Сложный'}
              </strong>
            </div>
            <div className={styles['info-item']}>
              <span>Сделано ходов:</span>
              <strong>{moveHistory.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChessGame;
