import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import GameCards from './GameCards';
import GameQuestions from './GameQuestions';
import './GameManagement.css';

function GameManagement() {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions', 'cards', 'questions'
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [drawnCard, setDrawnCard] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showCardAnimation, setShowCardAnimation] = useState(false);
  const [allCards, setAllCards] = useState([]);
  const [scrollingCards, setScrollingCards] = useState([]);
  const [extraQuestionsCount, setExtraQuestionsCount] = useState(0); // Счетчик дополнительных вопросов
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info' }); // Модальное уведомление

  useEffect(() => {
    fetchSessions();
    fetchGroups();
    fetchAllCards();
  }, []);

  const fetchAllCards = async () => {
    try {
      const response = await api.get('/game/cards');
      setAllCards(response.data.cards || []);
    } catch (error) {
      console.error('Ошибка загрузки карточек:', error);
    }
  };

  const showNotification = (title, message, type = 'info') => {
    setNotification({ show: true, title, message, type });
  };

  const closeNotification = () => {
    setNotification({ show: false, title: '', message: '', type: 'info' });
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/game/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Ошибка загрузки сессий:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    }
  };

  const openCreateModal = async (group) => {
    setSelectedGroup(group);
    
    // Загружаем студентов группы
    try {
      const response = await api.get(`/groups/${group.id}`);
      console.log('Ответ API группы:', response.data);
      setGroupStudents(response.data.group.students || []);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
    }
  };

  const createSession = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await api.post('/game/sessions', {
        groupId: selectedGroup.id,
        totalRounds: 10
      });
      
      const session = response.data.session;
      setCurrentSession(session);
      setShowCreateModal(false);
      setShowPlayersModal(true);
      fetchSessions();
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
    }
  };

  const togglePlayerSelection = (userId) => {
    setSelectedPlayers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const assignTeams = async () => {
    if (selectedPlayers.length < 2) {
      showNotification('⚠️ Ошибка', 'Выберите минимум 2 игрока!', 'warning');
      return;
    }

    try {
      await api.post(`/game/sessions/${currentSession.id}/assign-teams`, {
        userIds: selectedPlayers
      });
      
      showNotification('✅ Успешно', 'Команды сформированы!', 'success');
      setShowPlayersModal(false);
      fetchSessionDetails(currentSession.id);
    } catch (error) {
      console.error('Ошибка распределения команд:', error);
      showNotification('❌ Ошибка', 'Не удалось сформировать команды', 'error');
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const response = await api.get(`/game/sessions/${sessionId}`);
      setCurrentSession(response.data.session);
    } catch (error) {
      console.error('Ошибка загрузки сессии:', error);
    }
  };

  const startGame = async (sessionId) => {
    try {
      await api.post(`/game/sessions/${sessionId}/start`);
      fetchSessionDetails(sessionId);
      openGameControl(sessionId);
    } catch (error) {
      console.error('Ошибка старта игры:', error);
    }
  };

  const openGameControl = async (sessionId) => {
    await fetchSessionDetails(sessionId);
    setShowGameModal(true);
    checkCurrentRound(sessionId);
  };

  const checkCurrentRound = async (sessionId) => {
    try {
      const response = await api.get(`/game/sessions/${sessionId}/current-round`);
      setCurrentRound(response.data.round);
    } catch (error) {
      console.error('Ошибка получения раунда:', error);
    }
  };

  const drawCard = async () => {
    if (!currentSession) return;
    
    try {
      const response = await api.get(`/game/sessions/${currentSession.id}/draw-card`);
      const { card, question } = response.data;
      
      // Проверка наличия вопроса
      if (!question) {
        showNotification('⚠️ Нет вопросов', 'В базе данных нет доступных вопросов. Пожалуйста, добавьте вопросы в разделе "Вопросы".', 'warning');
        return;
      }
      
      setShowCardAnimation(true);
      
      // Создаем массив карточек для вертикальной прокрутки (слот-машина стиль)
      // Повторяем карточки 3 раза + добавляем выбранную в конец
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      const reelCards = [...shuffled, ...shuffled, ...shuffled, card];
      
      setScrollingCards(reelCards);
      
      // Запускаем анимацию с CSS
      setTimeout(() => {
        const container = document.querySelector('.slot-reel');
        if (container) {
          // Вычисляем финальную позицию (последняя карточка)
          const cardHeight = 380; // высота карточки + gap
          const finalPosition = -(reelCards.length - 1) * cardHeight;
          
          container.style.setProperty('--final-position', `${finalPosition}px`);
          container.classList.add('spinning');
          
          // После завершения анимации показываем результат
          setTimeout(() => {
            setDrawnCard(card);
            setCurrentQuestion(question);
            setShowCardAnimation(false);
            setScrollingCards([]);
            
            // Создаем новый раунд
            createRound(card, question);
          }, 4000); // 4 секунды на анимацию
        }
      }, 100);
      
    } catch (error) {
      console.error('Ошибка вытягивания карточки:', error);
      setShowCardAnimation(false);
      setScrollingCards([]);
      showNotification('❌ Ошибка', 'Не удалось вытянуть карточку', 'error');
    }
  };

  const createRound = async (card, question) => {
    try {
      // Проверка наличия вопроса
      if (!question) {
        showNotification('⚠️ Ошибка', 'Не удалось загрузить вопрос. Проверьте, что в базе данных есть вопросы.', 'error');
        return;
      }

      // roundNumber будет вычислен автоматически на бэкенде
      const response = await api.post(`/game/sessions/${currentSession.id}/rounds`, {
        team: currentSession.current_team,
        cardId: card.id,
        questionId: question.id,
        question: question.question,
        timeLimit: card.card_type === 'time_bonus' ? 90 : 
                   card.card_type === 'minus_time' ? 45 : 60
      });
      
      setCurrentRound(response.data.round);
    } catch (error) {
      console.error('Ошибка создания раунда:', error);
      showNotification('❌ Ошибка', 'Не удалось создать раунд', 'error');
    }
  };

  const answerCorrect = async () => {
    if (!currentRound) return;
    
    let points = 10;
    let notificationMessage = '';
    
    // Применяем эффект карточки
    if (drawnCard?.card_type === 'double_points') {
      points = 20;
      notificationMessage = '🎉 Двойные очки! +20 баллов';
    } else if (drawnCard?.card_type === 'steal_points') {
      points = 10;
      notificationMessage = '🔥 Кража очков! +10 баллов вам, -5 противнику';
      // Отнимаем у другой команды
      const otherTeam = currentSession.current_team === 'team_a' ? 'team_b' : 'team_a';
      await api.post(`/game/sessions/${currentSession.id}/rounds`, {
        team: otherTeam,
        points: -5
      });
    } else if (drawnCard?.card_type === 'time_bonus') {
      points = 10;
      notificationMessage = '⏰ Бонус времени! +10 баллов и +30 секунд на следующий вопрос';
    } else if (drawnCard?.card_type === 'minus_time') {
      points = 10;
      notificationMessage = '⏱️ Правильно! +10 баллов, но -15 секунд на следующий вопрос';
    } else if (drawnCard?.card_type === 'skip_turn') {
      points = 0;
      notificationMessage = '⏭️ Пропуск хода! Ход пропущен, баллов нет';
    } else if (drawnCard?.card_type === 'transfer_question') {
      points = 10;
      notificationMessage = '🔄 Правильно! +10 баллов (вопрос не был передан)';
    } else if (drawnCard?.card_type === 'extra_questions') {
      points = 10;
      notificationMessage = '✅ Правильный ответ! +10 баллов';
    } else {
      notificationMessage = '✅ Правильный ответ! +10 баллов';
    }
    
    if (notificationMessage) {
      showNotification('✅ Правильно!', notificationMessage, 'success');
    }
    
    try {
      await api.post(`/game/rounds/${currentRound.id}/answer-correct`, {
        answer: 'Правильный ответ (проверено админом)',
        points
      });
      
      await handleNextRound();
    } catch (error) {
      console.error('Ошибка ответа:', error);
      showNotification('❌ Ошибка', 'Не удалось сохранить ответ', 'error');
    }
  };

  const answerWrong = async () => {
    if (!currentRound) return;
    
    showNotification('❌ Неправильно', 'Ответ неверный! -5 баллов', 'error');
    
    try {
      await api.post(`/game/rounds/${currentRound.id}/answer-wrong`, {
        answer: 'Неправильный ответ',
        points: -5
      });
      
      await handleNextRound();
    } catch (error) {
      console.error('Ошибка ответа:', error);
      showNotification('❌ Ошибка', 'Не удалось сохранить ответ', 'error');
    }
  };

  const handleNextRound = async () => {
    // Проверяем специальные карточки
    if (drawnCard?.card_type === 'extra_questions' && extraQuestionsCount === 0) {
      // Активируем режим дополнительных вопросов
      setExtraQuestionsCount(3);
      showNotification('� Дополнительные вопросы!', 'Команде выпало 3 дополнительных вопроса подряд!', 'success');
    }
    
    setDrawnCard(null);
    setCurrentQuestion(null);
    setCurrentRound(null);
    
    // Если есть дополнительные вопросы, уменьшаем счетчик и НЕ переключаем команду
    if (extraQuestionsCount > 0) {
      setExtraQuestionsCount(extraQuestionsCount - 1);
      // Обновляем данные сессии без переключения хода
      await fetchSessionDetails(currentSession.id);
      
      if (extraQuestionsCount === 1) {
        showNotification('✅ Бонус закончен', 'Дополнительные вопросы закончились. Ход переходит к другой команде.', 'info');
        // Теперь переключаем ход
        await api.post(`/game/sessions/${currentSession.id}/next-turn`);
        await fetchSessionDetails(currentSession.id);
      }
    } else {
      // Обычное переключение хода
      await api.post(`/game/sessions/${currentSession.id}/next-turn`);
      await fetchSessionDetails(currentSession.id);
    }
    
    // Игра продолжается до ручного завершения
    // Автоматическое завершение убрано
  };

  const finishGame = async () => {
    if (!confirm('Завершить игру?')) return;
    
    try {
      const response = await api.post(`/game/sessions/${currentSession.id}/finish`);
      
      const winnerText = response.data.winner === 'team_a' ? 'А Команда' : 
                        response.data.winner === 'team_b' ? 'Б Команда' : 
                        '🤝 Ничья';
      
      showNotification('🏆 Игра завершена!', `Победитель: ${winnerText}`, 'success');
      
      setTimeout(() => {
        setShowGameModal(false);
        setCurrentSession(null);
        fetchSessions();
      }, 2000);
    } catch (error) {
      console.error('Ошибка завершения игры:', error);
      showNotification('❌ Ошибка', 'Не удалось завершить игру', 'error');
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Удалить эту игру?')) return;
    
    try {
      await api.delete(`/game/sessions/${id}`);
      fetchSessions();
    } catch (error) {
      console.error('Ошибка удаления сессии:', error);
    }
  };

  return (
    <div className="game-management">
      <div className="tabs">
        <button 
          className={activeTab === 'sessions' ? 'active' : ''} 
          onClick={() => setActiveTab('sessions')}
        >
             Игры
        </button>
        <button 
          className={activeTab === 'cards' ? 'active' : ''} 
          onClick={() => setActiveTab('cards')}
        >
           Карточки
        </button>
        <button 
          className={activeTab === 'questions' ? 'active' : ''} 
          onClick={() => setActiveTab('questions')}
        >
          ❓ Вопросы
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className="sessions-tab">
          <h2>   Игровые сессии</h2>

          <h3 style={{ marginTop: '30px', marginBottom: '20px', color: '#2c3e50', fontSize: '24px' }}>
            Выберите группу для создания игры:
          </h3>
          <div className="groups-grid">
            {groups.map(group => (
              <div key={group.id} className="group-card">
                <h4>{group.name}</h4>
                <p>👥 Студентов: {group.member_count || 0}</p>
                <button 
                  className="btn-primary" 
                  onClick={() => openCreateModal(group)}
                >
                  Создать игру
                </button>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '40px', marginBottom: '20px', color: '#2c3e50', fontSize: '24px' }}>
            Активные и завершенные игры:
          </h3>
          <div className="sessions-list">
            <table>
              <thead>
                <tr>
                  <th>Группа</th>
                  <th>Статус</th>
                  <th>Счет</th>
                  <th>Игроков</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>{session.group_name}</td>
                    <td>
                      <span className={`status-badge ${session.status}`}>
                        {session.status === 'preparing' ? 'Подготовка' :
                         session.status === 'in_progress' ? 'В процессе' : 'Завершена'}
                      </span>
                    </td>
                    <td>
                      <span className="score">
                        А {session.team_a_score} : {session.team_b_score} Б
                      </span>
                    </td>
                    <td>{session.player_count}</td>
                    <td className="actions">
                      {session.status === 'preparing' && (
                        <button 
                          onClick={() => startGame(session.id)}
                          className="btn-success"
                        >
                          ▶️ Старт
                        </button>
                      )}
                      {session.status === 'in_progress' && (
                        <button 
                          onClick={() => openGameControl(session.id)}
                          className="btn-primary"
                        >
                             Управление
                        </button>
                      )}
                      <button 
                        onClick={() => deleteSession(session.id)}
                        className="btn-delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cards' && <GameCards />}
      {activeTab === 'questions' && <GameQuestions />}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Создать игру для группы: {selectedGroup?.name}</h3>
            <p>Студентов в группе: {groupStudents.length}</p>
            
            <div className="form-actions">
              <button onClick={() => setShowCreateModal(false)}>Отмена</button>
              <button className="btn-primary" onClick={createSession}>
                Создать игру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Players Selection Modal */}
      {showPlayersModal && (
        <div className="modal-overlay" onClick={() => setShowPlayersModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Выберите игроков</h3>
            <p>Выбрано: {selectedPlayers.length} игроков</p>
            
            <div className="players-list">
              {groupStudents.map(student => (
                <div 
                  key={student.id} 
                  className={`player-item ${selectedPlayers.includes(student.id) ? 'selected' : ''}`}
                  onClick={() => togglePlayerSelection(student.id)}
                >
                  <span>{student.full_name || student.username}</span>
                  {selectedPlayers.includes(student.id) && <span className="checkmark">✓</span>}
                </div>
              ))}
            </div>
            
            <div className="form-actions">
              <button onClick={() => setShowPlayersModal(false)}>Отмена</button>
              <button 
                className="btn-primary" 
                onClick={assignTeams}
                disabled={selectedPlayers.length < 2}
              >
                Разделить на команды ({selectedPlayers.length} игроков)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Control Modal */}
      {showGameModal && currentSession && (
        <div className="modal-overlay game-control-modal">
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGameModal(false)}>✕</button>
            
            <div className="game-header">
              <h2>   Игра: {currentSession.group_name}</h2>
              <div className="game-info">
                <span className="score-display">
                  А Команда: {currentSession.team_a_score} | Команда: {currentSession.team_b_score} Б
                </span>
              </div>
            </div>

            <div className="current-team-display">
              <h3>
                Ход: {currentSession.current_team === 'team_a' ? 'А Команда' : 'Б Команда'}
                {extraQuestionsCount > 0 && (
                  <span className="extra-questions-badge">
                    🎁 Дополнительные вопросы: {extraQuestionsCount}
                  </span>
                )}
              </h3>
            </div>

            {showCardAnimation && scrollingCards.length > 0 && (
              <div className="slot-machine-overlay">
                <div className="slot-machine-container">
                  <div className="slot-window">
                    <div className="slot-reel">
                      {scrollingCards.map((card, index) => (
                        <div 
                          key={`${card.id}-${index}`} 
                          className="slot-card"
                        >
                          <div className="card-inner">
                            {card.image_url ? (
                              <img src={`${BASE_URL}${card.image_url}`} alt={card.name} />
                            ) : (
                              <div className="card-placeholder">🎴</div>
                            )}
                            <div className="card-name">{card.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="slot-indicator-line"></div>
                  <p className="slot-text">КРУТИМ</p>
                </div>
              </div>
            )}

            {!currentRound && !drawnCard && !showCardAnimation && (
              <div className="round-actions">
                <button className="btn-large btn-primary" onClick={drawCard}>
                   Вытянуть карточку
                </button>
              </div>
            )}

            {drawnCard && (
              <div className="drawn-card-display">
                <div className={`card-large ${drawnCard.team}`}>
                  {drawnCard.image_url ? (
                    <img src={`${BASE_URL}${drawnCard.image_url}`} alt={drawnCard.name} />
                  ) : (
                    <div className="card-placeholder">🎴</div>
                  )}
                  <h3>{drawnCard.name}</h3>
                  <p>{drawnCard.description}</p>
                  <div className="card-effect">
                    Эффект: {drawnCard.effect_value > 0 ? '+' : ''}{drawnCard.effect_value}
                  </div>
                </div>
              </div>
            )}

            {currentQuestion && (
              <div className="question-display">
                <h3>❓ Вопрос:</h3>
                <p className="question-text">{currentQuestion.question}</p>
                
                <div className="answer-controls">
                  <button className="btn-success" onClick={answerCorrect}>
                    ✅ Правильный ответ
                  </button>
                  <button className="btn-danger" onClick={answerWrong}>
                    ❌ Неправильный ответ
                  </button>
                </div>
              </div>
            )}

            <div className="game-controls">
              <button className="btn-danger" onClick={finishGame}>
                 Завершить игру
              </button>
            </div>

            {/* Teams Display */}
            <div className="teams-display">
              <div className="team team-a">
                <h4>А Команда</h4>
                <ul>
                  {currentSession.participants
                    ?.filter(p => p.team === 'team_a')
                    .map(p => (
                      <li key={p.id}>
                        {p.full_name || p.username}
                      </li>
                    ))}
                </ul>
              </div>
              
              <div className="team team-b">
                <h4>Б Команда</h4>
                <ul>
                  {currentSession.participants
                    ?.filter(p => p.team === 'team_b')
                    .map(p => (
                      <li key={p.id}>
                        {p.full_name || p.username}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification.show && (
        <div className="notification-overlay" onClick={closeNotification}>
          <div className={`notification-modal ${notification.type}`} onClick={(e) => e.stopPropagation()}>
            <button className="notification-close" onClick={closeNotification}>✕</button>
            <div className="notification-header">
              <h3>{notification.title}</h3>
            </div>
            <div className="notification-body">
              <p>{notification.message}</p>
            </div>
            <div className="notification-footer">
              <button className="btn-primary" onClick={closeNotification}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameManagement;
