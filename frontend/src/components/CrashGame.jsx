import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import './CrashGame.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CrashGame() {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('waiting'); // waiting, running, crashed
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [currentBet, setCurrentBet] = useState(null);
  const [bets, setBets] = useState([]);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [cashedOut, setCashedOut] = useState(false);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Получить баланс пользователя
  useEffect(() => {
    fetchBalance();
    fetchHistory();
    fetchStats();
  }, []);

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        console.error('[CRASH] No token or user');
        return 0;
      }
      
      console.log('[CRASH] Fetching balance for user:', user.id);
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.error('[CRASH] Balance fetch failed:', response.status, response.statusText);
        return 0;
      }
      
      const data = await response.json();
      console.log('[CRASH] Fetched user data:', data);
      console.log('[CRASH] User balance:', data.points);
      setBalance(data.points || 0);
      return data.points || 0;
    } catch (error) {
      console.error('[CRASH] Error fetching balance:', error);
      return 0;
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/crash/history?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/crash/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // WebSocket подключение
  useEffect(() => {
    // Проверяем что пользователь загружен
    if (!user) {
      console.log('[CRASH] Waiting for user to load...');
      return;
    }
    
    const token = localStorage.getItem('token');
    const userId = user.id;
    
    console.log('[CRASH] Connecting with userId:', userId);
    console.log('[CRASH] User object:', user);
    
    if (!userId || !token) {
      console.error('[CRASH] No userId or token found');
      alert('Ошибка авторизации. Пожалуйста, перезайдите.');
      return;
    }
    
    const newSocket = io(API_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('[CRASH] Connected to Crash game, socket ID:', newSocket.id);
      console.log('[CRASH] Registering with userId:', userId);
      newSocket.emit('register', userId);
      newSocket.emit('crash:join');
    });

    // События игры
    newSocket.on('crash:new-game', (data) => {
      console.log('New game created:', data);
      setGameState('waiting');
      setMultiplier(1.00);
      setCrashPoint(null);
      setCurrentBet(null);
      setCashedOut(false);
      setCountdown(10);
      
      // Обратный отсчет
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });

    newSocket.on('crash:game-started', () => {
      console.log('Game started!');
      setGameState('running');
      setCountdown(null);
    });

    newSocket.on('crash:multiplier-update', (data) => {
      setMultiplier(data.multiplier);
    });

    newSocket.on('crash:game-crashed', (data) => {
      console.log('Game crashed at:', data.crashPoint);
      setGameState('crashed');
      setCrashPoint(data.crashPoint);
      
      // Обновить баланс и историю
      setTimeout(() => {
        fetchBalance();
        fetchHistory();
        fetchStats();
      }, 1000);
    });

    newSocket.on('crash:bets-update', (data) => {
      setBets(data.bets);
    });

    newSocket.on('crash:bet-placed', (data) => {
      console.log('[CRASH] Bet placed successfully:', data.bet);
      setCurrentBet(data.bet);
      // Обновить баланс сразу после ставки
      fetchBalance();
    });

    newSocket.on('crash:cashout-success', (data) => {
      console.log('Cashout success:', data);
      setCashedOut(true);
      setCurrentBet(null);
      fetchBalance();
    });

    newSocket.on('crash:bet-error', (data) => {
      console.error('[CRASH] Bet error:', data.error);
      alert('Ошибка ставки: ' + data.error);
      // Обновить баланс после ошибки
      fetchBalance();
    });

    newSocket.on('crash:cashout-error', (data) => {
      console.error('[CRASH] Cashout error:', data.error);
      alert('Ошибка вывода: ' + data.error);
    });

    newSocket.on('crash:current-game', (data) => {
      if (data.game) {
        setGameState(data.game.status);
        setMultiplier(parseFloat(data.game.current_multiplier));
        setBets(data.bets);
        
        // Проверить есть ли наша ставка
        if (user && user.id) {
          const myBet = data.bets.find(bet => bet.user_id === user.id && bet.status === 'active');
          if (myBet) {
            setCurrentBet(myBet);
          }
        }
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('crash:leave');
        newSocket.disconnect();
      }
    };
  }, [user]); // Подключаемся когда user загружен

  // Анимация графика
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Очистить canvas
    ctx.clearRect(0, 0, width, height);
    
    if (gameState === 'waiting') {
      // Показать текст ожидания
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Ожидание...', width / 2, height / 2);
      return;
    }
    
    // Нарисовать график
    const points = [];
    const maxMultiplier = Math.max(multiplier, crashPoint || multiplier);
    const scale = height / (maxMultiplier + 0.5);
    
    for (let x = 0; x <= width; x += 5) {
      const progress = x / width;
      const y = height - (1 + progress * (multiplier - 1)) * scale;
      points.push({ x, y });
    }
    
    // Фон градиент
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (gameState === 'crashed') {
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(0, 255, 136, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Линия графика
    ctx.strokeStyle = gameState === 'crashed' ? '#ff0000' : '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    
  }, [multiplier, gameState, crashPoint]);

  const placeBet = async () => {
    if (!socket || gameState !== 'waiting') {
      alert('Нельзя сделать ставку сейчас');
      return;
    }
    
    if (betAmount < 10 || betAmount > 1000) {
      alert('Ставка должна быть от 10 до 1000 баллов');
      return;
    }
    
    // Получить актуальный баланс перед ставкой
    const currentBalance = await fetchBalance();
    console.log('Current balance before bet:', currentBalance);
    console.log('Bet amount:', betAmount);
    
    if (betAmount > currentBalance) {
      alert(`Недостаточно баллов. У вас: ${currentBalance}, нужно: ${betAmount}`);
      return;
    }
    
    socket.emit('crash:place-bet', { betAmount });
  };

  const cashOut = () => {
    if (!socket || !currentBet || gameState !== 'running') {
      return;
    }
    
    socket.emit('crash:cashout', { betId: currentBet.id });
  };

  const getMultiplierColor = () => {
    if (multiplier < 2) return '#00ff88';
    if (multiplier < 5) return '#ffeb3b';
    if (multiplier < 10) return '#ff9800';
    return '#ff5722';
  };

  // Проверяем загружен ли пользователь
  if (!user) {
    return (
      <div className="crash-game">
        <div className="crash-header">
          <h1>🚀 Crash Game</h1>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crash-game">
      <div className="crash-header">
        <h1>🚀 Crash Game</h1>
        <div className="balance">Баланс: {balance} баллов</div>
      </div>

      <div className="crash-main">
        <div className="crash-game-area">
          <div className="multiplier-display" style={{ color: getMultiplierColor() }}>
            {gameState === 'crashed' ? (
              <div className="crashed-text">
                <div>💥 CRASHED!</div>
                <div className="crash-point">{crashPoint}x</div>
              </div>
            ) : (
              <div className="current-multiplier">
                {multiplier.toFixed(2)}x
              </div>
            )}
          </div>

          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400}
            className="crash-canvas"
          />

          {countdown !== null && (
            <div className="countdown-overlay">
              <div className="countdown-text">
                Игра начнется через {countdown}...
              </div>
            </div>
          )}
        </div>

        <div className="crash-controls">
          <div className="bet-input-group">
            <label>Ставка:</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 10)}
              min="10"
              max="1000"
              disabled={gameState !== 'waiting' || currentBet}
            />
            <div className="quick-bets">
              <button onClick={() => setBetAmount(10)}>10</button>
              <button onClick={() => setBetAmount(50)}>50</button>
              <button onClick={() => setBetAmount(100)}>100</button>
              <button onClick={() => setBetAmount(500)}>500</button>
            </div>
          </div>

          {!currentBet && gameState === 'waiting' && (
            <button className="bet-button" onClick={placeBet}>
              Сделать ставку {betAmount} баллов
            </button>
          )}

          {currentBet && !cashedOut && gameState === 'running' && (
            <button className="cashout-button" onClick={cashOut}>
              Вывести {(currentBet.bet_amount * multiplier).toFixed(0)} баллов
            </button>
          )}

          {currentBet && gameState === 'waiting' && (
            <div className="bet-placed">
              ✅ Ставка {currentBet.bet_amount} баллов размещена
            </div>
          )}

          {cashedOut && (
            <div className="cashed-out">
              💰 Вы вывели деньги!
            </div>
          )}
        </div>
      </div>

      <div className="crash-sidebar">
        <div className="current-bets">
          <h3>Текущие ставки ({bets.length})</h3>
          <div className="bets-list">
            {bets.slice(0, 10).map((bet) => (
              <div key={bet.id} className={`bet-item ${bet.status}`}>
                <span className="username">{bet.username}</span>
                <span className="amount">{bet.bet_amount}</span>
                {bet.status === 'cashed_out' && (
                  <span className="cashout-info">
                    {bet.cashout_multiplier}x = {bet.win_amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="game-history">
          <h3>История</h3>
          <div className="history-list">
            {history.map((game) => (
              <div 
                key={game.id} 
                className="history-item"
                style={{
                  backgroundColor: game.crash_point < 2 ? '#ff5722' : 
                                   game.crash_point < 5 ? '#ff9800' : '#00ff88'
                }}
              >
                {game.crash_point}x
              </div>
            ))}
          </div>
        </div>

        {stats && (
          <div className="player-stats">
            <h3>Ваша статистика</h3>
            <div className="stat-row">
              <span>Игр:</span>
              <span>{stats.total_games}</span>
            </div>
            <div className="stat-row">
              <span>Побед:</span>
              <span>{stats.wins}</span>
            </div>
            <div className="stat-row">
              <span>Поражений:</span>
              <span>{stats.losses}</span>
            </div>
            <div className="stat-row">
              <span>Выигрыш:</span>
              <span className="positive">+{stats.total_won}</span>
            </div>
            <div className="stat-row">
              <span>Лучший:</span>
              <span className="highlight">{stats.best_multiplier}x</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrashGame;
