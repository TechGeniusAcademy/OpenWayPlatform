import { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { FaTrophy, FaHandshake, FaExclamationTriangle, FaCircle, FaChess, FaRedo, FaHistory, FaBrain, FaRobot, FaCrown, FaBolt } from 'react-icons/fa';
import { GiChessKing, GiChessQueen, GiChessRook, GiChessBishop, GiChessKnight, GiChessPawn, GiArtificialIntelligence } from 'react-icons/gi';
import { IoMdSettings } from 'react-icons/io';
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
  const stockfishRef = useRef(null);
  const [stockfishReady, setStockfishReady] = useState(false);
  const [engineThinking, setEngineThinking] = useState('');

  // Инициализация OpenWay AI
  useEffect(() => {
    if (difficulty === 'hard' && !stockfishRef.current) {
      try {
        // Используем шахматный движок максимальной силы
        const engine = new Worker('https://cdn.jsdelivr.net/npm/stockfish@14.1.0/stockfish.js');
        stockfishRef.current = engine;

        engine.onmessage = (event) => {
          const message = event.data;
          
          if (message === 'uciok') {
            setStockfishReady(true);
            // МАКСИМАЛЬНЫЕ настройки для непобедимости
            engine.postMessage('setoption name Skill Level value 20'); // Максимум
            engine.postMessage('setoption name Threads value 8'); // Больше потоков
            engine.postMessage('setoption name Hash value 512'); // Больше памяти
            engine.postMessage('setoption name MultiPV value 1'); // Лучший ход
            engine.postMessage('setoption name Contempt value 100'); // Агрессивная игра
            engine.postMessage('setoption name Ponder value false'); // Не думать в фоне
            engine.postMessage('isready');
          }
          
          if (message === 'readyok') {
            console.log('OpenWay AI готов к игре');
          }
          
          if (message.startsWith('info') && message.includes('depth')) {
            // Показываем что движок думает
            const depthMatch = message.match(/depth (\d+)/);
            const scoreMatch = message.match(/score cp (-?\d+)/);
            const mateMatch = message.match(/score mate (-?\d+)/);
            
            if (depthMatch) {
              let status = `OpenWay AI: глубина ${depthMatch[1]}`;
              if (mateMatch) {
                status += ` | Мат в ${Math.abs(parseInt(mateMatch[1]))}`;
              } else if (scoreMatch) {
                status += ` | Оценка: ${(parseInt(scoreMatch[1])/100).toFixed(2)}`;
              }
              setEngineThinking(status);
            }
          }
          
          if (message.startsWith('bestmove')) {
            const moveMatch = message.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
            if (moveMatch) {
              const bestMove = moveMatch[1];
              applyStockfishMove(bestMove);
            }
          }
        };

        engine.onerror = (error) => {
          console.error('Ошибка OpenWay AI:', error);
          setStockfishReady(false);
        };

        engine.postMessage('uci');
      } catch (error) {
        console.error('Не удалось загрузить OpenWay AI:', error);
        setStockfishReady(false);
      }
    }

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
        setStockfishReady(false);
      }
    };
  }, [difficulty]);

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

  const applyStockfishMove = (uciMove) => {
    try {
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      const move = game.move({
        from,
        to,
        promotion
      });

      if (move) {
        setPosition(game.fen());
        setMoveHistory(prev => [...prev, move.san]);
      }
    } catch (error) {
      console.error('Ошибка применения хода:', error);
    } finally {
      setIsComputerTurn(false);
      setEngineThinking('');
    }
  };

  const getStockfishMove = () => {
    if (stockfishRef.current && stockfishReady) {
      setEngineThinking('OpenWay AI анализирует...');
      
      // Отправляем текущую позицию
      stockfishRef.current.postMessage('ucinewgame');
      stockfishRef.current.postMessage(`position fen ${game.fen()}`);
      
      // МАКСИМАЛЬНАЯ СИЛА с быстрым откликом: глубина 18, время 800мс
      // Stockfish на этих настройках сильнее любого гроссмейстера
      stockfishRef.current.postMessage('go depth 18 movetime 800');
    } else {
      // Fallback на обычный AI
      const move = getBestMove();
      setTimeout(() => {
        game.move(move);
        setPosition(game.fen());
        setMoveHistory(prev => [...prev, move]);
        setIsComputerTurn(false);
      }, 300);
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
      setTimeout(() => {
        selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        game.move(selectedMove);
        setPosition(game.fen());
        setMoveHistory([...moveHistory, selectedMove]);
        setIsComputerTurn(false);
      }, 300);
    } else if (difficulty === 'medium') {
      // Minimax AI средней силы
      setTimeout(() => {
        selectedMove = getBestMove();
        game.move(selectedMove);
        setPosition(game.fen());
        setMoveHistory([...moveHistory, selectedMove]);
        setIsComputerTurn(false);
      }, 500);
    } else {
      // Hard: OpenWay AI максимальной силы
      getStockfishMove();
    }
  };

  // Продвинутый AI с Minimax и альфа-бета отсечением + улучшенная эвристика
  const getBestMove = () => {
    // Быстрая глубина (<300мс)
    const depth = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
    let bestMove = null;
    let bestValue = -Infinity;
    
    const possibleMoves = game.moves({ verbose: true });
    
    // Если слишком много ходов (>30), используем упрощенную оценку
    if (possibleMoves.length > 30) {
      const captureMoves = possibleMoves.filter(m => m.captured);
      if (captureMoves.length > 0) {
        return captureMoves.sort((a, b) => {
          const captureValue = { p: 100, n: 320, b: 330, r: 500, q: 900 };
          return (captureValue[b.captured] || 0) - (captureValue[a.captured] || 0);
        })[0].san;
      }
    }
    
    // Продвинутая сортировка ходов по MVV-LVA для оптимального отсечения
    const sortedMoves = possibleMoves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // MVV-LVA: Приоритет взятию ценных фигур дешевыми
      if (a.captured) {
        const captureValue = { p: 100, n: 320, b: 330, r: 500, q: 900 };
        const attackerValue = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 1000 };
        scoreA += (captureValue[a.captured] || 0) * 10 - (attackerValue[a.piece] || 0);
      }
      if (b.captured) {
        const captureValue = { p: 100, n: 320, b: 330, r: 500, q: 900 };
        const attackerValue = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 1000 };
        scoreB += (captureValue[b.captured] || 0) * 10 - (attackerValue[b.piece] || 0);
      }
      
      // Превращение пешки в ферзя - критически важно!
      if (a.promotion === 'q') scoreA += 9000;
      if (b.promotion === 'q') scoreB += 9000;
      if (a.promotion) scoreA += 800;
      if (b.promotion) scoreB += 800;
      
      // Шахи имеют высокий приоритет
      try {
        const gameCopy = new Chess(game.fen());
        gameCopy.move(a);
        if (gameCopy.isCheck()) scoreA += 50;
        gameCopy.undo();
        gameCopy.move(b);
        if (gameCopy.isCheck()) scoreB += 50;
      } catch (error) {
        // Пропускаем проверку шахов при ошибке
      }
      
      // Ходы к центру
      const centerSquares = ['d4', 'e4', 'd5', 'e5'];
      if (centerSquares.includes(a.to)) scoreA += 30;
      if (centerSquares.includes(b.to)) scoreB += 30;
      
      return scoreB - scoreA;
    });

    // Итеративное углубление с альфа-бета
    let alpha = -Infinity;
    let beta = Infinity;
    
    for (let move of sortedMoves) {
      game.move(move);
      const value = -minimax(depth - 1, -beta, -alpha, false);
      game.undo();

      if (value > bestValue) {
        bestValue = value;
        bestMove = move.san;
      }
      
      alpha = Math.max(alpha, value);
    }

    return bestMove || possibleMoves[0].san;
  };

  // Quiescence Search - анализ тактических комбинаций (ограниченная глубина)
  const quiescence = (alpha, beta, depth = 0) => {
    const standPat = evaluateBoard();
    
    if (standPat >= beta) {
      return beta;
    }
    if (alpha < standPat) {
      alpha = standPat;
    }

    // Ограничиваем глубину quiescence для производительности
    if (depth >= 3) {
      return alpha;
    }

    // Только взятия и превращения (самые важные тактические ходы)
    const captureMoves = game.moves({ verbose: true }).filter(m => m.captured || m.promotion);
    
    // Сортируем взятия по MVV-LVA
    captureMoves.sort((a, b) => {
      const captureValue = { p: 100, n: 320, b: 330, r: 500, q: 900 };
      const valA = (a.captured ? captureValue[a.captured] : 0) + (a.promotion ? 900 : 0);
      const valB = (b.captured ? captureValue[b.captured] : 0) + (b.promotion ? 900 : 0);
      return valB - valA;
    });
    
    // Анализируем только топ-5 лучших взятий
    for (let i = 0; i < Math.min(5, captureMoves.length); i++) {
      const move = captureMoves[i];
      game.move(move);
      const score = -quiescence(-beta, -alpha, depth + 1);
      game.undo();

      if (score >= beta) {
        return beta;
      }
      if (score > alpha) {
        alpha = score;
      }
    }
    
    return alpha;
  };

  const minimax = (depth, alpha, beta, isMaximizing) => {
    if (depth === 0) {
      // Quiescence search для тактической точности
      return quiescence(alpha, beta);
    }

    const possibleMoves = game.moves({ verbose: true });
    
    if (possibleMoves.length === 0) {
      if (game.isCheckmate()) {
        return isMaximizing ? -100000 : 100000;
      }
      return 0; // Пат
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let move of possibleMoves) {
        game.move(move);
        const evaluation = minimax(depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Альфа-бета отсечение
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let move of possibleMoves) {
        game.move(move);
        const evaluation = minimax(depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Альфа-бета отсечение
      }
      return minEval;
    }
  };

  const evaluateBoard = () => {
    // Гроссмейстерская оценочная функция
    const pieceValues = {
      p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
    };

    // Улучшенные таблицы позиционных бонусов (на основе Stockfish)
    const pawnTable = [
      [0,   0,   0,   0,   0,   0,   0,   0],
      [50,  50,  50,  50,  50,  50,  50,  50],
      [10,  10,  20,  30,  30,  20,  10,  10],
      [5,   5,   10,  27,  27,  10,  5,   5],
      [0,   0,   0,   25,  25,  0,   0,   0],
      [5,   -5,  -10, 0,   0,   -10, -5,  5],
      [5,   10,  10,  -25, -25, 10,  10,  5],
      [0,   0,   0,   0,   0,   0,   0,   0]
    ];

    const knightTable = [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0,   5,   5,   0,   -20, -40],
      [-30, 5,   10,  15,  15,  10,  5,   -30],
      [-30, 0,   15,  20,  20,  15,  0,   -30],
      [-30, 5,   15,  20,  20,  15,  5,   -30],
      [-30, 0,   10,  15,  15,  10,  0,   -30],
      [-40, -20, 0,   0,   0,   0,   -20, -40],
      [-50, -40, -20, -30, -30, -20, -40, -50]
    ];

    const bishopTable = [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 5,   0,   0,   0,   0,   5,   -10],
      [-10, 10,  10,  10,  10,  10,  10,  -10],
      [-10, 0,   10,  10,  10,  10,  0,   -10],
      [-10, 5,   5,   10,  10,  5,   5,   -10],
      [-10, 0,   5,   10,  10,  5,   0,   -10],
      [-10, 0,   0,   0,   0,   0,   0,   -10],
      [-20, -10, -40, -10, -10, -40, -10, -20]
    ];

    const rookTable = [
      [0,  0,  0,  5,  5,  0,  0,  0],
      [-5, 0,  0,  0,  0,  0,  0,  -5],
      [-5, 0,  0,  0,  0,  0,  0,  -5],
      [-5, 0,  0,  0,  0,  0,  0,  -5],
      [-5, 0,  0,  0,  0,  0,  0,  -5],
      [-5, 0,  0,  0,  0,  0,  0,  -5],
      [5,  10, 10, 10, 10, 10, 10, 5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    const queenTable = [
      [-20, -10, -10, -5,  -5,  -10, -10, -20],
      [-10, 0,   5,   0,   0,   0,   0,   -10],
      [-10, 5,   5,   5,   5,   5,   0,   -10],
      [0,   0,   5,   5,   5,   5,   0,   -5],
      [-5,  0,   5,   5,   5,   5,   0,   -5],
      [-10, 0,   5,   5,   5,   5,   0,   -10],
      [-10, 0,   0,   0,   0,   0,   0,   -10],
      [-20, -10, -10, -5,  -5,  -10, -10, -20]
    ];

    const kingMiddleGameTable = [
      [20,  30,  10,  0,   0,   10,  30,  20],
      [20,  20,  0,   0,   0,   0,   20,  20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30]
    ];

    let totalEvaluation = 0;
    const board = game.board();
    let whitePieces = 0;
    let blackPieces = 0;

    // Подсчет материала для определения фазы игры
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = board[i][j];
        if (!square) continue;

        const pieceValue = pieceValues[square.type];
        const isWhite = square.color === 'w';
        const multiplier = isWhite ? 1 : -1;

        if (isWhite) whitePieces += pieceValue;
        else blackPieces += pieceValue;

        // Базовая стоимость фигуры
        totalEvaluation += pieceValue * multiplier;

        // Позиционные бонусы с учетом всех таблиц
        let positionalBonus = 0;
        const row = isWhite ? i : 7 - i;

        if (square.type === 'p') {
          positionalBonus = pawnTable[row][j];
          // Бонус за проходную пешку
          if (row >= 4) positionalBonus += (row - 3) * 10;
        } else if (square.type === 'n') {
          positionalBonus = knightTable[row][j];
        } else if (square.type === 'b') {
          positionalBonus = bishopTable[row][j];
          // Бонус за пару слонов
          const bishops = board.flat().filter(p => p && p.type === 'b' && p.color === square.color);
          if (bishops.length >= 2) positionalBonus += 30;
        } else if (square.type === 'r') {
          positionalBonus = rookTable[row][j];
          // Бонус за ладью на открытой линии
          const colPawns = board.filter(r => r[j] && r[j].type === 'p').length;
          if (colPawns === 0) positionalBonus += 20;
        } else if (square.type === 'q') {
          positionalBonus = queenTable[row][j];
        } else if (square.type === 'k') {
          // Король использует разные таблицы в зависимости от фазы игры
          const totalMaterial = whitePieces + blackPieces;
          const isEndgame = totalMaterial < 3000;
          
          if (!isEndgame) {
            positionalBonus = kingMiddleGameTable[row][j];
          } else {
            // В эндшпиле король должен быть активным
            positionalBonus = -kingMiddleGameTable[row][j] * 0.5;
          }
        }

        totalEvaluation += positionalBonus * multiplier;
      }
    }

    // Продвинутая оценка мобильности
    const currentTurn = game.turn();
    const mobility = game.moves().length;
    
    // Переключаем ход для подсчета мобильности противника
    let opponentMobility = 0;
    try {
      const fenParts = game.fen().split(' ');
      fenParts[1] = currentTurn === 'w' ? 'b' : 'w';
      fenParts[3] = '-'; // Убираем en-passant для корректного FEN
      const tempGame = new Chess(fenParts.join(' '));
      opponentMobility = tempGame.moves().length;
    } catch (error) {
      // Если не удалось создать позицию, используем текущую мобильность
      opponentMobility = mobility;
    }
    
    totalEvaluation += (mobility - opponentMobility) * 5;

    // Оценка структуры пешек
    let doubledPawns = 0;
    let isolatedPawns = 0;
    
    for (let j = 0; j < 8; j++) {
      const colPawns = [];
      for (let i = 0; i < 8; i++) {
        if (board[i][j] && board[i][j].type === 'p') {
          colPawns.push({ color: board[i][j].color, row: i });
        }
      }
      
      // Сдвоенные пешки
      if (colPawns.length > 1) {
        doubledPawns += colPawns.length - 1;
      }
      
      // Изолированные пешки
      if (colPawns.length > 0) {
        const hasNeighbor = 
          (j > 0 && board.some(row => row[j-1] && row[j-1].type === 'p' && row[j-1].color === colPawns[0].color)) ||
          (j < 7 && board.some(row => row[j+1] && row[j+1].type === 'p' && row[j+1].color === colPawns[0].color));
        
        if (!hasNeighbor) isolatedPawns++;
      }
    }
    
    totalEvaluation -= (doubledPawns * 10 + isolatedPawns * 15);

    // Упрощенная оценка контроля центра (оптимизация)
    const centerSquares = ['d4', 'e4', 'd5', 'e5'];
    let centerControl = 0;
    for (let i = 3; i <= 4; i++) {
      for (let j = 3; j <= 4; j++) {
        const square = board[i][j];
        if (square) {
          if (square.color === 'w') centerControl += 15;
          else centerControl -= 15;
        }
      }
    }
    totalEvaluation += centerControl;

    // Серьезный штраф за шах
    if (game.isCheck()) {
      totalEvaluation += currentTurn === 'w' ? -80 : 80;
    }

    // Бонус за безопасность короля (рокировка)
    const history = game.history({ verbose: true });
    const hasCastled = history.some(move => move.flags.includes('k') || move.flags.includes('q'));
    if (hasCastled) {
      totalEvaluation += currentTurn === 'w' ? 50 : -50;
    }

    return currentTurn === 'w' ? totalEvaluation : -totalEvaluation;
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
        <div className={styles['header-title']}>
          <GiChessKing className={styles['title-icon']} />
          <h2>Шахматы vs AI</h2>
        </div>
        <div className={styles['chess-controls']}>
          <div className={styles['control-group']}>
            <IoMdSettings className={styles['control-icon']} />
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className={styles['chess-select']}
            >
              <option value="easy">Лёгкий</option>
              <option value="medium">Средний</option>
              <option value="hard">Непобедимый</option>
            </select>
          </div>
          
          <button onClick={switchColor} className={`${styles['chess-btn']} ${styles['chess-btn-secondary']}`}>
            <FaCircle /> {playerColor === 'white' ? 'Играть за белых' : 'Играть за чёрных'}
          </button>
          
          <button onClick={undoMove} className={`${styles['chess-btn']} ${styles['chess-btn-secondary']}`} disabled={moveHistory.length < 2}>
            <FaHistory /> Отменить
          </button>
          
          <button onClick={resetGame} className={`${styles['chess-btn']} ${styles['chess-btn-primary']}`}>
            <FaRedo /> Новая игра
          </button>
        </div>
      </div>

      <div className={styles['chess-game-status']}>
        <div className={styles['status-content']}>
          <h3>{gameStatus}</h3>
          {isComputerTurn && (
            <span className={styles['thinking']}>
              <FaBrain className={styles['robot-icon']} /> 
              {engineThinking || 'AI анализирует позицию...'}
            </span>
          )}
        </div>
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
            isDraggablePiece={({ piece }) => {
              // Разрешаем перетаскивать только фигуры игрока
              if (isComputerTurn) return false;
              const pieceColor = piece[0];
              return (playerColor === 'white' && pieceColor === 'w') || 
                     (playerColor === 'black' && pieceColor === 'b');
            }}
            animationDuration={200}
            arePiecesDraggable={!isComputerTurn}
            snapToCursor={true}
            customPremoveDarkSquareStyle={{ backgroundColor: '#779952' }}
            customPremoveLightSquareStyle={{ backgroundColor: '#edeed1' }}
          />
        </div>

        <div className={styles['chess-sidebar']}>
          <div className={styles['move-history']}>
            <h4>
              <FaHistory className={styles['section-icon']} /> 
              История ходов
            </h4>
            <div className={styles['moves-list']}>
              {moveHistory.length === 0 ? (
                <p className={styles['no-moves']}>Ходы появятся здесь</p>
              ) : (
                moveHistory.map((move, index) => (
                  <div key={index} className={styles['move-item']}>
                    <span className={styles['move-number']}>{Math.floor(index / 2) + 1}.</span>
                    <span className={`${styles['move-notation']} ${index % 2 === 0 ? styles['white'] : styles['black']}`}>
                      {move}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles['game-info']}>
            <h4>
              <FaRobot className={styles['section-icon']} />
              Информация
            </h4>
            <div className={styles['info-item']}>
              <span>Вы играете:</span>
              <strong>
                <FaCircle className={styles['color-indicator']} /> 
                {playerColor === 'white' ? 'Белыми' : 'Чёрными'}
              </strong>
            </div>
            <div className={styles['info-item']}>
              <span>Сложность AI:</span>
              <strong>
                {difficulty === 'easy' && (
                  <>
                    <FaCircle style={{ color: '#10b981', fontSize: '12px' }} /> Лёгкий
                  </>
                )}
                {difficulty === 'medium' && (
                  <>
                    <FaCircle style={{ color: '#f59e0b', fontSize: '12px' }} /> Средний
                  </>
                )}
                {difficulty === 'hard' && (
                  <>
                    <FaBolt style={{ color: '#ef4444', fontSize: '14px' }} /> Непобедимый AI
                    {stockfishReady && <span style={{ color: '#10b981', fontSize: '10px', marginLeft: '5px' }}>(OpenWay AI активен)</span>}
                  </>
                )}
              </strong>
            </div>
            <div className={styles['info-item']}>
              <span>Сделано ходов:</span>
              <strong>{moveHistory.length}</strong>
            </div>
            {difficulty === 'hard' && (
              <div className={styles['ai-warning']}>
                <FaCrown />
                <span>Максимальная мощность AI!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChessGame;
