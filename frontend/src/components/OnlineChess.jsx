import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import api, { BASE_URL } from '../utils/api';
import { getFrameStyle } from '../utils/frameUtils';
import '../styles/UsernameStyles.css';
import styles from './OnlineChess.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const OnlineChess = () => {
  const { getSocket } = useWebSocket();
  const { user } = useAuth();
  const socket = getSocket();
  const [view, setView] = useState('menu'); // menu, challenge, game
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('white');
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState('');
  const [selectedColor, setSelectedColor] = useState('white');
  const [betAmount, setBetAmount] = useState(100);
  const [myTimeLeft, setMyTimeLeft] = useState(300); // Моё оставшееся время
  const [opponentTimeLeft, setOpponentTimeLeft] = useState(300);
  const [myTurnStartTime, setMyTurnStartTime] = useState(null); // Когда начался мой ход
  const [displayTime, setDisplayTime] = useState(300); // Для отображения
  const [cosmetics, setCosmetics] = useState({ frames: [], banners: [] });

  // Используем ID из AuthContext
  const currentUserId = user?.id;

  useEffect(() => {
    console.log('📋 Текущий пользователь из AuthContext:', user);
    console.log('📋 ID пользователя:', currentUserId);
  }, [user, currentUserId]);

  // Загрузка косметики
  useEffect(() => {
    loadCosmetics();
  }, []);

  const loadCosmetics = async () => {
    try {
      const [framesRes, bannersRes] = await Promise.all([
        api.get('/shop/items?type=frame'),
        api.get('/shop/items?type=banner')
      ]);
      setCosmetics({
        frames: framesRes.data.items,
        banners: bannersRes.data.items
      });
    } catch (error) {
      console.error('Ошибка загрузки косметики:', error);
    }
  };

  const getFrameImage = (frameKey) => {
    if (!frameKey || frameKey === 'none') return null;
    const frame = cosmetics.frames.find(f => f.item_key === frameKey);
    return frame?.image_url ? `${BASE_URL}${frame.image_url}` : null;
  };

  const getFrameItem = (frameKey) => {
    if (!frameKey || frameKey === 'none') return null;
    return cosmetics.frames.find(f => f.item_key === frameKey) || null;
  };

  const getBannerImage = (bannerKey) => {
    if (!bannerKey || bannerKey === 'default') return null;
    const banner = cosmetics.banners.find(b => b.item_key === bannerKey);
    return banner?.image_url ? `${BASE_URL}${banner.image_url}` : null;
  };

  // Таймер обратного отсчёта - обновляется каждую секунду
  useEffect(() => {
    if (view !== 'game' || !currentGame || currentGame.status !== 'active') {
      return;
    }

    const isMyTurn = (game.turn() === 'w' && playerColor === 'white') || 
                     (game.turn() === 'b' && playerColor === 'black');

    if (!isMyTurn) {
      // Если не наш ход, просто показываем сохранённое время
      setDisplayTime(myTimeLeft);
      return;
    }

    // Если наш ход, но таймер не запущен - запускаем
    if (!myTurnStartTime) {
      console.log('⏱️ Запускаем таймер для нашего хода');
      setMyTurnStartTime(Date.now());
      setDisplayTime(myTimeLeft);
      return;
    }

    // Обновляем отображаемое время каждые 100мс
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - myTurnStartTime) / 1000);
      const remaining = Math.max(0, myTimeLeft - elapsed);
      setDisplayTime(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        toast.error('⏱️ Время истекло!');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [view, currentGame, game.fen(), playerColor, myTurnStartTime, myTimeLeft]);

  useEffect(() => {
    loadAvailablePlayers();
    loadMyGames();

    if (socket) {
      // Получение вызова на игру
      socket.on('chess-challenge-received', handleChallengeReceived);
      
      // Уведомление о принятом вызове
      socket.on('chess-challenge-accepted-notification', handleChallengeAccepted);
      
      // Уведомление об отклонённом вызове
      socket.on('chess-challenge-declined-notification', handleChallengeDeclined);
      
      // Ход противника
      socket.on('chess-move-made', handleOpponentMove);
      
      // Игра завершена
      socket.on('chess-game-finished', handleGameFinished);

      return () => {
        socket.off('chess-challenge-received', handleChallengeReceived);
        socket.off('chess-challenge-accepted-notification', handleChallengeAccepted);
        socket.off('chess-challenge-declined-notification', handleChallengeDeclined);
        socket.off('chess-move-made', handleOpponentMove);
        socket.off('chess-game-finished', handleGameFinished);
      };
    }
  }, [socket]);

  const loadAvailablePlayers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/chess/available-players`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePlayers(response.data.players);
    } catch (error) {
      console.error('Ошибка загрузки игроков:', error);
    }
  };

  const loadMyGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/chess/my-games`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyGames(response.data.games);
    } catch (error) {
      console.error('Ошибка загрузки игр:', error);
    }
  };

  const handleChallengeReceived = (data) => {
    const { gameId, challengerName } = data;
    
    console.log('🎯 Получен вызов на шахматы:', data);
    
    // Сразу обновляем список игр
    loadMyGames();
    
    toast.info(`${challengerName} бросил вам вызов на партию в шахматы!`, {
      autoClose: 5000,
      onClick: () => {
        setView('menu');
      }
    });
  };

  const handleChallengeAccepted = (data) => {
    toast.success('Ваш вызов принят! Игра началась!');
    loadMyGames();
  };

  const handleChallengeDeclined = (data) => {
    toast.error('Ваш вызов был отклонён');
    loadMyGames();
  };

  const handleOpponentMove = (data) => {
    const { move, position, whiteTimeLeft, blackTimeLeft } = data;
    const newGame = new Chess(position);
    setGame(newGame);
    
    const history = newGame.history({ verbose: true });
    setMoveHistory(history);
    
    // Обновляем таймеры после хода противника
    if (whiteTimeLeft !== undefined && blackTimeLeft !== undefined) {
      const isWhite = playerColor === 'white';
      const newMyTime = isWhite ? whiteTimeLeft : blackTimeLeft;
      const newOpponentTime = isWhite ? blackTimeLeft : whiteTimeLeft;
      
      console.log(`⏱️ Ход противника - Моё время: ${newMyTime}s, Время противника: ${newOpponentTime}s`);
      
      setMyTimeLeft(newMyTime);
      setOpponentTimeLeft(newOpponentTime);
      setDisplayTime(newMyTime);
      
      // Теперь наш ход - запускаем таймер
      const isOurTurn = (newGame.turn() === 'w' && playerColor === 'white') || 
                        (newGame.turn() === 'b' && playerColor === 'black');
      
      if (isOurTurn) {
        console.log('⏱️ Теперь наш ход - запускаем таймер с времени:', newMyTime);
        // Используем setTimeout чтобы гарантировать обновление состояния
        setTimeout(() => {
          setMyTurnStartTime(Date.now());
        }, 0);
      } else {
        setMyTurnStartTime(null);
      }
    }
    
    updateGameStatus(newGame);
  };

  const handleGameFinished = (data) => {
    const { result, reason } = data;
    let message = 'Игра завершена: ';
    if (result === 'white') message += 'Победили белые';
    else if (result === 'black') message += 'Победили чёрные';
    else message += 'Ничья';
    
    toast.info(`${message} (${reason})`);
    setView('menu');
    loadMyGames();
  };

  const sendChallenge = async (opponentId) => {
    try {
      console.log('🎯 Отправка вызова противнику:', opponentId);
      console.log('🎯 Мой ID:', currentUserId);
      
      if (opponentId === currentUserId) {
        toast.error('Нельзя вызвать самого себя!');
        return;
      }

      if (betAmount < 0) {
        toast.error('Ставка не может быть отрицательной!');
        return;
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/chess/challenge`,
        { opponentId, playerColor: selectedColor, betAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { game: newGame, challengerName } = response.data;
      
      console.log('📤 Отправка вызова:', { opponentId, gameId: newGame.id, challengerName });
      console.log('📤 Игра создана:', newGame);
      
      if (socket) {
        socket.emit('chess-challenge-sent', {
          opponentId,
          gameId: newGame.id,
          challengerName
        });
      } else {
        console.error('❌ Socket не подключён!');
      }

      toast.success('Вызов отправлен!');
      loadMyGames();
      setView('menu');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка отправки вызова');
    }
  };

  const acceptChallenge = async (gameId, challengerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/chess/accept/${gameId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (socket) {
        socket.emit('chess-challenge-accepted', { gameId, challengerId });
      }

      toast.success('Вызов принят! Игра началась!');
      loadGame(gameId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка принятия вызова');
    }
  };

  const declineChallenge = async (gameId, challengerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/chess/decline/${gameId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (socket) {
        socket.emit('chess-challenge-declined', { gameId, challengerId });
      }

      toast.info('Вызов отклонён');
      loadMyGames();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка отклонения вызова');
    }
  };

  const loadGame = async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/chess/game/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const gameData = response.data.game;
      setCurrentGame(gameData);

      const isWhite = gameData.white_player_id === currentUserId;
      setPlayerColor(isWhite ? 'white' : 'black');

      const chessGame = new Chess(gameData.position);
      setGame(chessGame);
      
      // Безопасный парсинг move_history
      let history = [];
      if (gameData.move_history) {
        try {
          history = typeof gameData.move_history === 'string' 
            ? JSON.parse(gameData.move_history) 
            : gameData.move_history;
        } catch (e) {
          console.error('Ошибка парсинга истории ходов:', e);
          history = [];
        }
      }
      setMoveHistory(history);
      
      // Инициализация таймеров (каждый игрок стартует с 300 секунд)
      const myTime = isWhite ? gameData.white_time_left : gameData.black_time_left;
      const oppTime = isWhite ? gameData.black_time_left : gameData.white_time_left;
      
      setMyTimeLeft(myTime);
      setOpponentTimeLeft(oppTime);
      setDisplayTime(myTime);
      
      // Проверяем, чей сейчас ход
      const isMyTurn = (chessGame.turn() === 'w' && isWhite) || (chessGame.turn() === 'b' && !isWhite);
      if (isMyTurn) {
        setMyTurnStartTime(Date.now()); // Запускаем таймер если наш ход
      } else {
        setMyTurnStartTime(null);
      }
      
      updateGameStatus(chessGame);

      if (socket) {
        socket.emit('join-chess-game', gameId);
      }

      setView('game');
    } catch (error) {
      toast.error('Ошибка загрузки игры');
      console.error(error);
    }
  };

  const makeMove = (sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      const newGame = new Chess(game.fen());
      setGame(newGame);

      const history = newGame.history({ verbose: true });
      setMoveHistory(history);

      // Отправляем ход на сервер и через WebSocket
      const token = localStorage.getItem('token');
      axios.post(
        `${API_URL}/chess/move/${currentGame.id}`,
        { move: move.san, position: newGame.fen() },
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(response => {
        // Обновляем таймер после успешного хода
        const updatedGame = response.data.game;
        const isWhite = playerColor === 'white';
        const newMyTime = isWhite ? updatedGame.white_time_left : updatedGame.black_time_left;
        const newOpponentTime = isWhite ? updatedGame.black_time_left : updatedGame.white_time_left;
        
        console.log(`⏱️ После хода - Моё время: ${newMyTime}s, Время противника: ${newOpponentTime}s`);
        
        // Обновляем состояния
        setMyTimeLeft(newMyTime);
        setOpponentTimeLeft(newOpponentTime);
        setDisplayTime(newMyTime);
        setMyTurnStartTime(null); // Останавливаем наш таймер - теперь ход противника
        
        console.log('⏱️ Наш таймер остановлен, ждём хода противника');
      }).catch(err => {
        console.error('❌ Ошибка сохранения хода:', err);
        console.error('❌ Детали ошибки:', err.response?.data);
        console.error('❌ Статус:', err.response?.status);
        console.error('❌ Полный ответ:', err.response);
        console.error('❌ Сообщение об ошибке:', err.response?.data?.error);
        
        if (err.response?.data?.timeout) {
          toast.error('⏱️ Время истекло! Вы проиграли.');
          setTimeout(() => {
            setView('menu');
            loadMyGames();
          }, 2000);
        } else if (err.response?.data?.error) {
          toast.error(`Ошибка: ${err.response.data.error}`);
        } else {
          toast.error('Ошибка при сохранении хода');
        }
      });

      if (socket) {
        socket.emit('chess-move', {
          gameId: currentGame.id,
          move: move.san,
          position: newGame.fen()
        });
      }

      updateGameStatus(newGame);
      return true;
    } catch (error) {
      return false;
    }
  };

  const updateGameStatus = (chessGame) => {
    if (chessGame.isCheckmate()) {
      const winner = chessGame.turn() === 'w' ? 'black' : 'white';
      setGameStatus(`Мат! Победили ${winner === 'white' ? 'белые' : 'чёрные'}`);
      endGame(winner, 'checkmate');
    } else if (chessGame.isDraw()) {
      setGameStatus('Ничья!');
      endGame('draw', 'stalemate');
    } else if (chessGame.isStalemate()) {
      setGameStatus('Пат!');
      endGame('draw', 'stalemate');
    } else if (chessGame.isCheck()) {
      setGameStatus('Шах!');
    } else {
      const turn = chessGame.turn() === 'w' ? 'белых' : 'чёрных';
      setGameStatus(`Ход ${turn}`);
    }
  };

  const endGame = async (result, reason) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/chess/end/${currentGame.id}`,
        { result, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (socket) {
        socket.emit('chess-game-ended', {
          gameId: currentGame.id,
          result,
          reason
        });
      }
    } catch (error) {
      console.error('Ошибка завершения игры:', error);
    }
  };

  const resign = () => {
    if (window.confirm('Вы уверены, что хотите сдаться?')) {
      const winner = playerColor === 'white' ? 'black' : 'white';
      endGame(winner, 'resignation');
      toast.info('Вы сдались');
      setView('menu');
      loadMyGames();
    }
  };

  const backToMenu = () => {
    if (socket && currentGame) {
      socket.emit('leave-chess-game', currentGame.id);
    }
    setView('menu');
  };

  const onDrop = (sourceSquare, targetSquare) => {
    // Проверяем, чей сейчас ход
    const isMyTurn = 
      (game.turn() === 'w' && playerColor === 'white') ||
      (game.turn() === 'b' && playerColor === 'black');

    if (!isMyTurn) {
      toast.warning('Сейчас не ваш ход!');
      return false;
    }

    return makeMove(sourceSquare, targetSquare);
  };

  return (
    <div className={styles['online-chess-container']}>
      {view === 'menu' && (
        <div className={styles['chess-menu']}>
          <h1>Онлайн Шахматы</h1>
          
          <div className={styles['chess-sections']}>
            <div className={styles['chess-section']}>
              <h2>Мои игры</h2>
              {myGames.length === 0 ? (
                <p className={styles['no-games']}>Нет активных игр</p>
              ) : (
                <div className={styles['games-list']}>
                  {myGames.map((g) => {
                    if (!currentUserId) return null;
                    
                    const isChallenger = g.challenger_id === currentUserId;
                    const isPending = g.status === 'pending';
                    const opponent = g.white_player_id === currentUserId 
                      ? { 
                          name: g.black_full_name || g.black_username, 
                          avatar: g.black_avatar,
                          banner: g.black_player_banner,
                          frame: g.black_player_frame,
                          usernameStyle: g.black_username_style
                        }
                      : { 
                          name: g.white_full_name || g.white_username, 
                          avatar: g.white_avatar,
                          banner: g.white_player_banner,
                          frame: g.white_player_frame,
                          usernameStyle: g.white_username_style
                        };
                    
                    const frameImage = getFrameImage(opponent.frame);
                    const frameItem  = getFrameItem(opponent.frame);
                    const avatarUrl = opponent.avatar ? `${BASE_URL}${opponent.avatar}` : '/default-avatar.png';
                    const bannerImage = getBannerImage(opponent.banner);
                    const defaultBanner = opponent.banner === 'default' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(255, 255, 255, 0.08)';

                    return (
                      <div 
                        key={g.id} 
                        className={styles['game-card']}
                        style={{
                          backgroundImage: bannerImage 
                            ? `url(${bannerImage})` 
                            : defaultBanner,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {(bannerImage || opponent.banner === 'default') && (
                          <div className={styles['game-card-overlay']}></div>
                        )}
                        <div className={styles['game-info']}>
                          <div className={styles['opponent-avatar-wrapper']}>
                            <img 
                              src={avatarUrl} 
                              alt={opponent.name}
                              className={styles['opponent-avatar']}
                            />
                            {frameImage && (
                              <img 
                                src={frameImage}
                                alt="Frame"
                                className={styles['opponent-avatar-frame']}
                                style={getFrameStyle(frameItem, 'chess')}
                              />
                            )}
                          </div>
                          <div>
                            <h3 className={`styled-username ${opponent.usernameStyle || 'username-none'}`}>
                              {opponent.name}
                            </h3>
                            <p className={styles['game-status-text']}>
                              {isPending 
                                ? (isChallenger ? 'Ожидание ответа...' : `Входящий вызов (ставка: ${g.bet_amount || 0} 💎)`) 
                                : 'Активная игра'}
                            </p>
                            {g.bet_amount > 0 && (
                              <p className={styles['bet-info']}>Ставка: {g.bet_amount} 💎</p>
                            )}
                          </div>
                        </div>
                        <div className={styles['game-actions']}>
                          {isPending && !isChallenger && (
                            <>
                              <button 
                                className={styles['btn-accept']}
                                onClick={() => acceptChallenge(g.id, g.challenger_id)}
                              >
                                Принять
                              </button>
                              <button 
                                className={styles['btn-decline']}
                                onClick={() => declineChallenge(g.id, g.challenger_id)}
                              >
                                Отклонить
                              </button>
                            </>
                          )}
                          {g.status === 'active' && (
                            <button 
                              className={styles['btn-play']}
                              onClick={() => loadGame(g.id)}
                            >
                              Играть
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles['chess-section']}>
              <h2>Доступные игроки</h2>
              <button 
                className={styles['btn-challenge']}
                onClick={() => setView('challenge')}
              >
                Бросить вызов
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'challenge' && (
        <div className={styles['challenge-view']}>
          <button className={styles['btn-back']} onClick={() => setView('menu')}>
            ← Назад
          </button>
          <h2>Выберите соперника</h2>
          
          <div className={styles['bet-selector']}>
            <label>
              <span>Ставка (баллы):</span>
              <input
                type="number"
                min="0"
                step="10"
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                className={styles['bet-input']}
              />
            </label>
            <p className={styles['bet-hint']}>
              🪙 При выигрыше получите {betAmount * 2 - Math.floor(betAmount * 2 * 0.05)} баллов (комиссия 5%)
            </p>
          </div>
          
          <div className={styles['color-selector']}>
            <label>
              <input
                type="radio"
                value="white"
                checked={selectedColor === 'white'}
                onChange={() => setSelectedColor('white')}
              />
              Играть белыми
            </label>
            <label>
              <input
                type="radio"
                value="black"
                checked={selectedColor === 'black'}
                onChange={() => setSelectedColor('black')}
              />
              Играть чёрными
            </label>
          </div>

          <div className={styles['players-list']}>
            {availablePlayers.map((player) => {
              const frameImage = getFrameImage(player.avatar_frame);
              const frameItem  = getFrameItem(player.avatar_frame);
              const avatarUrl = player.avatar_url ? `${BASE_URL}${player.avatar_url}` : '/default-avatar.png';
              const bannerImage = getBannerImage(player.profile_banner);
              const defaultBanner = player.profile_banner === 'default' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.05)';
              
              return (
                <div 
                  key={player.id} 
                  className={styles['player-card']}
                  style={{
                    backgroundImage: bannerImage 
                      ? `url(${bannerImage})` 
                      : defaultBanner,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {(bannerImage || player.profile_banner === 'default') && (
                    <div className={styles['player-card-overlay']}></div>
                  )}
                  <div className={styles['player-avatar-wrapper']}>
                    <img 
                      src={avatarUrl} 
                      alt={player.full_name}
                      className={styles['player-avatar']}
                    />
                    {frameImage && (
                      <img 
                        src={frameImage}
                        alt="Frame"
                        className={styles['player-avatar-frame-small']}
                        style={getFrameStyle(frameItem, 'chess')}
                      />
                    )}
                  </div>
                  <div className={styles['player-info']}>
                    <h3 className={`styled-username ${player.username_style || 'username-none'}`}>
                      {player.full_name || player.username}
                    </h3>
                    <span className={`status ${player.is_online ? 'online' : 'offline'}`}>
                      {player.is_online ? 'В сети' : 'Не в сети'}
                    </span>
                  </div>
                  <button 
                    className={styles['btn-send-challenge']}
                    onClick={() => sendChallenge(player.id)}
                  >
                    Вызвать
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'game' && currentGame && (
        <div className={styles['game-view']}>
          <button className={styles['btn-back']} onClick={backToMenu}>
            ← Вернуться к меню
          </button>
          
          <div className={styles['game-layout']}>
            <div className={styles['board-container']}>
              <h2 className={styles['game-status']}>{gameStatus}</h2>
              
              {/* Таймер */}
              <div className={styles['timer-display']}>
                <div className={`timer ${game.turn() === 'w' && playerColor === 'white' || game.turn() === 'b' && playerColor === 'black' ? 'active' : ''}`}>
                  <span className={styles['timer-label']}>Ваше время:</span>
                  <span className={`timer-value ${displayTime < 30 ? 'warning' : ''}`}>
                    {Math.floor(displayTime / 60)}:{String(displayTime % 60).padStart(2, '0')}
                  </span>
                  {displayTime < 30 && <span className={styles['grace-period']}>⚠️ Мало времени!</span>}
                </div>
                <div className={styles.timer}>
                  <span className={styles['timer-label']}>Противник:</span>
                  <span className={styles['timer-value']}>
                    {Math.floor(opponentTimeLeft / 60)}:{String(opponentTimeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
              
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation={playerColor}
                customBoardStyle={{
                  borderRadius: '5px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                }}
              />
            </div>

            <div className={styles['game-sidebar']}>
              <div className={styles['players-info']}>
                {/* Белые */}
                <div className={styles['chess-player-card']}>
                  {getBannerImage(currentGame.white_player_banner) && (
                    <div 
                      className={styles['chess-player-banner']}
                      style={{ backgroundImage: `url(${getBannerImage(currentGame.white_player_banner)})` }}
                    />
                  )}
                  <div className={styles['chess-avatar-container']}>
                    <img 
                      src={currentGame.white_avatar ? `${BASE_URL}${currentGame.white_avatar}` : '/default-avatar.png'} 
                      alt="Белые"
                      className={styles['chess-avatar']}
                    />
                    {getFrameImage(currentGame.white_player_frame) && (
                      <img 
                        src={getFrameImage(currentGame.white_player_frame)}
                        alt="Frame"
                        className={styles['chess-avatar-frame']}
                        style={getFrameStyle(getFrameItem(currentGame.white_player_frame), 'chess')}
                      />
                    )}
                  </div>
                  <span className={`chess-player-name styled-username ${currentGame.white_username_style || 'username-none'}`}>
                    {currentGame.white_full_name || currentGame.white_username}
                  </span>
                </div>

                {/* Чёрные */}
                <div className={styles['chess-player-card']}>
                  {getBannerImage(currentGame.black_player_banner) && (
                    <div 
                      className={styles['chess-player-banner']}
                      style={{ backgroundImage: `url(${getBannerImage(currentGame.black_player_banner)})` }}
                    />
                  )}
                  <div className={styles['chess-avatar-container']}>
                    <img 
                      src={currentGame.black_avatar ? `${BASE_URL}${currentGame.black_avatar}` : '/default-avatar.png'} 
                      alt="Чёрные"
                      className={styles['chess-avatar']}
                    />
                    {getFrameImage(currentGame.black_player_frame) && (
                      <img 
                        src={getFrameImage(currentGame.black_player_frame)}
                        alt="Frame"
                        className={styles['chess-avatar-frame']}
                        style={getFrameStyle(getFrameItem(currentGame.black_player_frame), 'chess')}
                      />
                    )}
                  </div>
                  <span className={`chess-player-name styled-username ${currentGame.black_username_style || 'username-none'}`}>
                    {currentGame.black_full_name || currentGame.black_username}
                  </span>
                </div>
              </div>

              <div className={styles['move-history']}>
                <h3>История ходов</h3>
                <div className={styles['moves-list']}>
                  {moveHistory.map((move, index) => (
                    <div key={index} className={`move ${index % 2 === 0 ? 'white' : 'black'}`}>
                      <span className={styles['move-number']}>{Math.floor(index / 2) + 1}.</span>
                      <span className={styles['move-text']}>{move.san || move}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles['game-controls']}>
                <button className={styles['btn-resign']} onClick={resign}>
                  Сдаться
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineChess;
