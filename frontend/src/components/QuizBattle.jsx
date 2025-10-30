import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import './QuizBattle.css';
import { MdOutlineQuiz } from "react-icons/md";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

function QuizBattle() {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [view, setView] = useState('menu'); // menu, lobby, battle, results
  const [activeBattles, setActiveBattles] = useState([]);
  const [currentBattle, setCurrentBattle] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [timer, setTimer] = useState(30);
  const [battleTimer, setBattleTimer] = useState(600); // Общий таймер битвы (10 минут)
  const [isAnswering, setIsAnswering] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canPlay, setCanPlay] = useState(true);
  const [hoursUntilNextGame, setHoursUntilNextGame] = useState(0);
  const timerRef = useRef(null);
  const battleTimerRef = useRef(null);

  // Загрузить активные битвы при монтировании
  useEffect(() => {
    fetchActiveBattles();
    fetchCategories();
    checkCanPlay();
  }, []);

  // Автоматическое подключение к комнате при появлении currentBattle
  useEffect(() => {
    if (currentBattle && socket && socket.connected) {
      const roomName = `quiz-${currentBattle.id}`;
      socket.emit('join', roomName);
    }
  }, [currentBattle?.id, socket?.connected]);

  // Периодическое обновление битвы в лобби
  useEffect(() => {
    if (view === 'lobby' && currentBattle) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/quiz-battle/${currentBattle.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const updatedBattle = await response.json();
          setCurrentBattle(updatedBattle);
        } catch (error) {
          console.error('Failed to refresh battle:', error);
        }
      }, 2000); // Обновлять каждые 2 секунды

      return () => clearInterval(interval);
    }
  }, [view, currentBattle?.id]);

  useEffect(() => {
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      // Connected to quiz battle socket
    });

    newSocket.on('quiz:battle-created', (battle) => {
      setActiveBattles(prev => [battle, ...prev]);
    });

    newSocket.on('quiz:player-joined', ({ battleId, player, players }) => {
      if (currentBattle && currentBattle.id === battleId) {
        setCurrentBattle(prev => ({ ...prev, players }));
      }
      // Обновить список активных битв
      setActiveBattles(prev => prev.map(b => 
        b.id === battleId ? { ...b, player_count: players.length } : b
      ));
    });

    newSocket.on('quiz:battle-started', ({ battleId, questions, timeLimit }) => {
      if (currentBattle && currentBattle.id === battleId) {
        setQuestions(questions);
        setCurrentQuestionIndex(0);
        setView('battle');
        setTimer(30);
        setBattleTimer(timeLimit || 600);
        startTimer();
        startBattleTimer();
      }
    });

    newSocket.on('quiz:answer-submitted', ({ battleId, userId, username, isCorrect, pointsEarned, players }) => {
      if (currentBattle && currentBattle.id === battleId) {
        setCurrentBattle(prev => ({ ...prev, players }));
      }
    });

    newSocket.on('quiz:battle-finished', ({ battleId, players, reason }) => {
      if (currentBattle && currentBattle.id === battleId) {
        setCurrentBattle(prev => ({ ...prev, players, status: 'finished' }));
        setView('results');
        setWaitingForOthers(false);
        stopTimer();
        stopBattleTimer();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      stopTimer();
    };
  }, [currentBattle?.id]);

  const startTimer = () => {
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startBattleTimer = () => {
    battleTimerRef.current = setInterval(() => {
      setBattleTimer(prev => {
        if (prev <= 1) {
          stopBattleTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopBattleTimer = () => {
    if (battleTimerRef.current) {
      clearInterval(battleTimerRef.current);
      battleTimerRef.current = null;
    }
  };

  const handleTimeout = () => {
    if (!isAnswering && currentQuestionIndex < questions.length) {
      submitAnswer(null, 30);
    }
  };

  const fetchActiveBattles = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz-battle/active`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setActiveBattles(data);
    } catch (error) {
      console.error('Failed to fetch battles:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz-battle/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const checkCanPlay = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz-battle/can-play`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCanPlay(data.canPlay);
      setHoursUntilNextGame(data.hoursRemaining || 0);
    } catch (error) {
      console.error('Failed to check play availability:', error);
    }
  };

  const createBattle = async () => {
    if (!selectedCategory) {
      alert('Пожалуйста, выберите категорию вопросов');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/quiz-battle/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categoryId: selectedCategory })
      });
      
      if (response.status === 429) {
        const data = await response.json();
        alert(data.message || 'Вы уже играли сегодня. Попробуйте завтра!');
        setShowCreateModal(false);
        setSelectedCategory(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to create battle');
      }
      
      const battle = await response.json();
      
      setCurrentBattle(battle);
      setView('lobby');
      setShowCreateModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Failed to create battle:', error);
      alert('Не удалось создать битву. Попробуйте позже.');
    }
  };

  const joinBattle = async (roomCode) => {
    try {
      const response = await fetch(`${API_URL}/quiz-battle/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomCode })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      const battle = await response.json();
      setCurrentBattle(battle);
      setView('lobby');
    } catch (error) {
      console.error('Failed to join battle:', error);
    }
  };

  const startBattle = async () => {
    try {
      const response = await fetch(`${API_URL}/quiz-battle/${currentBattle.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to start battle:', error);
    }
  };

  const submitAnswer = async (answer, timeSpent) => {
    if (isAnswering) return;
    setIsAnswering(true);
    setSelectedAnswer(answer);

    try {
      const response = await fetch(`${API_URL}/quiz-battle/${currentBattle.id}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: questions[currentQuestionIndex].id,
          answer,
          timeSpent
        })
      });

      const result = await response.json();
      
      setAnsweredQuestions(prev => [...prev, {
        questionId: questions[currentQuestionIndex].id,
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned
      }]);

      // Показать результат на 2 секунды
      setTimeout(() => {
        setSelectedAnswer(null);
        setIsAnswering(false);
        
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setTimer(30);
        } else {
          // Последний вопрос для этого игрока - просто остановить таймер
          // Бэкенд автоматически завершит битву когда ВСЕ игроки ответят
          stopTimer();
          setWaitingForOthers(true);
          console.log('Вы ответили на все вопросы. Ожидание других игроков...');
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setIsAnswering(false);
    }
  };

  const finishBattle = async () => {
    try {
      await fetch(`${API_URL}/quiz-battle/${currentBattle.id}/finish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to finish battle:', error);
    }
  };

  const leaveBattle = () => {
    if (socket && currentBattle) {
      socket.emit('leave', `quiz-${currentBattle.id}`);
    }
    setCurrentBattle(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnsweredQuestions([]);
    setView('menu');
    stopTimer();
  };

  // MENU VIEW
  if (view === 'menu') {
    return (
      <div className="quiz-battle-container">
        <div className="quiz-battle-header">
          <h1><MdOutlineQuiz /> Битва Знаний</h1>
          <p>Сражайся с другими учениками в викторине на скорость!</p>
          {!canPlay && (
            <div className="daily-limit-warning">
              ⚠️ Вы уже играли сегодня. Следующая игра доступна через {hoursUntilNextGame} часов.
            </div>
          )}
        </div>

        <div className="quiz-battle-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-battle-btn"
            disabled={!canPlay}
            title={!canPlay ? `Доступно через ${hoursUntilNextGame} часов` : ''}
          >
            ➕ Создать Битву
          </button>
          <button 
            onClick={() => {
              const code = prompt('Введите код комнаты:');
              if (code) joinBattle(code.toUpperCase());
            }} 
            className="join-battle-btn"
          >
            🔗 Присоединиться по коду
          </button>
          <button onClick={fetchActiveBattles} className="refresh-btn">
            🔄 Обновить список
          </button>
        </div>

        <div className="active-battles">
          <h2>Активные битвы</h2>
          {activeBattles.length === 0 ? (
            <p className="no-battles">Нет активных битв. Создай свою!</p>
          ) : (
            <div className="battles-grid">
              {activeBattles.map(battle => (
                <div key={battle.id} className="battle-card">
                  <div className="battle-info">
                    <h3>Комната: {battle.room_code}</h3>
                    <p>Создатель: {battle.creator_name}</p>
                    <p>Категория: {battle.category_name || 'Все категории'}</p>
                    <p>Игроков: {battle.player_count}/8</p>
                    <span className={`status-badge ${battle.status}`}>
                      {battle.status === 'waiting' ? '⏳ Ожидание' : '🎮 Идёт игра'}
                    </span>
                  </div>
                  {battle.status === 'waiting' && (
                    <button onClick={() => joinBattle(battle.room_code)} className="join-btn">
                      Присоединиться
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Модальное окно выбора категории */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Выберите категорию вопросов</h2>
              <div className="categories-list">
                {categories.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`category-option ${selectedCategory === cat.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <h3>{cat.name}</h3>
                    <p>{cat.description}</p>
                    <span className="question-count">{cat.question_count} вопросов</span>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowCreateModal(false)} className="cancel-btn">
                  Отмена
                </button>
                <button 
                  onClick={createBattle} 
                  className="confirm-btn"
                  disabled={!selectedCategory}
                >
                  Создать битву
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LOBBY VIEW
  if (view === 'lobby') {
    const isCreator = currentBattle.creator_id === user?.id;
    const playerCount = currentBattle.players?.length || 0;

    return (
      <div className="quiz-battle-container">
        <div className="lobby-header">
          <h1>🎮 Лобби</h1>
          <div className="room-code-display">
            <span>Код комнаты:</span>
            <strong>{currentBattle.room_code}</strong>
          </div>
          {currentBattle.category_name && (
            <div className="category-display">
              <span>Категория:</span>
              <strong>{currentBattle.category_name}</strong>
            </div>
          )}
          <button onClick={leaveBattle} className="leave-btn">❌ Выйти</button>
        </div>

        <div className="lobby-content">
          <div className="players-list">
            <h2>Игроки ({playerCount}/8)</h2>
            <div className="players-grid">
              {currentBattle.players?.map((player, idx) => (
                <div key={player.user_id} className="player-card">
                  <div className="player-avatar">
                    {player.avatar_url ? (
                      <img src={`http://localhost:5000${player.avatar_url}`} alt="" />
                    ) : (
                      <div className="avatar-placeholder">👤</div>
                    )}
                  </div>
                  <div className="player-info">
                    <span className="player-name">
                      {player.username}
                      {player.user_id === currentBattle.creator_id && ' 👑'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lobby-instructions">
            {isCreator ? (
              <>
                <h3>Вы создатель!</h3>
                <p>Дождитесь минимум 2 игроков и нажмите кнопку старта</p>
                <button 
                  onClick={startBattle} 
                  disabled={playerCount < 2}
                  className="start-battle-btn"
                >
                  🚀 Начать Битву
                </button>
              </>
            ) : (
              <>
                <h3>Ожидание начала...</h3>
                <p>Создатель {currentBattle.players?.find(p => p.user_id === currentBattle.creator_id)?.username} скоро начнёт игру!</p>
                <div className="waiting-animation">⏳</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // BATTLE VIEW
  if (view === 'battle') {
    const currentQuestion = questions[currentQuestionIndex];
    const timeSpent = 30 - timer;
    const answeredQuestion = answeredQuestions.find(q => q.questionId === currentQuestion?.id);
    
    // Форматируем время битвы (MM:SS)
    const battleMinutes = Math.floor(battleTimer / 60);
    const battleSeconds = battleTimer % 60;
    const battleTimeDisplay = `${battleMinutes}:${battleSeconds.toString().padStart(2, '0')}`;

    return (
      <div className="quiz-battle-container">
        <div className="battle-header">
          <div className="battle-timer-display">
            <span className={`battle-timer ${battleTimer <= 60 ? 'urgent' : ''}`}>
              ⏰ Осталось: {battleTimeDisplay}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
            <span className="progress-text">Вопрос {currentQuestionIndex + 1}/{questions.length}</span>
          </div>
          <div className="timer-display">
            <div className={`timer ${timer <= 10 ? 'urgent' : ''}`}>
              ⏱️ {timer}с
            </div>
          </div>
        </div>

        <div className="scoreboard">
          {currentBattle.players?.sort((a, b) => b.score - a.score).map((player, idx) => (
            <div key={player.user_id} className={`score-item ${player.user_id === user?.id ? 'me' : ''}`}>
              <span className="rank">#{idx + 1}</span>
              <span className="player-name">{player.username}</span>
              <span className="score">{player.score} 🏆</span>
            </div>
          ))}
        </div>

        <div className="question-container">
          <h2 className="question-text">{currentQuestion?.question}</h2>
          
          {waitingForOthers ? (
            <div className="waiting-message">
              <div className="spinner"></div>
              <h3>Вы ответили на все вопросы!</h3>
              <p>Ожидание других игроков...</p>
            </div>
          ) : (
            <>
              <div className="answers-grid">
                {['a', 'b', 'c', 'd'].map(option => {
                  const optionText = currentQuestion?.[`option_${option}`];
                  const isSelected = selectedAnswer === option;
                  const isCorrect = currentQuestion?.correct_option === option;
                  
                  let className = 'answer-btn';
                  if (isAnswering) {
                    if (isSelected && isCorrect) className += ' correct';
                    else if (isSelected && !isCorrect) className += ' wrong';
                    else if (isCorrect) className += ' correct';
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => !isAnswering && submitAnswer(option, timeSpent)}
                      disabled={isAnswering}
                      className={className}
                    >
                      <span className="option-letter">{option.toUpperCase()}</span>
                      <span className="option-text">{optionText}</span>
                    </button>
                  );
                })}
              </div>

              {answeredQuestion && (
                <div className={`answer-feedback ${answeredQuestion.isCorrect ? 'correct' : 'wrong'}`}>
                  {answeredQuestion.isCorrect ? (
                    <>✅ Правильно! +{answeredQuestion.pointsEarned} очков</>
                  ) : (
                    <>❌ Неправильно!</>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // RESULTS VIEW
  if (view === 'results') {
    const sortedPlayers = currentBattle.players?.sort((a, b) => b.score - a.score) || [];

    return (
      <div className="quiz-battle-container">
        <div className="results-header">
          <h1>🏆 Результаты Битвы</h1>
        </div>

        <div className="podium">
          {sortedPlayers.slice(0, 3).map((player, idx) => {
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={player.user_id} className={`podium-place place-${idx + 1}`}>
                <div className="medal">{medals[idx]}</div>
                <div className="player-avatar">
                  {player.avatar_url ? (
                    <img src={`http://localhost:5000${player.avatar_url}`} alt="" />
                  ) : (
                    <div className="avatar-placeholder">👤</div>
                  )}
                </div>
                <div className="player-name">{player.username}</div>
                <div className="player-score">{player.score} очков</div>
              </div>
            );
          })}
        </div>

        <div className="full-results">
          <h2>Полная таблица</h2>
          <div className="results-table">
            {sortedPlayers.map((player, idx) => (
              <div key={player.user_id} className={`result-row ${player.user_id === user?.id ? 'me' : ''}`}>
                <span className="position">#{idx + 1}</span>
                <span className="name">{player.username}</span>
                <span className="score">{player.score} 🏆</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={leaveBattle} className="back-menu-btn">
          🏠 Вернуться в меню
        </button>
      </div>
    );
  }

  return null;
}

export default QuizBattle;
