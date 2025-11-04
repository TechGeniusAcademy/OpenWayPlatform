import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import styles from './QuizBattle.module.css';
import { 
  FiAward, FiUsers, FiClock, FiRefreshCw, FiPlus, 
  FiLink, FiX, FiCheck, FiAlertCircle, FiTrendingUp,
  FiTarget, FiZap, FiUser
} from 'react-icons/fi';
import { BASE_URL } from '../utils/api';

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
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderIcon}>
            <FiAward size={32} />
          </div>
          <div className={styles.pageHeaderContent}>
            <h1 className={styles.pageTitle}>Битва Знаний</h1>
            <p className={styles.pageDescription}>Сражайся с другими учениками в викторине на скорость!</p>
          </div>
        </div>

        {!canPlay && (
          <div className={styles.alert}>
            <FiAlertCircle size={20} />
            <span>Вы уже играли сегодня. Следующая игра доступна через {hoursUntilNextGame} часов.</span>
          </div>
        )}

        <div className={styles.actions}>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className={styles.btnCreate}
            disabled={!canPlay}
            title={!canPlay ? `Доступно через ${hoursUntilNextGame} часов` : ''}
          >
            <FiPlus size={20} />
            Создать Битву
          </button>
          <button 
            onClick={() => {
              const code = prompt('Введите код комнаты:');
              if (code) joinBattle(code.toUpperCase());
            }} 
            className={styles.btnJoin}
          >
            <FiLink size={20} />
            Присоединиться по коду
          </button>
          <button onClick={fetchActiveBattles} className={styles.btnRefresh}>
            <FiRefreshCw size={20} />
            Обновить список
          </button>
        </div>

        <div className={styles.battlesSection}>
          <h2 className={styles.sectionTitle}>Активные битвы</h2>
          {activeBattles.length === 0 ? (
            <p className={styles.emptyMessage}>Нет активных битв. Создай свою!</p>
          ) : (
            <div className={styles.battlesGrid}>
              {activeBattles.map(battle => (
                <div key={battle.id} className={styles.battleCard}>
                  <div className={styles.battleInfo}>
                    <h3 className={styles.battleRoom}>Комната: {battle.room_code}</h3>
                    <p className={styles.battleCreator}>Создатель: {battle.creator_name}</p>
                    <p className={styles.battleCategory}>Категория: {battle.category_name || 'Все категории'}</p>
                    <p className={styles.battlePlayers}>
                      <FiUsers size={16} />
                      {battle.player_count}/8
                    </p>
                    <span className={`${styles.statusBadge} ${styles[battle.status]}`}>
                      {battle.status === 'waiting' ? (
                        <><FiClock size={14} /> Ожидание</>
                      ) : (
                        <><FiZap size={14} /> Идёт игра</>
                      )}
                    </span>
                  </div>
                  {battle.status === 'waiting' && (
                    <button onClick={() => joinBattle(battle.room_code)} className={styles.btnJoinBattle}>
                      Присоединиться
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Выберите категорию вопросов</h2>
                <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
                  <FiX size={20} />
                </button>
              </div>
              <div className={styles.categoriesList}>
                {categories.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`${styles.categoryOption} ${selectedCategory === cat.id ? styles.selected : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <h3 className={styles.categoryName}>{cat.name}</h3>
                    <p className={styles.categoryDescription}>{cat.description}</p>
                    <span className={styles.questionCount}>{cat.question_count} вопросов</span>
                  </div>
                ))}
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowCreateModal(false)} className={styles.btnCancel}>
                  Отмена
                </button>
                <button 
                  onClick={createBattle} 
                  className={styles.btnConfirm}
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
      <div className={styles.container}>
        <div className={styles.lobbyHeader}>
          <div className={styles.lobbyTitle}>
            <FiUsers size={28} />
            <h1>Лобби</h1>
          </div>
          <div className={styles.lobbyInfo}>
            <div className={styles.roomCode}>
              <span>Код комнаты:</span>
              <strong>{currentBattle.room_code}</strong>
            </div>
            {currentBattle.category_name && (
              <div className={styles.categoryBadge}>
                <FiTarget size={16} />
                <span>{currentBattle.category_name}</span>
              </div>
            )}
          </div>
          <button onClick={leaveBattle} className={styles.btnLeave}>
            <FiX size={20} />
            Выйти
          </button>
        </div>

        <div className={styles.lobbyContent}>
          <div className={styles.playersSection}>
            <h2 className={styles.sectionTitle}>
              <FiUsers size={20} />
              Игроки ({playerCount}/8)
            </h2>
            <div className={styles.playersGrid}>
              {currentBattle.players?.map((player, idx) => (
                <div key={player.user_id} className={styles.playerCard}>
                  <div className={styles.playerAvatar}>
                    {player.avatar_url ? (
                      <img src={`${BASE_URL}${player.avatar_url}`} alt="" />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <FiUser size={32} />
                      </div>
                    )}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {player.username}
                      {player.user_id === currentBattle.creator_id && (
                        <FiAward className={styles.crownIcon} size={16} />
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.lobbyInstructions}>
            {isCreator ? (
              <>
                <h3 className={styles.instructionTitle}>Вы создатель!</h3>
                <p className={styles.instructionText}>Дождитесь минимум 2 игроков и нажмите кнопку старта</p>
                <button 
                  onClick={startBattle} 
                  disabled={playerCount < 2}
                  className={styles.btnStartBattle}
                >
                  <FiZap size={20} />
                  Начать Битву
                </button>
              </>
            ) : (
              <>
                <h3 className={styles.instructionTitle}>Ожидание начала...</h3>
                <p className={styles.instructionText}>
                  Создатель {currentBattle.players?.find(p => p.user_id === currentBattle.creator_id)?.username} скоро начнёт игру!
                </p>
                <div className={styles.waitingAnimation}>
                  <FiClock size={48} />
                </div>
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
      <div className={styles.container}>
        <div className={styles.battleHeader}>
          <div className={styles.battleTimerDisplay}>
            <span className={`${styles.battleTimer} ${battleTimer <= 60 ? styles.urgent : ''}`}>
              <FiClock size={20} />
              {battleTimeDisplay}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
            <span className={styles.progressText}>Вопрос {currentQuestionIndex + 1}/{questions.length}</span>
          </div>
          <div className={styles.timerDisplay}>
            <div className={`${styles.timer} ${timer <= 10 ? styles.urgent : ''}`}>
              <FiTarget size={20} />
              {timer}с
            </div>
          </div>
        </div>

        <div className={styles.scoreboard}>
          {currentBattle.players?.sort((a, b) => b.score - a.score).map((player, idx) => (
            <div key={player.user_id} className={`${styles.scoreItem} ${player.user_id === user?.id ? styles.me : ''}`}>
              <span className={styles.rank}>#{idx + 1}</span>
              <span className={styles.playerName}>{player.username}</span>
              <span className={styles.score}>
                <FiTrendingUp size={16} />
                {player.score}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.questionContainer}>
          <h2 className={styles.questionText}>{currentQuestion?.question}</h2>
          
          {waitingForOthers ? (
            <div className={styles.waitingMessage}>
              <div className={styles.spinner}></div>
              <h3 className={styles.waitingTitle}>Вы ответили на все вопросы!</h3>
              <p className={styles.waitingText}>Ожидание других игроков...</p>
            </div>
          ) : (
            <>
              <div className={styles.answersGrid}>
                {['a', 'b', 'c', 'd'].map(option => {
                  const optionText = currentQuestion?.[`option_${option}`];
                  const isSelected = selectedAnswer === option;
                  const isCorrect = currentQuestion?.correct_option === option;
                  
                  let btnClass = styles.answerBtn;
                  if (isAnswering) {
                    if (isSelected && isCorrect) btnClass += ` ${styles.correct}`;
                    else if (isSelected && !isCorrect) btnClass += ` ${styles.wrong}`;
                    else if (isCorrect) btnClass += ` ${styles.correct}`;
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => !isAnswering && submitAnswer(option, timeSpent)}
                      disabled={isAnswering}
                      className={btnClass}
                    >
                      <span className={styles.optionLetter}>{option.toUpperCase()}</span>
                      <span className={styles.optionText}>{optionText}</span>
                    </button>
                  );
                })}
              </div>

              {answeredQuestion && (
                <div className={`${styles.answerFeedback} ${answeredQuestion.isCorrect ? styles.correctFeedback : styles.wrongFeedback}`}>
                  {answeredQuestion.isCorrect ? (
                    <>
                      <FiCheck size={20} />
                      Правильно! +{answeredQuestion.pointsEarned} очков
                    </>
                  ) : (
                    <>
                      <FiX size={20} />
                      Неправильно!
                    </>
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
    const medalIcons = [
      <FiAward size={48} className={styles.goldMedal} />,
      <FiAward size={44} className={styles.silverMedal} />,
      <FiAward size={40} className={styles.bronzeMedal} />
    ];

    return (
      <div className={styles.container}>
        <div className={styles.resultsHeader}>
          <FiAward size={32} />
          <h1 className={styles.resultsTitle}>Результаты Битвы</h1>
        </div>

        <div className={styles.podium}>
          {sortedPlayers.slice(0, 3).map((player, idx) => (
            <div key={player.user_id} className={`${styles.podiumPlace} ${styles[`place${idx + 1}`]}`}>
              <div className={styles.medal}>{medalIcons[idx]}</div>
              <div className={styles.playerAvatar}>
                {player.avatar_url ? (
                  <img src={`${BASE_URL}${player.avatar_url}`} alt="" />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <FiUser size={32} />
                  </div>
                )}
              </div>
              <div className={styles.playerName}>{player.username}</div>
              <div className={styles.playerScore}>{player.score} очков</div>
            </div>
          ))}
        </div>

        <div className={styles.fullResults}>
          <h2 className={styles.sectionTitle}>Полная таблица</h2>
          <div className={styles.resultsTable}>
            {sortedPlayers.map((player, idx) => (
              <div key={player.user_id} className={`${styles.resultRow} ${player.user_id === user?.id ? styles.meRow : ''}`}>
                <span className={styles.position}>#{idx + 1}</span>
                <span className={styles.playerNameText}>{player.username}</span>
                <span className={styles.scoreText}>
                  <FiTrendingUp size={16} />
                  {player.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={leaveBattle} className={styles.btnBackMenu}>
          <FiAward size={20} />
          Вернуться в меню
        </button>
      </div>
    );
  }

  return null;
}

export default QuizBattle;
